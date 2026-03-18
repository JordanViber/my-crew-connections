# My Crew Connections Localhost MVP Requirements

Date: March 16, 2026

## Goal

Define the smallest set of product functionality and technical dependencies required to run a meaningful My Crew Connections MVP locally on `localhost`.

This document is intentionally strict.
It is about what we absolutely need, not everything we eventually want.

## MVP Definition

A localhost MVP is successful if one person can:
- create an account
- add people and groups they care about
- set a desired reconnect cadence
- see who is due soon or overdue
- log a touchpoint or hangout
- optionally schedule the next hangout
- review a lightweight history for each person or group

That is enough to prove the core value proposition.

## Absolute Product Minimum

## 1. Authentication
### Need
Yes

### MVP requirement
- user sign-up and sign-in
- session persistence
- sign-out

### Recommendation
- email magic link only

## 2. Connections
### Need
Yes

### MVP requirement
- create a person record
- edit a person record
- view a list of people
- archive or soft-delete later if needed

### Minimal fields
- name
- optional tags
- optional notes

## 3. Groups
### Need
Yes

### MVP requirement
- create a group
- add people to a group
- view a list of groups
- view group details

### Minimal fields
- name
- optional description

## 4. Cadence Rules
### Need
Yes

### MVP requirement
- define cadence frequency for a person or group
- compute whether the relationship is on track, due soon, or overdue

### Minimal fields
- cadence unit
- cadence value
- reminder lead window

## 5. Touchpoints Or Hangouts
### Need
Yes

### MVP requirement
- log that you connected with a person or group
- store date
- optionally store note and activity

### Important simplification
For the first localhost MVP, a lightweight `touchpoint` model may be enough even if a fuller `hangout` model comes later.

## 6. Home Dashboard
### Need
Yes

### MVP requirement
- show due soon and overdue relationships
- show upcoming or recently logged interactions
- allow quick actions from the dashboard

## 7. Timeline Or History View
### Need
Yes

### MVP requirement
- show previous touchpoints per person or group
- show last interaction date

## Can Be Deferred Without Breaking MVP

These features are valuable, but they are not necessary for a true localhost MVP.

## 1. Push notifications
Defer.
Use in-app status and dashboard alerts first.

## 2. Email reminders
Defer.
Can be added after in-app reminder logic is validated.

## 3. Google sign-in
Defer.
Magic link is enough.

## 4. Contact sync
Defer.
Manual entry is enough to validate value.

## 5. Photo uploads
Defer if needed.
The core loop works without photos.

## 6. Place autocomplete or map integrations
Defer.
Use freeform location/activity text.

## 7. Shared collaboration across multiple users
Defer deep collaboration.
The data model can remain collaboration-ready while the UX stays solo-first.

## 8. Calendar API integration
Defer.
If scheduling exists, ICS export can come later or even after the first local pass.

## Strict Technical Minimum

## 1. Frontend app scaffold
### Need
Yes

### Recommendation
- Next.js
- TypeScript
- Tailwind CSS

## 2. Backend and database
### Need
Yes

### Recommendation
- local Supabase Auth
- local Supabase Postgres

## 3. Local environment config
### Need
Yes

### Minimum env values
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Source
These should come from the local Supabase stack, not a hosted project, for the first MVP.

### Current repo note
The frontend app lives in `client/`, so the generated runtime env file should live at `client/.env.local`.

## 4. Database schema
### Need
Yes

### Minimum tables or equivalents
- users or profile extension
- connections
- groups
- group_memberships
- cadence_rules
- touchpoints

## 5. Authorization rules
### Need
Yes

### Minimum requirement
Users should only see and modify their own records in the first version.

### Simplification
Full shared group permissions can wait.

## 6. Basic UI routes
### Need
Yes

### Suggested minimum routes
- auth page
- dashboard page
- people list and detail page
- groups list and detail page
- add or edit forms

## Recommended Localhost MVP Slice

If we want to be extremely disciplined, the first working slice should be:
1. sign in
2. add a person
3. set cadence
4. log a touchpoint
5. see dashboard status update

That is the smallest real proof of value.

After that, add in this order:
1. groups
2. timeline views
3. optional simple hangout scheduling
4. optional ICS export
5. optional photos

## What You Need To Provide Before We Can Build This

### Required
- Docker installed and running
- Supabase CLI installed
- the local Supabase URL
- the local Supabase anon key

### Helpful but not blocking
- decision to use magic-link only for MVP
- decision to defer push, email, contact sync, and maps

## Recommended Localhost MVP Decisions

To move fastest, I recommend:
- solo-first MVP
- magic-link auth only
- no push in first pass
- no email in first pass
- no contact sync in first pass
- no photo uploads in first pass
- no maps integration in first pass
- no Google OAuth in first pass
- no deep calendar integration in first pass

## Concrete Build Order

1. scaffold Next.js app
2. connect Supabase auth
3. create database tables and policies
4. build people CRUD
5. build group CRUD
6. build cadence rule UI and logic
7. build touchpoint logging
8. build dashboard due-soon and overdue logic
9. build timeline/history views

## Definition Of Done For Localhost MVP

The localhost MVP is done when a tester can:
- sign in locally
- add at least 3 people
- add at least 1 group
- set cadence rules
- log touchpoints
- see who needs attention
- return later and still see persisted state
