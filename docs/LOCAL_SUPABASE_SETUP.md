# My Crew Connections Local Supabase Setup

Date: March 16, 2026

## Purpose

This document explains how to run My Crew Connections against a local Supabase stack during MVP development.

This is the preferred localhost path because it:
- avoids free-tier hosted project limits
- keeps the architecture aligned with the current product plan
- gives us local auth and Postgres without needing a cloud project first

## What Local Supabase Gives Us

For the first MVP, local Supabase covers:
- authentication
- Postgres database
- row-level security testing
- local API endpoints
- storage compatibility later if we need it

## Prerequisites

You need the following installed on your machine:
- Docker Desktop running
- Supabase CLI installed
- Node.js for the eventual frontend app

### Current machine note

The Supabase config in this repo is the same on every machine.
What can vary is only how Docker is reached:

- Windows with Docker Desktop usually needs no extra Docker environment variables
- macOS with Docker Desktop usually needs no extra Docker environment variables
- macOS with Colima may need `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock`

To avoid baking one machine's Docker setup into the repo, use the helper scripts in `scripts/`:
- `scripts/supabase-start.ps1`
- `scripts/supabase-start.sh`
- `scripts/supabase-sync-env.ps1`
- `scripts/supabase-sync-env.sh`

The shell scripts auto-detect the common Colima socket if `DOCKER_HOST` is not already set.

## High-Level Workflow

1. initialize Supabase in the repo
2. start the local Supabase stack
3. capture the local URL and anon key
4. generate `.env.local` from the running local stack
5. build the app against the local services
6. add schema and policies through migrations

## Expected Local Environment Values

The app will eventually need values like:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` only for privileged server-side features

## Recommended Local Development Rules

- do not commit secrets
- use local Supabase for product development until the MVP loop feels solid
- defer hosted Supabase until we need shared staging or production
- keep migrations in version control so the database can be reproduced later

## Suggested Next Implementation Steps

1. verify Docker and Supabase CLI availability
2. initialize local Supabase in this repo
3. scaffold the Next.js app
4. create initial schema for connections, groups, cadence rules, and touchpoints
5. wire auth and basic CRUD

## Useful Local Commands

### Initialize once
`supabase init`

### Start local stack on Windows
`powershell -ExecutionPolicy Bypass -File .\scripts\supabase-start.ps1`

### Start local stack on macOS or Linux
`./scripts/supabase-start.sh`

### Generate `.env.local` on Windows
`powershell -ExecutionPolicy Bypass -File .\scripts\supabase-sync-env.ps1`

### Generate `.env.local` on macOS or Linux
`./scripts/supabase-sync-env.sh`

### Show raw local env values
`supabase status -o env`

### Stop local stack
`supabase stop`

## Cross-machine env strategy

Do not copy `.env.local` between machines.

Instead:
1. keep the shared local Supabase config in version control
2. start the local stack on the current machine
3. regenerate `.env.local` from `supabase status -o env`

That makes local development portable across:
- Windows with Docker Desktop
- macOS with Docker Desktop
- macOS with Colima

If the local keys differ on one machine, the generated `.env.local` for that machine stays correct without changing committed repo files.

## Notes

When we are ready, we can later move to a hosted Supabase project or another hosted Postgres environment without changing the product plan.
