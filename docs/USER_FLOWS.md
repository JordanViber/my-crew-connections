# My Crew Connections User Flows

Date: March 16, 2026

## Overview

This document outlines the primary user flows the first version of the app should support.

## Flow 1: First-Time Onboarding

### Goal
Get the user to value quickly without a heavy setup process.

### Proposed flow
1. User lands on a warm onboarding screen that explains the value proposition in plain language.
2. User creates an account.
3. App asks a short setup question such as: "Who do you most want to stay in touch with?"
4. User chooses one of the following:
   - add people manually
   - create a group
   - import selected contacts
5. App encourages the user to add at least 3 people or 1 group.
6. For each person or group, the app asks:
   - how often would you like to see or check in with them?
   - what do you usually like to do together?
7. App generates the initial home view showing:
   - people or groups that need attention soon
   - upcoming plans
   - recent memories if any

### Design guidance
- keep onboarding under 2 minutes
- do not require contact import
- show progress and immediate benefit

## Flow 2: Add A New Person

### Goal
Make it easy to start tracking a relationship.

### Proposed flow
1. User taps add person.
2. User enters name and optional photo.
3. User adds relationship tags such as close friend, family, work friend, local, long-distance.
4. App asks for preferred cadence.
5. App optionally asks:
   - what do you usually like to do together?
   - any important context to remember?
6. User can optionally send an invite to join the app.
7. The new person appears in the connections list with an initial status and no hangout history yet.

## Flow 3: Create A Group

### Goal
Support friend groups and recurring traditions.

### Proposed flow
1. User taps create group.
2. User enters group name and optional cover image.
3. User adds existing people or creates placeholders for people not yet on the app.
4. User selects cadence such as monthly dinner or every 6 weeks.
5. App optionally asks about typical activity types.
6. Group workspace shows:
   - members
   - last hangout
   - next suggested planning date
   - memory timeline

### Important product choice
Groups should exist even when only one organizer has the app. Full collaboration can layer in later.

## Flow 4: Reminder To Reconnect

### Goal
Convert reminder energy into a concrete action.

### Proposed flow
1. App detects a person or group is nearing or past cadence.
2. User receives a push, email, or in-app reminder.
3. Reminder offers clear actions:
   - send a quick check-in
   - plan a hangout
   - snooze
   - mark as handled
4. If the user chooses plan a hangout, the app opens a lightweight planning screen with suggestions based on history.
5. If the user chooses mark as handled, the app can log a touchpoint with minimal friction.

### Design guidance
- reminders should feel helpful, not shame-based
- action buttons should be one tap when possible

## Flow 5: Plan A Hangout

### Goal
Make planning feel lightweight and finishable.

### Proposed flow
1. User starts from a person, group, or reminder.
2. App opens create hangout.
3. User enters:
   - title or occasion
   - date and time
   - location or activity
   - attendees
   - optional note
4. App shows suggestions:
   - recent places
   - favorite activities
   - recurring traditions
5. User saves the hangout.
6. App offers:
   - generate ICS file
   - share summary with friends
   - notify linked participants in-app

### Calendar note
ICS is the safest MVP approach because it is broadly supported by Apple Calendar, Google Calendar, and Outlook. It will not feel as seamless as deep native integration, but it offers the best compatibility early.

## Flow 6: Confirm And Record The Hangout

### Goal
Close the loop after the event happens.

### Proposed flow
1. After the hangout date passes, the app prompts the user to confirm it happened.
2. User can update details if plans changed.
3. User logs:
   - actual date and time
   - place or activity
   - short note
   - who attended
4. User optionally uploads photos.
5. The app updates:
   - last hangout date
   - activity history
   - reminder state
   - place and suggestion history

### Design guidance
Keep post-event logging very lightweight. It should take less than a minute for the minimal version.

## Flow 7: Browse A Person Or Group Timeline

### Goal
Make the app emotionally meaningful, not just functional.

### Proposed flow
1. User opens a person or group detail view.
2. App displays:
   - relationship summary
   - preferred cadence
   - next suggested reconnect window
   - history of hangouts and touchpoints
   - photos and favorite memories
   - favorite activities and places
3. User can quickly start the next plan from this view.

## Flow 8: Invite Others To The App

### Goal
Add collaboration without requiring it for basic value.

### Proposed flow
1. User taps invite on a person or group.
2. App generates a share link or invitation message.
3. Recipient installs or opens the app.
4. Recipient accepts shared connection or group membership.
5. Shared spaces become visible based on permissions.

### Permission guidance
Private notes should remain private by default. Shared hangouts and shared photos should be visible only to participants or explicit group members.

## Flow 9: Contact Import

### Goal
Help users populate the app faster while keeping trust high.

### Proposed flow
1. App asks for contact permission with a clear explanation.
2. User sees a selective import list instead of auto-importing everyone.
3. App suggests favorites, recent contacts, or starred people first.
4. User picks who matters.
5. App creates draft connections for selected people.
6. User sets cadence only for the ones they care about most now.

### Design guidance
Import should support momentum, not create a giant messy address book.

## Flow 10: Shared Memory Viewing

### Goal
Give users a reason to return beyond reminders.

### Proposed flow
1. User opens a completed hangout.
2. User sees photos, notes, participants, and activity details.
3. Participants with access can view the shared memory entry.
4. App may later surface this memory again in a recap or anniversary moment.

## Most Important MVP Loop

The core loop to optimize first is:
1. add a person or group
2. set cadence
3. receive reminder
4. schedule or log a hangout
5. remember the experience
6. repeat

If this loop feels effortless and emotionally rewarding, the product has a strong foundation.
