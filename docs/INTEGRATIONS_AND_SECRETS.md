# My Crew Connections Integrations And Secrets

Date: March 16, 2026

## Purpose

This document lists every external service, credential, product decision, and account dependency that may be needed to make My Crew Connections fully functional.

It is split into:
- what is required for a localhost MVP
- what is required for a production-ready MVP
- what is optional or later-phase

## Summary

Not every integration is needed immediately.

For a working localhost MVP, the true must-haves are relatively small:
- a frontend app
- a database-backed backend
- authentication
- a local environment file

If we use the recommended stack, the one major required external dependency is a Supabase project.

## Required For Localhost MVP

## 1. Supabase Project
### Required
Yes.

### Why it is needed
If we follow the current stack direction, Supabase provides:
- auth
- Postgres database
- row-level security
- storage later if we add photos early

### What you need to do
- create a new Supabase project
- choose project name and region
- provide the project URL
- provide the anon/public key
- provide the service role key only when needed for secure server-side features

### Notes
A localhost MVP can still call a hosted Supabase project. The app runs locally while the backend services are hosted remotely.

## 2. Environment Variables
### Required
Yes.

### Why it is needed
The app will need local environment values for services like Supabase.

### Expected variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` when server-side privileged operations exist

### What you need to do
- provide the values after creating the Supabase project
- keep them in a local `.env.local` file and never commit them

## 3. Auth Configuration
### Required
Yes.

### Minimum recommendation
- email magic link only for the first local MVP

### Why
This is the simplest working auth path and avoids needing extra OAuth setup immediately.

### What you need to do
- enable email auth in Supabase
- optionally configure allowed redirect URLs for local development

## Strongly Recommended For Production MVP

## 4. Vercel Project
### Required for localhost
No.

### Required for deployed MVP
Yes, if we follow the recommended frontend hosting path.

### Why
A deployed frontend needs hosting and environment configuration.

### What you need to do
- create or choose a Vercel account/project
- connect the repository
- configure production and preview environment variables

## 5. Email Delivery Provider
### Required for localhost
Not necessarily.

### Required for fuller MVP
Usually yes.

### Why
Helpful for:
- reminder fallback
- transactional emails
- production-quality auth email delivery if default behavior is insufficient

### Suggested provider
- Resend

### What you need to do
- create an account
- create an API key
- optionally verify a sending domain

## 6. Web Push VAPID Keys
### Required for localhost
No for the first pass

### Required for push notifications
Yes

### Why
Browser push needs VAPID keys and permission handling.

### What you need to do
- generate or provide VAPID public/private keys
- decide when to turn on push in the product lifecycle

### Recommendation
Defer push until after core reminder logic works in-app.

## Optional But Common For Production

## 7. Google OAuth
### Required for localhost
No

### Why you might want it
- faster sign-in
- lower friction than magic links for some users

### What you need to do
- create a Google Cloud project
- configure OAuth consent screen
- generate client credentials
- add localhost and production redirect URIs

### Recommendation
Do not block MVP on this.

## 8. Custom Domain
### Required for localhost
No

### Required for polished production
Yes

### What you need to do
- purchase or choose a domain
- configure DNS with hosting provider

## 9. Analytics
### Required for localhost
No

### Suggested tools
- PostHog
- Plausible

### Why
Useful for understanding activation and reminder-to-action behavior.

## 10. Error Tracking
### Required for localhost
No

### Suggested tool
- Sentry

### Why
Useful once the app is deployed or shared with testers.

## Optional Later-Phase Integrations

## 11. Calendar APIs
### Required for local MVP
No

### Why not required
ICS export is enough for an MVP and does not need external API credentials.

### When needed
Only if we want:
- one-click Google Calendar creation
- richer calendar sync behavior
- calendar read access

### What you would need
- Google API project and credentials
- consent screen and scopes

## 12. Maps Or Places APIs
### Required for local MVP
No

### Why not required
The app can start with freeform places and simple history-based suggestions.

### When needed
If we later want:
- autocomplete for places
- venue discovery
- map views
- directions links beyond simple URL generation

### Possible providers
- Google Places
- Mapbox

## 13. Contact Import Provider Or Device Access Strategy
### Required for local MVP
No

### Why this is tricky
Contact access varies a lot by browser and platform. Deep contact sync may require a more specific technical path than a normal web form flow.

### Recommendation
Do not block MVP on contact sync. Start with:
- manual person creation
- invite links
- optional CSV import later if needed

## 14. Photo Storage Expansion Or External Albums
### Required for local MVP
No

### Why
A local MVP can either:
- skip photos initially
- or use Supabase Storage with strict upload caps

### Later options
- internal storage quotas
- external album links
- Google Photos or iCloud link-based workflows

## Product Decisions You Need To Make

These are not API keys, but they still require your intervention.

## 1. Primary launch user
Choose one:
- solo user maintaining friendships
- friend groups maintaining recurring traditions
- hybrid, but one should still be primary

### Recommendation
Solo-first, collaboration-ready.

## 2. Auth scope
Choose one:
- magic link only
- magic link plus Google sign-in

### Recommendation
Magic link only for the first build.

## 3. Photos in MVP
Choose one:
- no photos in first local MVP
- limited photos in first local MVP

### Recommendation
Limited photos can be deferred if it slows the core product loop.

## 4. Reminder channels in MVP
Choose one:
- in-app only
- in-app plus email
- in-app plus push plus email

### Recommendation
Start with in-app only on localhost, then add email, then add push.

## 5. Calendar behavior in MVP
Choose one:
- ICS export only
- ICS plus calendar API integration

### Recommendation
ICS only.

## Recommended Setup Order

1. create Supabase project
2. decide auth method
3. scaffold Next.js app
4. wire local environment variables
5. implement auth and core data model
6. implement in-app reminder flow
7. add ICS export
8. add optional email delivery
9. add optional push notifications

## What I Can Do Without Waiting

I can proceed without extra external accounts for:
- scaffolding the Next.js PWA
- setting up TypeScript and Tailwind
- creating the app structure
- modeling the database schema in code or SQL drafts
- building UI for people, groups, cadence rules, and local reminder views
- adding env placeholders and setup instructions

## What Will Block Full Functionality

The main real blocker is the absence of a Supabase project and its environment values.

Everything else is either:
- optional for the first localhost MVP
- or can be layered in after the product core is working
