# My Crew Connections MVP Roadmap

Date: April 19, 2026

## Goal Of The First Release

Prove that the app can help users stay more consistent with the people and groups they care about by making reconnection easier and more actionable.

The MVP wins if a user can:
- add people or a group they care about
- set a cadence
- get reminded at the right time
- turn the reminder into a real plan or logged touchpoint
- look back at lightweight memory context later

## Current Status

Most of the localhost MVP is already implemented.

Shipped:
- auth
- people and groups CRUD
- searchable people directory with link-state filters
- searchable group directory with health-state filters
- active-first mobile people and groups views
- searchable existing-people picker while creating groups
- cadence setup and health computation
- in-app reminders and dashboard actions
- persisted hangout planning
- ICS export
- touchpoint logging and timeline history
- mobile navigation and section tabs
- connection invites and two-way user linking

Still pending:
- production invite delivery
- push and email notifications
- photo uploads
- deeper shared group collaboration

## Product Milestones

## Milestone 1: Foundations

### Functional goals
- user auth
- home shell and navigation
- person and group creation
- initial data model and permissions

### UX goals
- warm onboarding
- simple empty states
- fast mobile-first navigation

### Status
Shipped locally

## Milestone 2: Cadence And Reminder Loop

### Functional goals
- set cadence rules for a person or group
- compute relationship status
- view due soon and overdue cards
- in-app reminder center
- push or email reminder delivery for opted-in users later

### Status
Core in-app reminder loop shipped locally. Push and email delivery still deferred.

## Milestone 3: Hangout Planning

### Functional goals
- create hangout proposal
- set time and place
- save planned event
- export ICS file

### Status
Shipped locally with saved hangouts and ICS export

## Milestone 4: Logging And Memories

### Functional goals
- confirm completed hangout
- log activity and notes
- display person or group timeline
- add limited photos later if justified

### Status
Core logging and history shipped locally. Photos remain deferred.

## Milestone 5: Collaboration And Invites

### Functional goals
- invite others to the app
- link connection records to real users
- support shared group visibility later
- define private versus shared content rules

### Status
Partially shipped. Connection-level invite claiming and two-way linking exist. Shared groups and broader collaboration are still next.

## Suggested Release Phases

## Phase 1: True MVP
Ship only the smallest valuable loop.

### Include
- auth
- add person
- add group
- cadence setup
- overdue and due-soon surfaces
- in-app reminders
- hangout creation
- ICS export
- post-hangout logging
- simple timeline
- lightweight connection invite linking

### Exclude
- deep contact sync
- smart recommendations beyond simple history
- map search
- recurring event automation
- extensive collaboration roles
- media uploads if they slow the core loop

## Phase 2: Stronger Habit Loop
### Add
- push notifications
- email fallback reminders
- simple place and activity suggestions
- selective contact import
- weekly digest

## Phase 3: Social Depth
### Add
- richer collaboration
- shared albums
- group organizer rotation
- recurring traditions
- birthdays and important dates

## Prioritization Principles

### Favor behavior change over feature breadth
A reminder that leads to a real hangout is more valuable than ten passive features.

### Favor low-friction input over rich metadata
Users should not need to enter a lot of data to get value.

### Favor trust and clarity over growth hacks
Contacts, photos, and shared memories are sensitive.

### Favor compatibility over perfect integration early
ICS export is better than waiting for flawless calendar integrations.

## Recommended Immediate Next Deliverables

1. deepen collaboration for linked users and groups
2. decide whether groups should remain connection-first or become more fully shared
3. add production invite delivery
4. add notifications after the collaboration model settles
5. revisit media only after the shared-memory loop is clearer
