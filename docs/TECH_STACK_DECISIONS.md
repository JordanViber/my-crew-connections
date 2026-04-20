# My Crew Connections Tech Stack Decisions

Date: April 19, 2026

## Recommended Direction

Build the first version as a web-first PWA using a modern React stack with a local-first backend workflow.

Given the repo shape and `.gitignore`, the cleanest starting point is:
- Next.js
- TypeScript
- Tailwind CSS
- local Supabase for localhost auth and Postgres
- in-app reminders first
- ICS export for calendar interoperability

This keeps the first release fast to ship, avoids free-tier hosted project limits, and leaves room for a hosted backend later.

## Current Implementation Snapshot

The current localhost app already follows this direction:
- Next.js App Router in `client/`
- TypeScript and Tailwind CSS
- local Supabase Auth and Postgres
- server actions for authenticated mutations
- Playwright plus unit tests for core loops
- persisted hangout planning and ICS export
- copyable invite links for linking a connection to a real user account

## App Architecture Recommendation

## Frontend
### Recommendation
Use Next.js with the App Router and TypeScript.

### Why
- strong fit for PWA-capable web app development
- easy deployment on Vercel or similar providers
- good ergonomics for server actions, API routes, and authenticated pages

### UI stack recommendation
- Next.js
- React
- TypeScript
- Tailwind CSS
- a small component system such as shadcn/ui or a similarly lightweight pattern

### Why this UI stack fits
The product should feel warm, light, and polished. Tailwind plus a minimal component system gives enough speed without forcing a heavy enterprise aesthetic.

## Backend
### Recommendation
Use Supabase first, but prefer local Supabase for the first localhost MVP.

### Why
Supabase gives the exact primitives this product needs early:
- authentication
- Postgres relational data
- row-level security
- file storage later if photos are added
- realtime capability if shared groups later benefit from it

## Authentication
### Recommendation
For localhost, use local password auth as the primary flow and keep email magic link available as a secondary parity path. Add OAuth options later.

### MVP auth options
- local password for localhost iteration
- email magic link
- Google sign-in later

### Why
This keeps localhost iteration fast while still preserving the product's eventual email-first path.

## Data Storage
### Recommendation
Use Postgres for core relational data and object storage later for photo assets if that feature becomes important.

### Core tables likely needed
- users
- connections
- groups
- group_memberships
- cadence_rules
- touchpoints
- hangouts
- connection_invites
- notifications later

### Current localhost note
The implemented local slice already uses persisted hangouts and connection invites. Photos and notification delivery are still deferred.

## Notification Strategy

### In-app notifications
Required for MVP.

### Web push
Recommended later with caveats.

### Email fallback
Strongly recommended later.

### Recommendation
Ship in layers:
1. in-app reminder center and dashboard surfacing first
2. web push when available and opted in
3. email fallback for important reminders

## Scheduling And Calendar Strategy

### MVP recommendation
Persist hangout plans and generate ICS files from saved plans.

### Why
ICS files are broadly compatible with Apple Calendar, Google Calendar, Outlook, and many other calendar apps.

### Practical nuance
ICS support is widely available, but the import experience is not equally seamless on every platform and browser combination. For MVP, ICS is still the best compatibility layer, and it avoids external calendar credentials.

## Contact Sync Strategy

### Recommendation
Treat contact import as optional and privacy-sensitive.

### MVP approach
- request permission clearly
- let users select individual contacts
- avoid automatic bulk import

## PWA Requirements

### MVP checklist
- installable manifest
- responsive mobile-first layout
- service worker for basic caching
- graceful handling when network is unavailable

## Scheduling Jobs And Reminder Engine

### Recommendation
Compute reminders from persisted cadence and interaction data, even if delivery remains in-app first.

### Why
Cadence evaluation should not depend on a user opening the app.

## Hosting Recommendation

### Frontend hosting
- Vercel is the easiest fit for a Next.js PWA

### Backend hosting
- Supabase managed project later if and when we need a hosted environment

## Proposed Initial Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- minimal component primitives
- PWA manifest and service worker

### Backend
- Supabase Auth
- Postgres
- scheduled server jobs or edge functions later

### Integrations
- ICS generation for calendar export
- Web Push API later
- email provider such as Resend for invite or reminder delivery later

### Developer tooling
- ESLint
- Playwright for end-to-end flows
- Vitest for unit tests

## Decision Summary

If the goal is to ship a polished MVP quickly, the best path is:
- single Next.js TypeScript PWA
- local Supabase backend for development
- in-app reminder strategy first
- persisted hangouts plus ICS export first for calendars
- internal photo storage only after the core loop proves it deserves the complexity
- rules-based suggestions before AI

This stack is opinionated but appropriately pragmatic for a social coordination PWA.
