#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI was not found on PATH. Install it first, then re-run this script." >&2
  exit 1
fi

if [[ -z "${DOCKER_HOST:-}" ]] && [[ -S "${HOME}/.colima/default/docker.sock" ]]; then
  export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"
fi

output_path="${1:-.env.local}"
env_output="$(supabase status -o env)"

get_value() {
  local key="$1"
  printf '%s\n' "$env_output" | sed -n "s/^${key}=//p" | head -n 1
}

api_url="$(get_value API_URL)"
anon_key="$(get_value ANON_KEY)"
service_role_key="$(get_value SERVICE_ROLE_KEY)"

if [[ -z "$api_url" || -z "$anon_key" || -z "$service_role_key" ]]; then
  echo "Failed to parse required values from 'supabase status -o env'." >&2
  exit 1
fi

cat > "$output_path" <<EOF
# Generated from supabase status -o env.
# Re-run this script on each machine after starting the local Supabase stack.
NEXT_PUBLIC_SUPABASE_URL=$api_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key
SUPABASE_SERVICE_ROLE_KEY=$service_role_key
EOF

echo "Wrote $output_path"