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
On this machine, Docker is available through Colima rather than the default Docker socket.
To make `supabase start` work here, we used a temporary socket symlink:

`ln -sf "$HOME/.colima/default/docker.sock" /tmp/colima-docker.sock`

And then ran Supabase commands with:

`DOCKER_HOST=unix:///tmp/colima-docker.sock`

## High-Level Workflow

1. initialize Supabase in the repo
2. start the local Supabase stack
3. capture the local URL and anon key
4. place those values in `.env.local`
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

### Start local stack
`DOCKER_HOST=unix:///tmp/colima-docker.sock supabase start -x vector,logflare`

### Show local env values
`DOCKER_HOST=unix:///tmp/colima-docker.sock supabase status -o env`

### Stop local stack
`DOCKER_HOST=unix:///tmp/colima-docker.sock supabase stop`

## Notes

When we are ready, we can later move to a hosted Supabase project or another hosted Postgres environment without changing the product plan.
