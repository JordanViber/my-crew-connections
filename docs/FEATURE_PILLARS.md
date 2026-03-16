# My Crew Connections Feature Pillars

Date: March 16, 2026

## Overview

This document groups the app's functionality into product pillars and distinguishes between MVP, next phase, and future opportunities.

## Pillar 1: Identity, Linking, And Network Building

This pillar covers how users bring people and groups into the app.

### MVP
- create account and profile
- manually add a person with name, relationship tags, and notes
- invite a person to join the app via share link or contact method
- create a group and add existing connections
- support groups even if not every participant has joined yet

### Next phase
- import from contacts with explicit opt-in and selective import
- suggested deduplication when the same person is added twice
- link multiple users to a shared group record
- shared ownership roles for groups such as owner, organizer, member

### Future opportunities
- smart contact prioritization from favorites or recency
- relationship categories inferred from behavior
- family or household structures

## Pillar 2: Relationship Cadence And Reminder Engine

This pillar is the emotional core of the app.

### MVP
- set a desired cadence per person or group such as every 2 weeks or monthly
- track last touchpoint and last in-person hangout separately if useful
- surface status such as on track, approaching overdue, overdue
- send reminders in-app and by push where supported
- let the user snooze, dismiss, or mark as handled

### Next phase
- support separate cadence by interaction type
- smarter reminder timing based on user behavior
- recurring traditions for groups such as first Friday dinner
- digest view of who needs attention this week

### Future opportunities
- relationship health scoring
- adaptive cadence suggestions based on behavior and response rate
- seasonal or life-event aware reminders

## Pillar 3: Hangout Planning And Scheduling

This pillar turns reminder intent into action.

### MVP
- create a hangout proposal with title, date, time, location, attendees, and notes
- link the hangout to one or more people or a group
- confirm final plan and save the event
- export an ICS file for calendar import
- provide a shareable event summary for text or group chat

### Next phase
- collect lightweight availability responses from invited participants
- direct Google Calendar integration
- Apple Calendar-friendly add flow via ICS and deep links where possible
- support recurring hangouts

### Future opportunities
- in-app polling for times and places
- map integrations and travel-time suggestions
- collaborative planning checklist per hangout

## Pillar 4: Places, Activities, And Suggestions

This pillar helps the app become more useful over time.

### MVP
- store what activity happened during each hangout
- store place name or custom freeform location
- ask what a user usually likes to do with this person or group
- show recent activities and places when planning the next hangout

### Next phase
- recommend previously enjoyed places
- recommend activity types based on tags and history
- filter suggestions by group size, budget, time of day, or weather-friendly category

### Future opportunities
- local venue API integrations
- AI-generated suggestions using history and preferences
- seasonal recommendations and novelty balancing

## Pillar 5: Memory Timeline And Photos

This pillar reinforces emotional value and makes the app feel personal.

### MVP
- log past hangouts with notes and date
- attach a limited number of photos to a hangout
- show a timeline for a person or group
- allow participants with access to view the shared memory entry

### Next phase
- captions, reactions, and favorite moments
- memory recaps such as "one year ago today"
- shared albums per group or recurring tradition

### Future opportunities
- highlight reels and annual summaries
- optional links to external albums
- face clustering or photo organization only if privacy posture is strong enough

## Pillar 6: Notifications And Re-engagement

This pillar keeps the product alive between active sessions.

### MVP
- in-app notification center
- web push notifications where supported
- email fallback for important reminders if user opts in
- notification preferences by type and frequency

### Next phase
- weekly summary email or digest
- grouped notifications to avoid spam
- reminder windows based on time zone and normal usage patterns

### Future opportunities
- smart nudges that reference context like birthdays, trips, or recurring events
- escalation logic when a user keeps snoozing the same reminder

## Pillar 7: Privacy, Consent, And Sharing Controls

This pillar is non-negotiable because relationships are sensitive.

### MVP
- clear privacy defaults
- explicit consent before importing contacts
- decide what is private to the user versus visible to invited participants
- storage access rules for hangouts and photos

### Next phase
- granular visibility controls for notes, photos, and private reflections
- data export and delete controls
- moderation and abuse-reporting flows if the product becomes collaborative beyond friend groups

### Future opportunities
- family-safe sharing modes
- end-to-end encrypted private notes if needed

## Pillar 8: Delight, Warmth, And Retention

This pillar differentiates the app from a plain reminder tool.

### MVP
- warm empty states
- encouraging reminder language
- simple progress indicators like "you've kept up with 4 close connections this month"
- memory resurfacing from prior hangouts

### Next phase
- streaks for recurring traditions used carefully
- milestone recaps and monthly social summary
- celebration prompts for birthdays or special dates

### Future opportunities
- personalized reflection insights
- intelligent coaching on connection habits

## Recommended MVP Focus

The MVP should concentrate on the smallest loop that proves value:
1. add people and groups
2. define cadence
3. get reminded
4. schedule or log a hangout
5. attach lightweight memory context

That loop proves whether the product can change real behavior, which matters more than having a large feature surface early.
