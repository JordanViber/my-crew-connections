# Client App

This directory contains the Next.js app for My Crew Connections.

## Local Setup

1. Start the local Supabase stack from the repository root:

```bash
bash ./scripts/supabase-start.sh
```

2. Sync the app env file from the running stack:

```bash
bash ./scripts/supabase-sync-env.sh
```

3. Install dependencies and start the app from this directory:

```bash
npm install
npm run dev
```

4. Open `http://127.0.0.1:3100`.

## Useful Scripts

- `npm run dev` starts the app on port `3100`
- `npm run build` builds the production bundle
- `npm run lint` runs ESLint
- `npm run test` runs the Vitest suite
- `npm run test:e2e` runs the Playwright suite

## Current Product Surface

The app currently includes:
- landing, auth, dashboard, people, groups, invite, and auth callback routes
- password sign-in plus email code authentication with link fallback
- people and group management with cadence tracking
- reminder-oriented dashboard summaries
- touchpoint history and hangout planning
- ICS export for saved plans
- invite-link based relationship linking with push-first delivery and explicit stale-link states

## Notes

- The app expects a generated `.env.local` file in this directory.
- `supabase db reset --local` will wipe local users and data; after a reset, create your local account again from the auth screen.
