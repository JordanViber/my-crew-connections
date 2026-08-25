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

This repository contains the My Crew Connections PWA. Production is live at [https://mycrewconnections.app](https://mycrewconnections.app) on a custom domain via Vercel, and the same app still runs locally against a local Supabase stack.

Available today:
- hosted production at https://mycrewconnections.app
- Next.js App Router app in `client/`
- PWA install on supported browsers, plus first-run empty-state copy for brand-new hosted users
- PWA assets (`/sw.js`, `/manifest.webmanifest`, `/icon`, `/apple-icon`) are excluded from session-refresh middleware so hosted auth is not saturated by those requests
- Supabase-backed auth with password sign-in, email code sign-in with link fallback, and optional phone OTP sign-in
- outbound auth confirmation email via Resend from no-reply@auth.mycrewconnections.app
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
- optional shared public memories for two-way-linked users, with private notes kept on the logger's side
- completed shared hangouts copy a public memory onto the linked person's timeline so cadence updates on both sides
- two-way-linked people become real accepted group members instead of staying placeholders or pending a second group invite
- claiming a connection invite promotes existing group memberships and pending group invites for that person
- group invites with accepted, declined, and pending membership states for people who are not linked yet
- group hangout proposals with participant responses and confirmation
- in-app notification center for invites, plans, and responses
- push-first invite delivery for existing users with email fallback when push is unavailable
- Resend-backed invite and hangout proposal email plumbing when provider env vars are configured
- explicit accepted, declined, claimed, and inactive terminal states on invite links
- unit tests plus Playwright coverage for the core authenticated flows

Still intentionally deferred:
- scheduled reminder delivery outside the active app session
- invite and push production hardening beyond working auth confirmation email
- richer shared group permissions, shared notes, and linked cadence beyond accepted membership
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
2. groups can still include local-only connection placeholders, but two-way-linked people become real accepted members
3. real-user linking currently happens from a connection detail page through a claimable invite link
4. invite claim links both sides by creating or reusing a reciprocal connection for the invited user
5. linked users can share public touchpoint memories and completed shared hangouts update both timelines
6. claiming a connection invite also promotes that person into any groups they already belonged to as a placeholder or pending invite
7. saved hangouts exist and can be exported to calendar via ICS
8. in-app notifications, web-push plumbing, and Resend email plumbing exist; auth confirmation email is working in production, while invite/push delivery still needs hardening
9. first-run empty states now point new users toward adding a person or group instead of assuming they already have a rhythm
10. mobile validation now uses an iPhone 15-sized viewport in browser coverage
11. hosted dashboard/auth can stall when middleware refreshes the session on PWA asset requests; those assets are now excluded

## Suggested Next Steps

1. deepen shared history, notes, or cadence for two-way-linked users now that linked people can sit in groups as real members
2. add scheduled reminder and digest delivery after the collaboration model settles
3. harden production invite/proposal email and VAPID web push delivery
4. add photo or media handling only after the shared-memory loop is clearer
