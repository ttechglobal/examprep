# Desktop schools: registration, activation and usage

Desktop schools are independent of web school accounts, passwords, individual
student profiles and Premium student slots. The existing desktop registry groups
computers by the same normalized school email; details are self-reported and
approval remains an admin decision. Entering a school's name alone is not proof
that two registrations belong together. Review duplicates before verifying a
school or awarding its complimentary allowance.

On each computer, staff enter the same school details and a different computer
number (001, 002, etc.). The database enforces uniqueness of school + computer
number, while activation is bound to the computer's cryptographic identity.
Copying the label 001 does not transfer access. The default two complimentary
places remain allocated after expiry or revocation; paid approvals consume
confirmed purchase places. Offline/free limited access does not imply approved
full access. The existing replacement workflow transfers remaining access.

## Web dashboard

`/admin/school-devices` is labelled **Schools (Desktop)**, separately from
**Schools (Web)** in the sidebar. The overview has school/computer totals,
activation requests, pending work and links to dedicated Schools, Computers,
Payments and Usage views. Computer and payment management opens in side panels,
with replacement controls collapsed until needed. Existing verification, payment, approval, renewal,
revocation and replacement controls remain. The registry shows contact details,
registered computers and complimentary allocation. Usage adds:

- Last 7, 30 or 90 Lagos calendar days, including today.
- Completed practice/computer-battle sessions and questions actually answered.
- Computers reporting practice, feedback report counts and feedback reasons.
- Per-device last practice date and last usage upload date.
- The separate activation-service contact date.

These are device-reported sessions, not unique students or billing evidence.
No student names or individual answers are uploaded through this interface.
Missing reports are shown as **No report yet**, not proof of inactivity. Offline
activity becomes visible after the desktop client uploads it. Future-dated
events are excluded from summaries until their date arrives.

## Deployment order

1. Existing desktop backend: `app/backend/20261021_school_device_activation.sql`.
2. Existing desktop backend: `app/backend/20261021_school_purchase_requests.sql`.
3. This repository: `src/supabase/migrations/20261022_desktop_school_usage.sql`.
4. Deploy this web application, including the usage endpoint. The dashboard
   degrades gracefully if the usage migration is missing; activations still work
   when their own migrations are deployed.
5. Connect and distribute the desktop uploader described below. These web
   changes do not make existing desktop builds upload activity automatically.

The owner reports that the desktop-school migrations have been applied to the
shared Supabase project. The dashboard layout redesign needs no additional SQL.
The live-play guard is a separate existing desktop deployment requirement,
unchanged here.

## Desktop integration contract

Endpoint: `POST https://www.examprepa1.online/api/desktop-school/usage`.
This is separate from the activation Edge Function. Do not add usage to the old
activation endpoint without coordinating its action whitelist and migration.

First send JSON `{ "action": "challenge", "device_id": "<device identity hash>" }`.
It returns `{ "ok": true, "nonce": "<uuid>" }`.

Build this UTF-8 JSON payload, using the existing Windows school device key:

```json
{
  "version": 1,
  "action": "usage",
  "nonce": "<challenge uuid>",
  "device": {
    "device_id": "<existing identity hash>",
    "public_key": "<base64url P-256 public key>",
    "fingerprint": "<base64url fingerprint>"
  },
  "input": {
    "app_version": "1.0.0+1",
    "events": [
      {
        "event_id": "<existing stable completed-session UUID>",
        "event_type": "practice",
        "occurred_at": "2026-10-21T12:00:00Z",
        "questions_answered": 5,
        "duration_seconds": 120
      }
    ]
  }
}
```

Sign those exact bytes with ECDSA P-256 / SHA-256. Send JSON:
`{ "action": "execute", "payload": "<base64url bytes>", "signature": "<base64url 64-byte signature>" }`.
Use `Content-Type: application/json`. No school login, password, student token,
service-role key or licence signing key belongs in this uploader.

Successful replies include `ok`, `server_time` and `accepted` entries containing
`event_id` and `event_type`. Persist acknowledgement only after success. Every
retry gets a fresh nonce. Duplicate event IDs are acknowledged but never
counted twice; changing a previously accepted event does not overwrite it.
An empty event list can report connectivity without fabricating practice.

Accepted event types:

- `practice`: one completed local practice session, regardless of whether the
  student saved a leaderboard name. Count actual submitted answers, not the
  number of questions offered. Use the real elapsed seconds, bounded to 86,400.
- `computer_battle`: one completed local computer battle, using its stable UUID.
- `feedback`: a local question-report UUID, with zero answers/seconds and a
  `feedback_reason` of Wrong answer, Wrong explanation, Unclear question,
  Missing diagram or Other. No names, free-text comments or question content.

Keep a durable local outbox/acknowledgement table for retries. Backfill completed
local attempts and feedback with stable IDs, then upload at startup, after
completion and periodically while connected. Use one uploader at a time and
back off on failures. Limit requests to 100 events, 32 KB decoded payload and
48 KB outer JSON; split smaller batches when needed. Never hold up local
practice, results or activation because telemetry failed. Fixture/demo data
must not be reported as production use. Retain local unacknowledged events
until upload succeeds. Desktop-client implementation is a coordinated follow-up
in the separate app checkout, which is currently being edited by its own chat.

## Verification

`node --test tests/school-usage.test.mjs tests/school-usage-sql.test.mjs`

The SQL integration test uses the desktop checkout's existing isolated PGlite
validation dependency and real activation migration. Set `DESKTOP_BACKEND_DIR`
if that checkout is elsewhere. It tests migration reruns, enrollment, one-use
nonces, signed-device binding, duplicate uploads, immutable event counters,
feedback validation, dates, counts and anonymous/authenticated permission denial.
It never creates production accounts or records.
