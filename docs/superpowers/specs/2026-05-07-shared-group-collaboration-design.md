# Shared Group Collaboration Design

Date: 2026-05-07

## Goal

Make accepted groups feel like shared spaces after invite acceptance without replacing the current owner-centered relationship model.

The next implementation slice should let accepted members participate meaningfully while keeping destructive and billing-sensitive controls conservative.

## Chosen Approach

Use role-aware shared groups.

- `owner` owns group settings, cadence, member management, archive, and plan management.
- `organizer` can manage group plans but cannot edit settings, archive the group, or manage members in this slice.
- `member` can view the shared group, log shared group touchpoints, propose group hangouts, RSVP to proposals, and export accepted plans.
- pending invitees cannot see group details until they accept.

## Privacy Rules

Private connection notes, tags, and one-on-one relationship metadata remain private to their owner. Shared group surfaces may show group name, group description, accepted member display names, pending invite counts, group touchpoints, hangout proposal details, and RSVP status.

The implementation should avoid requiring broad member access to another user's private `connections` rows. Server-shaped data and explicit shared display fields are preferred over exposing private connection detail.

## Data And Permission Model

The existing `group_memberships.role` field remains the role source. Accepted access is based on an active membership row with `user_id = auth.uid()` and `removed_at is null`; a linked connection placeholder alone is not consent.

Group plan creation should be allowed for any active member. Plan confirmation, cancelation, and completion should be allowed for group owners and organizers. Group settings, cadence, member additions, and archive should remain owner-only.

RLS should mirror the app-level rules for future direct Supabase access:

- group members can select shared group records
- group members can select shared group hangouts and touchpoints
- group members can insert their own group touchpoints and proposals
- owners/organizers can update shared group hangouts
- owner-only policies remain for settings, cadence writes, membership writes, and archive

## UX Scope

Use existing group detail tabs and plan cards.

- Owners see the current management controls.
- Organizers should be able to keep/delete/complete group plans.
- Members should see settings as read-only, keep membership lists read-only, and see a "Propose hangout" path.
- Member-created proposals should notify the rest of the accepted group.

No new role-management UI is required in this slice. Existing roles should be respected if present in the database.

## Notification Touchpoints

- group invite created: notify invited user
- group invite accepted or declined: notify the group owner
- group proposal created: notify accepted group members except the proposer
- proposal accepted: notify proposer and group managers
- proposal confirmed/canceled/completed: keep in-app state consistent; outbound delivery can remain follow-up work

## Testing

Add focused unit coverage for role capability rules and dashboard shaping. Update Playwright coverage so a non-owner accepted member can propose a group hangout, the owner can see and confirm it, and the member cannot edit group settings.

Verification for this slice:

- `npm run test`
- `npm run lint`
- targeted Playwright coverage for the shared group proposal flow
