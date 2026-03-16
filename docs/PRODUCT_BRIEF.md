# My Crew Connections Product Brief

Date: March 16, 2026

## Product Summary

My Crew Connections is a relationship-maintenance PWA that helps people stay in touch with the people they care about.

The product should reduce the gap between:
- "I care about this person or group"
- and "I actually reached out, made plans, showed up, and preserved the memory"

It should feel warm, lightweight, and low-pressure rather than clinical or productivity-heavy.
The product is not a generic CRM for friendships. It is a personal and shared social coordination tool that helps people maintain real-world connection.

## Core Problem

People often lose touch not because they do not care, but because:
- life becomes busy
- friendships are distributed across different apps and calendars
- remembering when you last saw someone is hard
- making plans takes initiative and coordination energy
- good intentions rarely turn into a concrete next step

Groups have a similar problem:
- everyone assumes someone else will organize
- recurring traditions fade without a system
- scheduling overhead kills momentum
- photos and memories end up scattered across text threads and personal camera rolls

## Product Thesis

If we make it easy to:
- track who matters
- remember how long it has been
- set a healthy cadence
- turn reminders into actual plans
- preserve the memory after the hangout

then users will maintain more of the relationships they value.

The app should create a full loop:
1. identify people and groups that matter
2. set or learn how often you want to connect
3. get nudged when the relationship needs attention
4. make a concrete plan
5. capture what happened
6. use that history to make the next connection easier

## Primary Users

### 1. Busy adults maintaining friendships
People who genuinely care about their friends but struggle to remember when to reach out.

Examples:
- long-distance friends
- college friend groups
- parents trying to maintain adult friendships
- people who are highly social but scattered

### 2. Small friend groups with recurring traditions
Groups that want to keep meeting consistently.

Examples:
- monthly dinner groups
- workout buddies
- family friend circles
- hobby groups
- neighborhood crews

### 3. Organizers in a social group
The person who always ends up planning and wants less friction.

Examples:
- the group chat planner
- the person who books brunch, hikes, or game night
- the friend who remembers birthdays and follow-ups

## Jobs To Be Done

Users hire this product to:
- remember who they want to stay close to
- avoid accidentally letting months pass without contact
- maintain individual friendships and group traditions
- make it easier to turn a reminder into a scheduled hangout
- remember what they usually like to do with a person or group
- keep a lightweight history of shared experiences
- relive moments through photos and notes

## Product Principles

### Relationship-first, not task-first
The app should support care, memory, and consistency. It should not feel like a business CRM.

### Low-pressure and emotionally safe
Reminders should feel encouraging, not guilt-inducing.

### Actionable over archival
Every important screen should help the user take the next step, not just browse old data.

### Shared where useful, private where necessary
Some things should be private to the user. Some things should be collaborative for a group.

### Simple enough for casual use
The app should work even if a user logs one touchpoint a month.

### Better with history
The more touchpoints, hangouts, and photos the app accumulates, the better its reminders and suggestions should become.

## MVP Scope

### Must-have capabilities
- create an account and basic profile
- add people manually and optionally invite them to the app
- create groups and manage membership
- define desired cadence for a person or group
- see when you last connected or hung out
- receive reminders when the cadence is overdue or at risk
- log a hangout or touchpoint
- schedule a hangout and export it to calendar
- upload a few photos tied to a hangout
- browse simple history for a person or group

### Should-have capabilities
- contact import with clear consent and selection controls
- push notifications with granular preferences
- place/activity suggestions based on prior hangouts
- prompt the user for preferred activities when adding a person or group
- shared hangout details visible to participants

### Explicit MVP non-goals
- deep social feed features
- public discovery of strangers
- full-blown messaging platform replacement
- complex AI features that require large cost before product fit is proven
- unlimited media storage
- automatic scraping of private communication channels

## Potential Product Shape

The app likely needs two primary surfaces.

### 1. Connections workspace
A home surface for:
- people and groups
- cadence health
- overdue relationships
- suggested next actions
- upcoming plans

### 2. Hangout and memory surface
A surface for:
- planning a hangout
- logging what happened
- attaching photos
- noting activities and favorite places
- building a lightweight memory timeline

## Suggested Feature Areas

### Relationship graph
- people list
- groups list
- shared group membership
- relationship tags such as family, close friends, local, long-distance, hobby, work friend

### Cadence and reminders
- desired frequency by person or group
- reminder windows such as gentle, overdue, urgent
- snooze or mark as reached out
- separate cadence for message vs in-person hangout if needed later

### Planning and scheduling
- suggest a next hangout
- propose a time and place
- generate an ICS file for broad calendar compatibility
- later add direct integrations for Google Calendar and Apple Calendar workflows

### Memory and context
- last hangout date
- activity history
- favorite places
- notes about preferences
- photos from a hangout

### Intelligence layer over time
- suggest who has gone longest without contact
- suggest activities based on history
- suggest recurring traditions
- identify people who are slipping unintentionally

## Additional Product Ideas To Explore

These are strong candidates beyond the initial idea set.

### Important dates and context
- birthdays
- anniversaries
- annual traditions
- trip countdowns
- reminders before meaningful dates

### Conversation and outreach assistance
- gentle outreach prompts
- suggested check-in text starters
- note the last major life update so future outreach feels personal

### Relationship preferences
- ask or infer preferred activities
- indoor vs outdoor
- budget sensitivity
- kid-friendly vs adults-only
- weekday vs weekend preference

### Group rituals
- monthly dinner tradition templates
- recurring hike, book club, or game night cadences
- rotating organizer support

### Personal reflection
- private notes after a hangout
- how connected the user felt
- whether to increase or decrease cadence

### Shared albums with limits
- lightweight shared memory capsule per hangout
- capped uploads per event to control storage cost
- optional external album link support later

## Success Metrics

### Activation metrics
- users who add at least 3 people or 1 group
- users who set at least 1 cadence rule
- users who log or schedule their first hangout

### Engagement metrics
- percentage of reminders that lead to action
- number of logged hangouts per active user
- number of recurring groups retained month over month
- number of overdue relationships brought back into contact

### Retention metrics
- week 4 and month 3 active retention
- proportion of users with active cadence rules after 30 days
- recurring usage of memory history and photo viewing

## Key Product Risks

- too much setup friction before users feel value
- reminders feeling nagging or guilt-heavy
- collaboration complexity making permissions confusing
- storage costs for photos growing faster than value
- calendar and push behavior being inconsistent across platforms
- contact import feeling invasive or unsafe

## Core Open Questions

1. Is the first target user primarily an individual maintaining friendships, or a shared group space used by multiple people together?
2. Should the first version optimize more for reminders and planning, or for memory capture and reliving past hangouts?
3. How much collaboration should exist before all participants have accounts?
4. Should activity suggestions be rule-based first or AI-assisted later?
5. How much photo functionality is enough for MVP before cost and moderation become a burden?
