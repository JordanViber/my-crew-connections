param(
    [switch]$IncludeOptionalServices
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

try {
    if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
        throw 'Supabase CLI was not found on PATH. Install it first, then re-run this script.'
    }

    $arguments = @('start')

    if (-not $IncludeOptionalServices) {
        $arguments += '-x'
        $arguments += 'vector,logflare'
    }

    Write-Host ("Running: supabase {0}" -f ($arguments -join ' '))
    & supabase @arguments

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}