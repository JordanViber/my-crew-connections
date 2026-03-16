# My Crew Connections MVP Roadmap

Date: March 16, 2026

## Goal Of The First Release

Prove that the app can help users stay more consistent with the people and groups they care about by making reconnection easier and more actionable.

The MVP wins if a user can:
- add people or a group they care about
- set a cadence
- get reminded at the right time
- turn the reminder into a real plan or logged touchpoint
- look back at lightweight memory context later

## Product Milestones

## Milestone 0: Product Framing And UX Direction

### Deliverables
- product brief
- feature pillar definition
- initial data model
- tech stack decisions
- core mobile-first UX wireframes

### Outcome
The scope is clear enough to build without thrashing.

## Milestone 1: Foundations

### Functional goals
- user auth
- basic profile
- home shell and navigation
- person and group creation
- initial data model and permissions

### UX goals
- warm onboarding
- simple empty states
- fast mobile-first navigation

### Success criteria
- a user can create an account
- add at least 1 person and 1 group
- see them on the home surface

## Milestone 2: Cadence And Reminder Loop

### Functional goals
- set cadence rules for a person or group
- compute relationship status
- view due soon and overdue cards
- in-app reminder center
- push or email reminder delivery for opted-in users

### UX goals
- reminder language feels supportive
- actions are one tap where possible

### Success criteria
- a user can set cadence and receive a reminder
- the reminder leads to a meaningful action path

## Milestone 3: Hangout Planning

### Functional goals
- create hangout proposal
- attach attendees
- set time and place
- save planned event
- export ICS file
- share event summary

### UX goals
- planning is lightweight, not like filling out a business calendar form
- suggestions from prior places or activities reduce friction

### Success criteria
- a user can go from reminder to scheduled hangout in a few steps

## Milestone 4: Logging And Memories

### Functional goals
- confirm completed hangout
- log activity and notes
- upload limited photos
- display person or group timeline

### UX goals
- logging a completed hangout takes less than a minute in the common case
- memory view feels personal and rewarding

### Success criteria
- a user can look back at a person or group's history and feel the app is helping maintain the relationship, not just nagging them

## Milestone 5: Collaboration And Invites

### Functional goals
- invite others to the app
- shared group visibility
- shared hangout visibility for participants
- private versus shared content rules

### UX goals
- collaborative surfaces are clear and low-confusion
- solo users still get strong value without requiring others to join

### Success criteria
- a user can invite others without collaboration becoming a blocker for core use

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
- limited photo uploads
- simple timeline

### Exclude
- deep contact sync
- smart recommendations beyond simple history
- map search
- recurring event automation
- extensive collaboration roles

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

## Phase 4: Intelligence Layer
### Add
- who to reconnect with next ranking
- activity suggestions tuned to history
- personalized prompts and summaries
- AI assistance where it is clearly additive

## Prioritization Principles

### Favor behavior change over feature breadth
A reminder that leads to a real hangout is more valuable than ten passive features.

### Favor low-friction input over rich metadata
Users should not need to enter a lot of data to get value.

### Favor trust and clarity over growth hacks
Contacts, photos, and shared memories are sensitive.

### Favor compatibility over perfect integration early
ICS export is better than waiting for flawless calendar integrations.

## Risks To Manage During Execution

### Risk 1: Setup friction
Mitigation:
- keep onboarding short
- avoid mandatory contact sync
- encourage adding only a few important people first

### Risk 2: Reminder fatigue
Mitigation:
- let users tune cadence and reminder styles
- support snooze and dismiss
- keep copy warm and non-judgmental

### Risk 3: Collaboration complexity
Mitigation:
- design solo-first
- add shared visibility carefully
- keep private notes private by default

### Risk 4: Storage costs
Mitigation:
- compress images
- cap uploads
- consider quotas before broadening media support

### Risk 5: Cross-platform push inconsistency
Mitigation:
- layer in-app, push, and email
- avoid depending on only one delivery mechanism

## Key Open Product Decisions

1. Should the first launch optimize for individuals maintaining friendships, groups maintaining traditions, or both equally?
2. Should logging a touchpoint be distinct from logging a hangout in the first release?
3. How collaborative should a hangout be before all participants are app users?
4. Are photos essential for launch or acceptable as a thin first version?

## Recommended Immediate Next Deliverables

1. choose the primary target user for launch
2. sketch the home screen and person or group detail views
3. decide private versus shared data boundaries
4. scaffold the web app with chosen stack
5. implement the cadence and reminder loop before deeper media or AI features
