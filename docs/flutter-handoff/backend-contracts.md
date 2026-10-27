# Backend and rule integration handoff

Source evidence is provided to prevent guessing. These are existing web implementations, not a finished native-client API specification.

## Existing integration map

| Area | Reference inside PWA snapshot | Follow-up |
| --- | --- | --- |
| Authentication | `src/lib/auth/*`, `src/lib/supabase/*`, `src/app/api/auth/*` | Specify native auth, token refresh, server authorization, referral/deep-link behavior. |
| Profiles and subjects | `src/app/api/student/profile/route.js`, `subjects/route.js`, `src/lib/profileSetup.js` | Preserve current fields; define local edits and conflict behavior. |
| Questions | `src/app/api/student/questions/route.js`, pool/server helpers | Existing practice selection is not a downloadable immutable pack API. Define catalog/export/versioning contracts. |
| Session sync | `src/app/api/student/questions/session/save/route.js`, `src/lib/localSessionSync.js` | Preserve server answer checking and idempotency; define native credentials and versioned answer references. |
| XP and marking | `src/lib/xp.js`, `src/lib/answers.js`, `src/lib/battleRound.js` | Port domain logic and compare shared test vectors. |
| Access rules | `src/lib/plans.js`, `src/contexts/PlanContext*` | Preserve product policy; settle offline entitlement validation and counters. |
| Flashcards/formulas | Student flashcard API, admin formula API, learning hooks/components | Design authorized read/export contracts; do not give native clients admin privileges. |
| Rankings/progress | `src/app/api/leaderboard/*`, student mastery/activity/events APIs | Specify durable snapshots, deltas, aggregation, and local/server reconciliation. |
| Live battle | Battle APIs, hooks, Supabase migrations/tests | Verify native realtime authentication, reconnect, invitation and match lifecycle. |
| School setup | `src/app/api/school/signup/route.js`, school setup and auth references | Existing web subscription/roster model differs from unrestricted shared installation mode. |
| Data schema | `src/supabase/migrations`, SQL tests | Inspect deployed schema; files alone do not establish which migrations are applied. |

## Known rules

For saved practice/mock/computer sessions, `src/lib/xp.js` grants 5 XP per correct answer, plus 10 for a computer-battle win or 5 for a draw. Live 1v1 uses separate existing SQL rates: 10 per correct, plus 20 for a win or 10 for a draw; the current web display matches those rates. The server session-save route rechecks selected options, computes XP, and uses a stable session ID to prevent duplicate awards. Preserve this validation boundary. See `question-rendering-update-2026-10-26.md` for the current rendering, offline-media and review requirements; older source snapshots may lack them.

The PWA's local queue/history have fixed limits; those are reference implementation details, not acceptable permission to discard unsynced native results. Use durable outbox storage.

Server-only Supabase service-role clients exist in the source. Their implementation must stay server-side. The package intentionally excludes actual `.env` files and keys. Public-client configuration and redirect/deep-link registration are still needed separately during implementation.

## Proposed contract design work

Before coding integration, write request/response schemas and errors for:

1. Native session authentication and refresh, account/profile reads and writes.
2. Pack catalog and immutable manifests/files with authorized access, integrity metadata, and compatibility versions.
3. Offline result batch upload with account scope, session IDs, answer/content versions, acknowledgements, and recoverable rejection states.
4. Leaderboard/progress fetches with snapshot timestamps and reconciliation cursors where appropriate.
5. School installation setup/capabilities independent of individual paid seats.

These endpoints are proposed responsibilities, not claims that matching routes already exist. Retain backwards compatibility with the live PWA; deploy no schema/API changes as part of handoff preparation.
