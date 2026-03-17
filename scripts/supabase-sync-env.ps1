param(
    [string]$OutputPath = '.env.local'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$targetPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath
} else {
    Join-Path $repoRoot $OutputPath
}
$backupPath = $null
$targetFullPath = [System.IO.Path]::GetFullPath($targetPath)
$defaultEnvPath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot '.env.local'))

Push-Location $repoRoot

try {
    if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
        throw 'Supabase CLI was not found on PATH. Install it first, then re-run this script.'
    }

    if ($targetFullPath -eq $defaultEnvPath -and (Test-Path $targetPath)) {
        $backupPath = Join-Path ([System.IO.Path]::GetDirectoryName($targetFullPath)) ('.env.local.bak-{0}' -f ([guid]::NewGuid().ToString('N')))
        Move-Item -Path $targetPath -Destination $backupPath
    }

    # Supabase may report excluded optional services on stderr even when status succeeds.
    # Use cmd.exe for this one call so we can parse the combined output without PowerShell
    # converting stderr text into a terminating NativeCommandError.
    $output = & cmd.exe /c 'supabase status -o env 2>&1'

    if ($LASTEXITCODE -ne 0) {
        throw (("supabase status -o env failed.`n{0}" -f ($output -join [Environment]::NewLine)))
    }

    $pairs = @{}

    foreach ($line in $output) {
        if ($line -match '^\s*([A-Z0-9_]+)=(.*)\s*$') {
            $value = $Matches[2].Trim()

            if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }

            $pairs[$Matches[1]] = $value
        }
    }

    foreach ($requiredKey in @('API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY')) {
        if (-not $pairs.ContainsKey($requiredKey)) {
            throw ("Expected {0} in 'supabase status -o env' output." -f $requiredKey)
        }
    }

    $content = @(
        '# Generated from supabase status -o env.',
        '# Re-run this script on each machine after starting the local Supabase stack.',
        ("NEXT_PUBLIC_SUPABASE_URL={0}" -f $pairs['API_URL']),
        ("NEXT_PUBLIC_SUPABASE_ANON_KEY={0}" -f $pairs['ANON_KEY']),
        ("SUPABASE_SERVICE_ROLE_KEY={0}" -f $pairs['SERVICE_ROLE_KEY'])
    )

    $newline = [Environment]::NewLine
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($targetPath, (($content -join $newline) + $newline), $utf8NoBom)

    if ($backupPath -and (Test-Path $backupPath)) {
        Remove-Item -Path $backupPath -Force
        $backupPath = $null
    }

    Write-Host ("Wrote {0}" -f $targetPath)
}
finally {
    if ($backupPath -and (Test-Path $backupPath) -and -not (Test-Path $targetPath)) {
        Move-Item -Path $backupPath -Destination $targetPath
    }

    Pop-Location
}