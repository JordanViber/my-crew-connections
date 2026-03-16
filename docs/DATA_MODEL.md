# My Crew Connections Data Model Direction

Date: March 16, 2026

## Overview

This document proposes the core persisted entities needed for the first version of the app.

The data model should support:
- individual relationships
- group relationships
- reminders and cadence rules
- hangout planning and history
- photos and memory context
- private and shared visibility boundaries

## Design Principles

### Separate relationship identity from actual events
A person or group record should remain stable while hangouts and reminders accumulate over time.

### Support both private and shared records
The model should make room for:
- user-private notes or reminder preferences
- shared group and hangout objects
- access-controlled media

### Prefer append-only history where possible
Hangouts, touchpoints, and reminders should be historical records rather than fields that constantly overwrite the past.

## Core Entities

## User
Represents an app account.

### Fields
- id
- display_name
- email or auth provider identity
- profile_photo_url
- timezone
- notification_preferences
- created_at
- updated_at

## Connection
Represents a person the user wants to stay in touch with.

This does not require the person to have an account.

### Fields
- id
- owner_user_id
- linked_user_id nullable
- display_name
- avatar_url
- phone_number nullable
- email nullable
- birthday nullable
- tags array or join table
- preferred_activities summary text or normalized later
- notes_private
- created_at
- updated_at
- archived_at nullable

### Notes
- `owner_user_id` lets one user manage their own view of a relationship.
- `linked_user_id` lets the record connect to a real app user if that person joins.

## Group
Represents a friend group, family group, recurring crew, or shared tradition container.

### Fields
- id
- owner_user_id
- name
- cover_image_url nullable
- description nullable
- default_cadence_rule_id nullable
- created_at
- updated_at
- archived_at nullable

## GroupMembership
Represents membership of users or connection placeholders in a group.

### Fields
- id
- group_id
- user_id nullable
- connection_id nullable
- role such as owner, organizer, member
- joined_at
- removed_at nullable

### Notes
This structure allows groups to exist before every participant joins the app.

## CadenceRule
Represents how often a user wants to reconnect with a person or group.

### Fields
- id
- owner_user_id
- target_type enum person or group
- target_id
- cadence_unit such as days, weeks, months
- cadence_value
- reminder_lead_days nullable
- snoozed_until nullable
- status derived or cached
- created_at
- updated_at

### Future fields
- interaction_type such as message, call, in_person
- flexibility_score
- smart_rule_enabled boolean

## Touchpoint
Represents a lightweight interaction that may or may not be a full hangout.

### Examples
- texted
- called
- caught up briefly
- had coffee

### Fields
- id
- owner_user_id
- target_type enum person or group
- target_id
- touchpoint_type
- occurred_at
- notes nullable
- source enum manual, reminder_action, imported_later
- hangout_id nullable
- created_at

## Hangout
Represents a planned or completed social event.

### Fields
- id
- created_by_user_id
- title
- description nullable
- status enum proposed, scheduled, completed, canceled
- starts_at nullable
- ends_at nullable
- timezone
- location_name nullable
- location_address nullable
- activity_label nullable
- group_id nullable
- created_at
- updated_at

## HangoutParticipant
Represents who was invited or attended.

### Fields
- id
- hangout_id
- user_id nullable
- connection_id nullable
- attendance_status enum invited, accepted, declined, attended
- response_at nullable

## HangoutPhoto
Represents photos tied to a hangout.

### Fields
- id
- hangout_id
- uploaded_by_user_id
- storage_path or external_url
- thumbnail_path nullable
- caption nullable
- visibility enum participants, group_members, private
- created_at

### Notes
The first version should limit count and size aggressively to control cost.

## PlaceHistory
Represents a remembered place or activity context.

### Fields
- id
- owner_user_id
- target_type enum person or group
- target_id
- label
- place_name nullable
- address nullable
- category nullable
- last_used_at
- use_count cached

### Purpose
This makes suggestions easier without needing a heavy recommendation system.

## Invitation
Represents a pending invite to join the app or shared object.

### Fields
- id
- created_by_user_id
- target_type enum app, connection_link, group_membership, hangout
- target_id nullable
- invite_channel enum link, email, sms
- recipient_value nullable
- token
- status enum pending, accepted, expired, revoked
- expires_at
- created_at

## Notification
Represents in-app or outbound reminders and updates.

### Fields
- id
- user_id
- type
- title
- body
- target_type nullable
- target_id nullable
- delivery_channel enum in_app, push, email
- sent_at nullable
- read_at nullable
- acted_at nullable
- created_at

## Suggested Derived Views

The app will likely need efficient server-side queries or materialized views for:
- connections most overdue
- groups with no recent completed hangout
- upcoming hangouts
- recent memories
- frequently used places and activities

## Access Control Model Direction

### Private by default
The safest starting point is:
- private notes belong only to the user who wrote them
- shared hangouts are visible to invited or participating members
- photos inherit hangout or group visibility
- group membership determines access to group-level timelines

### Hybrid sharing model
The product likely needs both:
- personal relationship tracking
- shared group coordination

This means access rules should be designed early rather than bolted on later.

## Data Retention And Cost Considerations

### Photos
- compress on upload
- generate thumbnails
- set per-event and per-user upload caps
- consider quota tiers if storage expands

### Notifications
- avoid storing unnecessary payload history forever
- keep enough data for analytics and auditing

### Contact imports
- store only fields needed for the app experience
- preserve clear delete behavior and consent boundaries

## Open Schema Questions

1. Should one real-world person have multiple connection records per user, or should there be a shared canonical identity model later?
2. Should cadence rules belong only to a user, or can groups eventually have shared cadence ownership?
3. Should photos be stored directly in product storage from day one, or should external album linking be an option in the first release?
4. How much participant response state is necessary before scheduling becomes too complex for MVP?
