# My Crew Connections Data Model Direction

Date: April 19, 2026

## Overview

This document proposes the core persisted entities needed for the first version of the app and records the shape of the current localhost implementation.

The data model should support:
- individual relationships
- group relationships
- reminders and cadence rules
- hangout planning and history
- private and shared visibility boundaries

## Current Localhost Snapshot

The implemented localhost app currently centers on:
- `connections` owned by one user and optionally linked to a real app user through `linked_user_id`
- `groups` built primarily from connection membership records
- `cadence_rules` for both connections and groups
- `touchpoints` for logged interactions
- `hangouts` for saved plans and exported ICS events
- `connection_invites` for claimable linking between a connection and a real user account

## Design Principles

### Separate relationship identity from actual events
A person or group record should remain stable while hangouts, touchpoints, and reminders accumulate over time.

### Support both private and collaboration-ready records
The model should make room for:
- user-private notes or reminder preferences
- shared group and hangout objects later
- invite-based linking between personal records and real users

### Prefer append-only history where possible
Hangouts, touchpoints, and reminders should be historical records rather than fields that constantly overwrite the past.

## Core Entities

## User
Represents an app account.

### Fields
- id
- display_name
- email or auth provider identity
- timezone
- created_at
- updated_at

## Connection
Represents a person the user wants to stay in touch with.

### Fields
- id
- owner_user_id
- linked_user_id nullable
- display_name
- email nullable
- preferred_activities nullable
- notes_private nullable
- created_at
- updated_at
- archived_at nullable

### Notes
- `owner_user_id` lets one user manage their own view of a relationship.
- `linked_user_id` lets the record connect to a real app user if that person joins.
- reciprocal connections can exist on both sides rather than requiring one shared canonical relationship row.

## Group
Represents a friend group, family group, recurring crew, or shared tradition container.

### Fields
- id
- owner_user_id
- name
- description nullable
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
- role
- joined_at
- removed_at nullable

### Notes
This structure allows groups to exist before every participant joins the app.
The current localhost product treats groups as connection-first rather than fully shared collaborative objects.

## CadenceRule
Represents how often a user wants to reconnect with a person or group.

### Fields
- id
- owner_user_id
- target_type enum person or group
- target_id
- cadence_unit
- cadence_value
- reminder_lead_days nullable
- created_at
- updated_at

## Touchpoint
Represents a lightweight interaction that may or may not be a full hangout.

### Fields
- id
- owner_user_id
- target_type enum person or group
- target_id
- occurred_at
- notes nullable
- activity nullable
- location nullable
- created_at

## Hangout
Represents a saved or completed social plan.

### Fields
- id
- owner_user_id
- target_type enum person or group
- target_id
- title
- starts_at nullable
- ends_at nullable
- location nullable
- notes nullable
- status enum planned, completed, canceled
- created_at
- updated_at

### Current use
Saved hangouts power planning history and ICS export without needing an external calendar provider.

## ConnectionInvite
Represents a pending invite to link a connection to a real user account.

### Fields
- id
- connection_id
- owner_user_id
- invited_email
- token
- status enum pending, accepted, expired, revoked
- claimed_by_user_id nullable
- accepted_at nullable
- expires_at
- created_at

### Current behavior
- owner creates an invite from a connection detail page
- recipient signs in or creates an account
- invite claim links the owner's connection to the recipient account
- invite claim also creates or reuses a reciprocal connection for the recipient

## Notification
Represents in-app or outbound reminders and updates.

### Current state
Reminder surfacing exists in-app today. Dedicated persisted notification delivery records can be added later if push or email delivery becomes a priority.

## Access Control Model Direction

### Private by default
The safest starting point is:
- private notes belong only to the user who wrote them
- invite linking does not automatically expose private notes
- shared group visibility should be added deliberately rather than implied by a user link

## Open Schema Questions

1. Should linked users eventually share a canonical relationship identity, or should reciprocal per-user connections remain the core model?
2. Should groups evolve from connection-based membership into first-class shared groups for linked users?
3. Should saved hangouts eventually support participant response state, or stay organizer-owned until collaboration deepens?
4. Should photos be stored directly in product storage, or should external album linking remain the lighter option?
