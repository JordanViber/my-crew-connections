# My Crew Connections Integrations And Secrets

Date: April 19, 2026

## Purpose

This document lists every external service, credential, product decision, and account dependency that may be needed to make My Crew Connections fully functional, while distinguishing what is already working locally today.

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

If we use the recommended stack, the localhost dependency is local Supabase tooling rather than a hosted Supabase project.

## Current Localhost Reality

Today the app can already run locally with:
- local Supabase Auth and Postgres
- local password auth as the primary localhost path
- optional magic-link auth for parity testing
- copyable invite links for linking one connection to another real user account
- saved hangouts with ICS export
- in-app notifications for invites, group invites, hangout proposals, and responses
- web-push subscription and delivery helpers when VAPID keys are configured
- Resend-backed invite and hangout proposal email helpers when email provider env vars are configured

What still needs production configuration:
- deployed app URL and verified sender domain for outbound email links
- Resend API key and from-address configuration in the hosted environment
- VAPID public/private keys and subject for web push
- scheduled jobs for cadence reminders and digests
- hosted analytics
- hosted error tracking

What is not yet wired to an external provider:
- hosted analytics
- hosted error tracking

## Required For Localhost MVP

## 1. Local Supabase Tooling
### Required
Yes.

### What you need to do
- install Docker
- install the Supabase CLI
- allow the Supabase local stack to run on your machine

## 2. Hosted Supabase Project
### Required
No for localhost.

### Required later
Only if we want a hosted shared environment.

## 3. Environment Variables
### Required
Yes.

### Expected variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` only when privileged server-side operations exist

## 4. Auth Configuration
### Required
Yes.

### Minimum recommendation
- local email and password for the first local MVP
- keep magic link available as a secondary parity path if desired

## Strongly Recommended For Production MVP

## 5. Vercel Project
### Required for localhost
No.

### Required for deployed MVP
Yes, if we follow the recommended frontend hosting path.

## 6. Email Delivery Provider
### Required for localhost
Not necessarily.

### Required for fuller MVP
Usually yes.

### Why
Helpful for:
- reminder fallback
- transactional invite delivery
- hangout proposal delivery
- production-quality auth email delivery if default behavior is insufficient

### Suggested provider
- Resend

### Current localhost note
Invite and hangout proposal flows still work through in-app links locally. Resend helpers are implemented for invite and proposal email delivery, but they only send when `RESEND_API_KEY`, app URL, and sender configuration are present.

## 7. Web Push VAPID Keys
### Required for localhost
No for the core localhost loop

### Required for push notifications
Yes

### Current localhost note
Push subscription storage and send helpers exist. Delivery requires `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a valid `VAPID_SUBJECT`.

## Optional Later-Phase Integrations

## 8. Google OAuth
### Required for localhost
No

## 9. Custom Domain
### Required for localhost
No

### Required for polished production
Yes

## 10. Analytics
### Required for localhost
No

### Suggested tools
- PostHog
- Plausible

## 11. Error Tracking
### Required for localhost
No

### Suggested tool
- Sentry

## 12. Calendar APIs
### Required for local MVP
No

### Why not required
ICS export is already implemented and does not need external API credentials.

## 13. Maps Or Places APIs
### Required for local MVP
No

## 14. Contact Import Provider Or Device Access Strategy
### Required for local MVP
No

### Recommendation
Do not block MVP on contact sync. Start with:
- manual person creation
- invite links
- optional CSV import later if needed

## 15. Photo Storage Expansion Or External Albums
### Required for local MVP
No

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
- local password only
- local password plus magic link
- magic link plus Google sign-in

### Recommendation
Local password first for localhost, with magic link kept available as a secondary path.

## 3. Reminder channels in MVP
Choose one:
- in-app only
- in-app plus email
- in-app plus push plus email

### Recommendation
The app now supports in-app notifications plus provider-dependent email and push paths for invites and proposals. Keep scheduled cadence reminders conservative: start with in-app/dashboard surfacing, then add digest or push/email reminder jobs once collaboration behavior settles.

## 4. Calendar behavior in MVP
Choose one:
- ICS export only
- ICS plus calendar API integration

### Recommendation
Persisted hangouts plus ICS export only.

## Local Development Footnote

When local schema changes require `supabase db reset --local`, the reset will wipe local auth users and test data.

That means:
- previously created local accounts will no longer be valid
- users must recreate their local account before signing in again
- invite and collaboration testing should be repeated on the current reset state

## Recommended Setup Order

1. install Docker and Supabase CLI
2. start local Supabase and wire local environment variables
3. verify local password auth and magic-link fallback
4. verify invite-link flow locally
5. configure Resend for hosted invite and proposal email delivery
6. configure VAPID keys for hosted push delivery
7. add scheduled reminder and digest jobs later

## What I Can Do Without Waiting

I can proceed without extra external accounts for:
- building the Next.js PWA
- modeling the database schema in SQL and code
- building UI for people, groups, cadence rules, hangouts, and local reminder views
- adding invite-link and in-app notification flows that work locally without outbound provider delivery
- adding env placeholders and setup instructions

## What Will Block Full Functionality

The main real blocker is the absence of a working local Supabase setup and its environment values.

Everything else is either:
- optional for the first localhost MVP
- or can be layered in after the product core is working
