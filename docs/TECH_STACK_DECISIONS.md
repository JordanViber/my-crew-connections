# My Crew Connections Tech Stack Decisions

Date: March 16, 2026

## Recommended Direction

Build the first version as a web-first PWA using a modern React stack with a local-first backend workflow.

Given the repo shape and `.gitignore`, the cleanest starting point is:
- Next.js
- TypeScript
- Tailwind CSS
- local Supabase for localhost auth and Postgres
- web push notifications where supported
- ICS export for calendar interoperability

This keeps the first release fast to ship, avoids free-tier hosted project limits, and leaves room for a hosted backend later.

## App Architecture Recommendation

## Frontend
### Recommendation
Use Next.js with the App Router and TypeScript.

### Why
- strong fit for PWA-capable web app development
- easy deployment on Vercel or similar providers
- good ergonomics for server actions, API routes, and authenticated pages
- easy alignment with the sibling workspace patterns if useful later

### UI stack recommendation
- Next.js
- React
- TypeScript
- Tailwind CSS
- a small component system such as shadcn/ui or a similarly lightweight pattern
- Framer Motion only if subtle motion meaningfully improves the product feel

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
- file storage for photos
- cron or scheduled job support through edge functions or server-side jobs
- realtime capability if shared groups later benefit from it

### Localhost recommendation
For the current phase of this repo, the best setup is:
- Supabase CLI
- Docker
- local Supabase services for auth and Postgres

This avoids depending on a hosted Supabase project before the product loop is proven.

### Alternative
Firebase is viable, but the relational nature of users, groups, memberships, hangouts, cadence rules, and participant records makes Postgres feel like the better fit.

## Authentication
### Recommendation
Start with email magic link plus OAuth options later.

### MVP auth options
- email magic link
- Google sign-in

### Why
This keeps onboarding low-friction without introducing password management overhead.

## Data Storage
### Recommendation
Use Postgres for core relational data and object storage for photo assets.

### Core tables likely needed
- users
- connections
- groups
- group_memberships
- cadence_rules
- touchpoints
- hangouts
- hangout_participants
- hangout_photos
- invitations
- notifications

## Photo Strategy
### Recommendation
Do not overbuild media in version one.

### MVP approach
- store compressed uploads in managed object storage
- generate thumbnails
- cap uploads per hangout
- cap file size aggressively
- allow only common image types

### Why
Users will value photos, but uncontrolled storage can become expensive quickly.

### Later options
- quota tiers
- external album links
- optional integration with Google Photos or iCloud shared albums via link-based workflows rather than deep sync

## Notification Strategy

### In-app notifications
Required for MVP.

### Web push
Recommended for MVP with caveats.

Pros:
- feels native enough for a PWA
- strong fit for reminder behavior

Caveats:
- browser permissions are delicate
- iOS web push works only under specific install conditions
- reliability and user understanding vary by platform

### Email fallback
Strongly recommended.

Why:
- covers devices or browsers where push is weak
- lets reminders still function if the user has not enabled push

### Recommendation
Ship a layered notification strategy:
1. in-app notifications
2. web push when available and opted in
3. email fallback for important reminders

## Scheduling And Calendar Strategy

### MVP recommendation
Generate ICS files and offer a clean share flow.

### Why
ICS files are broadly compatible with:
- Apple Calendar
- Google Calendar
- Outlook
- many other calendar apps

### Practical nuance
ICS support is widely available, but the import experience is not equally seamless on every platform and browser combination. For MVP, ICS is still the best compatibility layer.

### Later enhancements
- Google Calendar API integration for authenticated one-click add
- richer calendar deep links where reliable
- optional participant RSVP collection in-app

## Contact Sync Strategy

### Recommendation
Treat contact import as optional and privacy-sensitive.

### MVP approach
- request permission clearly
- let users select individual contacts
- avoid automatic bulk import
- prioritize favorites and recents if possible

### Why
Trust is critical, and the app should not become a bloated address book.

## Suggested Places And Activities

### MVP recommendation
Use rules and history, not AI.

### Approach
- store prior activities and places
- rank suggestions by recency and frequency
- let users manually label favorites

### Why
This creates useful suggestions cheaply and deterministically.

### Later
Add AI-assisted recommendations only after enough user history exists and the value is proven.

## PWA Requirements

### MVP checklist
- installable manifest
- responsive mobile-first layout
- service worker for basic caching
- offline shell for previously visited pages
- graceful handling when network is unavailable

### Important limitation
Background behavior in PWAs is limited compared to native apps. Scheduled reminders should be triggered server-side and delivered through push or email rather than relying on local device logic.

## API And App Boundaries

### Recommendation
Start with one Next.js application plus managed backend services.

### Why
This is simpler than splitting into separate frontend and backend repos too early.

### Suggested structure later
- app frontend in Next.js
- server actions or API routes for app-specific orchestration
- backend services for auth, database, storage, and scheduled jobs

## Scheduling Jobs And Reminder Engine

### Recommendation
Compute reminders server-side on a schedule.

### Why
Cadence evaluation should not depend on a user opening the app.

### Example jobs
- find overdue cadence rules each morning in the user's timezone
- queue reminder notifications
- send digest emails
- prompt post-hangout logging after scheduled events pass

## Search, Maps, And Location

### MVP recommendation
Keep location freeform first.

### Why
The app does not need map complexity immediately.

### Later options
- Google Places
- Mapbox
- Apple Maps links

## Observability And Product Analytics

### Recommendation
Add analytics early and error tracking from day one.

### Suggested tools
- PostHog or a similar product analytics tool
- Sentry for error monitoring

### Key product events to track
- connection added
- group created
- cadence rule created
- reminder delivered
- reminder acted on
- hangout scheduled
- hangout completed
- photo uploaded

## Hosting Recommendation

### Frontend hosting
- Vercel is the easiest fit for a Next.js PWA

### Backend hosting
- Supabase managed project later if and when we need a hosted environment

### Why
This combination optimizes for speed, developer productivity, and reasonable cost at early scale.

## Security And Privacy Requirements

### MVP requirements
- row-level access rules
- private notes isolated by user
- explicit control over which participants can see hangout photos
- consent-first contact access
- clear delete behavior for users and shared media

### Future needs
- data export
- stronger audit trails
- moderation flows if the app grows beyond known friend groups

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
- Supabase Storage
- scheduled server jobs or edge functions

### Integrations
- Web Push API
- email provider such as Resend for fallback reminders
- ICS generation for calendar export

### Developer tooling
- ESLint
- Prettier
- Playwright for end-to-end flows later
- Vitest or Jest for unit tests

## Decision Summary

If the goal is to ship a polished MVP quickly, the best path is:
- single Next.js TypeScript PWA
- local Supabase backend for development
- push plus email reminder strategy
- ICS export first for calendars
- internal photo storage with strict caps
- rules-based suggestions before AI

This stack is opinionated but appropriately pragmatic for a social coordination PWA.
