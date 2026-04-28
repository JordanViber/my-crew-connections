# My Crew Connections

My Crew Connections is a relationship-maintenance PWA for people who want to stay in touch with the people and groups they care about.

The core idea is simple:
- remember who matters
- define how often you want to connect
- get reminded when too much time has passed
- turn reminders into real plans
- keep lightweight memories of the hangouts you shared

The product is meant to feel warm, lightweight, and social rather than like a business CRM.

## Product Direction

The product direction is a web-first PWA that supports:
- individual friends and shared groups
- cadence setup for how often you want to meet or check in
- overdue reminders and nudges
- hangout planning and calendar export
- memory timelines with notes, activities, and places
- collaboration when other participants join the app

The core loop is:
1. add a person or group
2. set a cadence
3. receive a reminder
4. schedule or log a hangout
5. preserve the memory
6. repeat

## Planning Docs

The planning work lives in [docs/README.md](docs/README.md).

Key documents:
- [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)
- [docs/FEATURE_PILLARS.md](docs/FEATURE_PILLARS.md)
- [docs/USER_FLOWS.md](docs/USER_FLOWS.md)
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- [docs/TECH_STACK_DECISIONS.md](docs/TECH_STACK_DECISIONS.md)
- [docs/MVP_ROADMAP.md](docs/MVP_ROADMAP.md)

## Current Product State

This repository contains an actively developed local-first build of My Crew Connections.

Available today:
- Next.js App Router app in `client/`
- Supabase-backed auth with password sign-in as the primary local path and magic link as a secondary option
- people and groups CRUD with archive support
- searchable and filterable people directory with linked, pending, and local-only states
- searchable and filterable group directory for larger crews
- mobile people and groups routes now default to the active directory view, with creation available as an explicit next action
- group creation now uses a searchable picker for existing people instead of a bare checklist
- cadence rules, relationship health, reminder queue, and dashboard prioritization
- touchpoint logging with timeline history, activity, and place context
- persisted hangout planning with ICS export
- mobile-first navigation and section tabs
- mobile navigation tuned so list/create screens keep tabs out of the way while detail surfaces stay easier to move around
- connection invite links that can be claimed by another real app user
- optional invite start during connection creation
- two-way relationship linking so invite claim creates or reuses a reciprocal connection for the invited user
- unit tests plus Playwright coverage for the core authenticated flows

Still intentionally deferred:
- push notification delivery
- production email delivery
- hosted deployment setup
- rich collaboration beyond connection linking and invite claiming
- photo and media upload flow

## Local Development

This repo already includes a local Supabase CLI config in [supabase/config.toml](supabase/config.toml).

For cross-machine local development:
- use [scripts/supabase-start.ps1](scripts/supabase-start.ps1) on Windows
- use [scripts/supabase-start.sh](scripts/supabase-start.sh) on macOS or Linux
- generate the app env file from the running local stack with [scripts/supabase-sync-env.ps1](scripts/supabase-sync-env.ps1) or [scripts/supabase-sync-env.sh](scripts/supabase-sync-env.sh)
- run the web app from `client/` with `npm install` followed by `npm run dev`
- open `http://127.0.0.1:3100`

That keeps [client/.env.local](client/.env.local) machine-specific and reproducible without committing secrets or hard-coding one machine's values into the repo.

Important local-dev note:
- `supabase db reset --local` wipes local auth users and application data
- after a reset, any previously created local account must be recreated with the `Create or reset local account` flow before signing in again

## Resume Notes

If we need to pick up quickly, the current product shape is:
1. solo-first relationship maintenance app with collaboration-ready data
2. groups are still primarily composed from existing connection records
3. real-user linking currently happens from a connection detail page through a claimable invite link
4. invite claim links both sides by creating or reusing a reciprocal connection for the invited user
5. saved hangouts exist and can be exported to calendar via ICS
6. mobile validation now uses an iPhone 15-sized viewport in browser coverage

## Suggested Next Steps

1. deepen collaborative behavior for linked users and groups now that two-way connection linking exists
2. decide whether groups should support richer shared membership management beyond connection placeholders
3. add production invite delivery through email instead of copyable local links only
4. add notifications after the collaboration and planning model settles
5. add photo or media handling only after the shared-memory loop is clearer
