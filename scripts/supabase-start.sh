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

args=(start)

if [[ "${1:-}" != "--include-optional-services" ]]; then
  args+=(-x vector,logflare)
fi

printf 'Running:'
printf ' %q' supabase "${args[@]}"
printf '\n'

supabase "${args[@]}"