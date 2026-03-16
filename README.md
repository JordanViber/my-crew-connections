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

This repo has not been scaffolded yet, but the current direction is to start as a single Next.js PWA, use local Supabase for the first working MVP, and keep the first release lean.

## Project Status

This repository is currently in planning and product-definition mode.

What exists now:
- initial product and technical planning docs

What does not exist yet:
- app scaffold
- database schema
- auth implementation
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

## Suggested Next Steps

1. finalize MVP scope and primary target user
2. scaffold the Next.js PWA
3. create the Supabase project and environment configuration
4. implement auth, connections, groups, and cadence rules
5. build the reminder loop before deeper media or AI features
