# My Crew Connections Docs

This folder contains the planning documents plus the current implementation snapshot for the app as it exists in local development today.

## Documents

- [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md) - product thesis, users, scope, principles, and risks
- [FEATURE_PILLARS.md](./FEATURE_PILLARS.md) - functionality buckets with MVP versus later-phase guidance
- [USER_FLOWS.md](./USER_FLOWS.md) - current and planned user journeys
- [DATA_MODEL.md](./DATA_MODEL.md) - persisted entities and access-control direction
- [TECH_STACK_DECISIONS.md](./TECH_STACK_DECISIONS.md) - architecture and technology choices
- [MVP_ROADMAP.md](./MVP_ROADMAP.md) - phased delivery plan and current milestone status
- [INTEGRATIONS_AND_SECRETS.md](./INTEGRATIONS_AND_SECRETS.md) - external services, keys, product decisions, and setup blockers
- [LOCALHOST_MVP_REQUIREMENTS.md](./LOCALHOST_MVP_REQUIREMENTS.md) - the original local product baseline that shaped the current build
- [LOCAL_SUPABASE_SETUP.md](./LOCAL_SUPABASE_SETUP.md) - how to run the local Supabase stack and sync app env values

## Suggested Reading Order

1. Product brief
2. Feature pillars
3. User flows
4. Data model
5. Tech stack decisions
6. MVP roadmap
7. Integrations and secrets
8. Localhost MVP requirements and shipped delta
9. Local Supabase setup

## Key Throughline

The core loop for the app is:
1. identify who matters
2. define desired cadence
3. get reminded when connection is slipping
4. make or log a plan
5. preserve the memory
6. repeat

## Current Shipped State

As of May 7, 2026, the local app currently supports:
- dual-path auth with local password first and magic link second
- people and groups CRUD
- cadence rules and relationship health
- reminder queue and dashboard surfacing
- touchpoint logging and history
- saved hangout planning plus ICS export
- mobile bottom navigation and section tabs
- active-first mobile people and groups screens, with create as a deliberate follow-up action
- connection invite links and two-way real-user linking
- explicit linked, pending, and not-started link states on connection detail pages
- people directory search plus linked, pending, and local-only filtering
- group directory search plus health-state filtering
- searchable existing-people picker during group creation
- group invites with accepted, declined, and pending membership states
- group hangout proposals with RSVP-style participant responses
- in-app notifications for invites, proposals, and responses
- web-push delivery plumbing and Resend email plumbing, subject to local or production env configuration

## Resume Here

If we stop and resume later, start from this understanding:
- the core relationship loop is implemented and usable locally end to end
- local Supabase resets will wipe local auth users and test data
- groups still center on connection records first, with deeper shared collaboration still to come
- invite claiming now links both users by creating or reusing a reciprocal connection
- the next major product choice is how far to take shared groups, linked-user collaboration, and production-grade outbound delivery
