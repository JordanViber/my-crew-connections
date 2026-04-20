# My Crew Connections User Flows

Date: April 19, 2026

## Overview

This document outlines the primary user flows the app should support and notes where the localhost product already matches that direction.

## Flow 1: First-Time Onboarding

### Goal
Get the user to value quickly without a heavy setup process.

### Current direction
1. User lands on a warm onboarding or auth surface that explains the value proposition in plain language.
2. User creates an account or signs in.
3. App encourages the user to add at least 1 person or 1 group.
4. For each person or group, the app asks:
   - how often would you like to see or check in with them?
   - what do you usually like to do together?
5. App generates the initial home view showing:
   - people or groups that need attention soon
   - upcoming plans
   - recent memories if any

## Flow 2: Add A New Person

### Goal
Make it easy to start tracking a relationship.

### Current direction
1. User taps add person.
2. People screen defaults to the active directory so the user sees current relationships first.
3. User chooses add person when they actually want to create someone new.
4. User enters name.
5. User adds cadence and optional reminder lead.
6. User can optionally add preferred activities and notes.
7. User can optionally add an email and start the invite to a real app account during creation.
8. The new person appears in the connections list with an initial status and no history yet.
9. The people directory can later be searched and filtered by link state so the app still feels manageable as the list grows.

## Flow 3: Create A Group

### Goal
Support friend groups and recurring traditions.

### Current direction
1. User taps create group.
2. User enters group name and optional description.
3. User searches existing people and checks the ones who belong in the group.
4. User can later link those people to real app users.
5. User selects cadence such as monthly dinner or every 6 weeks.
6. Group workspace shows:
   - members
   - last interaction
   - next suggested planning date
   - memory timeline

### Current product choice
Groups should exist even when only one organizer has the app. The current localhost implementation treats groups as containers built from connection records first, with deeper collaboration layered in later.

## Flow 4: Reminder To Reconnect

### Goal
Convert reminder energy into a concrete action.

### Current direction
1. App detects a person or group is nearing or past cadence.
2. User sees an in-app reminder on the dashboard.
3. Reminder offers clear actions:
   - log a touchpoint
   - plan a hangout
   - open the relationship detail page
4. If the user chooses plan a hangout, the app opens a lightweight planning screen with suggestions based on history.
5. If the user chooses log, the app can record a touchpoint with minimal friction.

## Flow 5: Plan A Hangout

### Goal
Make planning feel lightweight and finishable.

### Current direction
1. User starts from a person, group, or reminder.
2. App opens create hangout.
3. User enters:
   - title or occasion
   - date and time
   - location or activity
   - optional note
4. User saves the hangout as a persisted plan.
5. App offers:
   - generate ICS file
   - return to the relationship detail page
   - later share or notify linked participants

## Flow 6: Confirm And Record The Hangout

### Goal
Close the loop after the event happens.

### Current direction
1. After the hangout date passes, the app should prompt the user to confirm it happened.
2. User can update details if plans changed.
3. User logs:
   - actual date and time
   - place or activity
   - short note
4. The app updates:
   - last interaction date
   - activity history
   - reminder state
   - place and suggestion history

## Flow 7: Browse A Person Or Group Timeline

### Goal
Make the app emotionally meaningful, not just functional.

### Current direction
1. User opens a person or group detail view.
2. App displays:
   - relationship summary
   - preferred cadence
   - next suggested reconnect window
   - history of hangouts and touchpoints
   - favorite activities and places
3. User can quickly start the next plan from this view.

## Flow 8: Invite Others To The App

### Goal
Add collaboration without requiring it for basic value.

### Current direction
1. User starts from connection creation or taps invite from a connection detail page.
2. App shows whether the connection is already linked, has a pending invite, or has no invite started yet.
3. App generates a share link tied to a specific connection when invited.
4. Recipient installs or opens the app.
5. Recipient signs in or creates an account.
6. Recipient claims the invite.
7. The original connection links to the real user account.
8. A reciprocal connection is created or reused on the recipient side.
9. Deeper shared spaces can layer in later.

### Permission guidance
Private notes should remain private by default. Current invite claiming links users, but it does not yet make groups or private notes broadly shared.

## Most Important MVP Loop

The core loop to optimize first is:
1. add a person or group
2. set cadence
3. receive reminder
4. schedule or log a hangout
5. remember the experience
6. repeat

If this loop feels effortless and emotionally rewarding, the product has a strong foundation.
