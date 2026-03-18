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

The current product direction is a web-first PWA that supports:
- individual friends and shared groups
- cadence setup for how often you want to meet or check in
- overdue reminders and nudges
- hangout planning and calendar export
- memory timelines with notes, activities, places, and limited photos
- collaboration when other participants join the app

The planned MVP focuses on the smallest valuable loop:
1. add a person or group
2. set a cadence
3. receive a reminder
4. schedule or log a hangout
5. preserve the memory
6. repeat

## Planning Docs

The initial planning work lives in [docs/README.md](docs/README.md).

Key documents:
- [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)
- [docs/FEATURE_PILLARS.md](docs/FEATURE_PILLARS.md)
- [docs/USER_FLOWS.md](docs/USER_FLOWS.md)
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- [docs/TECH_STACK_DECISIONS.md](docs/TECH_STACK_DECISIONS.md)
- [docs/MVP_ROADMAP.md](docs/MVP_ROADMAP.md)

## Proposed Tech Stack

The current recommended starting stack is:
- Next.js
- TypeScript
- Tailwind CSS
- local Supabase for localhost auth and Postgres during development
- web push plus email fallback for reminders
- ICS export for cross-calendar compatibility

The current implementation now includes a Next.js app in `client/` wired to local Supabase for a disciplined first MVP slice.

## Project Status

This repository is now in early implementation mode.

What exists now:
- initial product and technical planning docs
- local Supabase schema and RLS for the solo-first MVP
- Next.js client scaffold with magic-link auth, dashboard, people, groups, and touchpoint logging
- unit and browser smoke test coverage

What does not exist yet:
- notifications implementation
- calendar integration layer
- media upload flow

## Expected Integration Points

Before the app can be fully functional, it will need external services and accounts for areas such as:
- local Supabase CLI and Docker setup for localhost development
- deployment and hosting
- push notification keys
- email delivery
- optional OAuth providers
- optional calendar or location APIs

I can help enumerate these in detail and wire them into the app once the scaffold is created.

## Local Supabase

This repo already includes a local Supabase CLI config in [supabase/config.toml](supabase/config.toml).

For cross-machine local development:
- use [scripts/supabase-start.ps1](scripts/supabase-start.ps1) on Windows
- use [scripts/supabase-start.sh](scripts/supabase-start.sh) on macOS or Linux
- generate the app env file from the running local stack with [scripts/supabase-sync-env.ps1](scripts/supabase-sync-env.ps1) or [scripts/supabase-sync-env.sh](scripts/supabase-sync-env.sh)

That keeps [client/.env.local](client/.env.local) machine-specific and reproducible without committing secrets or hard-coding one machine's values into the repo.

## Suggested Next Steps

1. finalize the exact first-user persona for launch copy and onboarding
2. add richer reminder handling and optional scheduling or ICS export
3. deepen unit coverage around data queries and server actions
4. add photo or media handling only after the reminder loop feels solid
5. layer in notifications once the in-app cadence flow is validated
