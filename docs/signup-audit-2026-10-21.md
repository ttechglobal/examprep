# Student signup audit — 21 October 2026

## Verified database evidence

A read-only query requested the 100 newest profiles and found 27 with student or null role. Eight had no full name, profile email, or profile phone. Auth lookups for those eight confirmed:

| Classification | Count | Evidence |
| --- | ---: | --- |
| Anonymous Auth users | 4 | `is_anonymous = true`; no Auth email or phone |
| Real email signups | 4 | `is_anonymous = false`; `signup_method = email`; email present in Auth, absent from profile |

No student contact details or identifiers are included here. No database changes were made. This is a bounded sample, not a full historical census. Anonymous status is verified; the originating client for each anonymous login is not established by this query.

## Findings

1. **High: anonymous identities appear as registered students.** `src/supabase/migrations/20261006_subscriptions.sql:160` defines `admin_student_rows` from profiles and filters only by role. It does not check Auth anonymous status. The battle challenge client explicitly supports anonymous sign-in (`src/components/battle/ChallengeClient.jsx:61`). The live database confirms anonymous users have student profiles. The original Auth-to-profile trigger definition is not present in the checked-in migrations, so its deployed behavior needs inspection before changing it. Do not remove guest profiles: battle relationships may depend on them.

2. **High: admin contact data can omit the actual login email.** The admin view selects `p.email`, and `shapeStudent` forwards it. Student signup supplies email to Auth but never includes it in the profile upsert. The four real email users above demonstrate this mismatch in the database. Student profile GET already uses `user.email`, explaining why different screens can disagree. A server-only Auth-backed source should supply canonical login contact to admin list, detail, and search; synthetic phone login emails must remain hidden.

3. **Medium: missing names are permitted by design.** `AuthPanel.jsx` asks for phone/email and password only. The server takes a name only from optional guest setup. `destinationAfterAuth` defaults to `/student/home`; guided profile setup exists but is not the default signup destination. A new student can therefore create and use an account without ever supplying a name. Require a name during signup and validate it on the server; existing unnamed accounts need a completion prompt. Email accounts currently do not require a phone, and phone accounts do not require a real email.

4. **High: signup reports success after profile persistence fails.** `src/app/api/auth/signup/route.js` retries a smaller profile upsert, then only logs a second failure and returns `ok: true`. A phone account can consequently have a hidden synthetic login email and no saved profile phone. This is a confirmed code defect, not a verified cause of the eight sampled rows. The phone duplicate lookup also ignores lookup errors and proceeds. Use explicit failure handling, preserve required identity fields through fallback, and clean up newly created Auth users if profile creation cannot complete. Handle cleanup failure explicitly to prevent retry loops and orphan accounts.

5. **Medium: the student signup route has no application rate limit.** It creates already-confirmed users through the service role. The partner signup route already has a rate limiter and fails closed on lookup errors. Add suitable abuse controls to the student route. Review deployed Supabase public signup configuration separately: calling this route the “only way” to create accounts is not enforcement against direct Auth requests.

## Implementation sequence

1. Correct student reporting first: exclude verified anonymous Auth identities from registered-student lists/counts, retain their battle data, and show canonical email/phone from trusted Auth data where profile contact is missing. Audit analytics that independently count profiles. Inspect deployed view and trigger definitions before migration; preserve existing view columns and dependent functions.
2. Repair existing contact data from verified Auth values only. Preview affected counts, normalize phone formats, detect uniqueness conflicts, and update only missing fields. Never invent names or infer a real email from the synthetic phone domain. Do not delete these eight accounts.
3. Tighten signup: require a name, persist name and contact reliably, stop on duplicate lookup failures, return success only after required profile fields are saved, and add explicit rollback/cleanup handling and rate limiting. Keep optional subject setup separate from required identity.
4. Add focused regression coverage for email/phone signup, guest migration, missing name, duplicate checks and lookup errors, profile write and cleanup failures, anonymous exclusion, canonical contact display/search, and concurrent duplicate phone creation. Verify list/count/detail agreement and successful battle guest upgrade.

Acceptance: each registered-student row maps to a non-anonymous Auth identity and displays at least its actual signup contact. New accounts also have a validated name. Anonymous battle play continues to work without increasing registered-student counts. Existing missing names are visibly classified as incomplete setup, not silently fabricated.

## Implementation follow-up

The local implementation now requires a signup name, stores the login email and normalized phone with the profile, stops on failed duplicate checks, cleans up a newly created login if required profile persistence fails, and applies the existing per-instance rate limiter. The admin table displays email as well as phone. The migration `20261021_student_identity.sql` sources canonical email from Auth and classifies anonymous identities separately; the registered-student filters exclude them, while a new Anonymous Guests filter shows their count, ID and first-seen date. These are identities, not a reliable count of unique people. Guest data is retained.

The checked-in onboarding page still passes `onGuest` to the auth form, exposing Continue as guest. Battle invitations independently call anonymous sign-in. This work preserves those entry paths while making their identities visible; it does not establish which client created each existing anonymous identity. Device-only practice guests do not necessarily create database identities and are outside this count.

Rollout: apply `src/supabase/migrations/20261021_student_identity.sql` first, then deploy the application changes together. Existing email accounts become visible through the canonical Auth-backed read without copying personal data into more profile rows. No destructive cleanup or backfill is needed for the observed email records. Run `src/supabase/tests/student_identity_test.sql` after migration to verify classification, contacts, counts and permissions. The migration and SQL assertions have not been run against the remote database; the configured environment supplies API credentials, with no database connection credential. Production account data has not been changed.

Existing unrelated admin school-device work was left untouched.

Validation: 22 focused tests passed across student signup, partner signup and admin identity shaping; lint passed for changed application files. SQL assertions are provided but unexecuted. The production build was stopped after remaining at compilation for several minutes without completion, so a production build is still required before rollout.
