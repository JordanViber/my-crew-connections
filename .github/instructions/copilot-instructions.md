# Copilot Instructions

## Release Gate (Required)

Before pushing or deploying, always run:

1. `cd client`
2. `npm run test:coverage`
3. `npm run test:e2e`

Only push/deploy when both commands pass.

If tests fail:

1. Fix failures first.
2. Re-run both test suites.
3. Then push and deploy.

## Deployment Flow

When tests pass:

1. Push branch changes.
2. Apply pending Supabase migrations if needed.
3. Deploy to production.
4. Report deployed URL and verification checks.
