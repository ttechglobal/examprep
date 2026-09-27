# Push notifications + new Supabase API keys — 27 Sep 2026

Goes with `supabase/migrations/20261001_notifications.sql` and the code listed at the end.

## Why

- **Nobody ever received a notification.** The live app was built without `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, so tapping
  Enable returned before the browser was even asked: 0 devices were ever saved. Separately, all six hand-made
  reminder jobs were broken (placeholder URLs, a database setting that doesn't exist, a key sent without "Bearer").
- **The legacy `service_role` key leaked** (it was stored in plain text in one of those jobs, and was printed in a
  support chat). A legacy key can't be rotated on its own: the fix is to move to the new keys
  (`sb_publishable_…` / `sb_secret_…`) and then **deactivate the legacy keys**.
- **Admin logins could be forged with that key** when `ADMIN_SESSION_SECRET` was unset (the signing secret fell
  back to the service key). Tested: a cookie signed with the service key was accepted.

## Deploy order

Follow **`UPDATE_GUIDE.md`** — it covers this change and the 1v1 fixes in one sequence. (The six old
reminder jobs and their run history are now removed by `20261001_notifications.sql` itself; no separate
clean-up script.)

## What changed

| Area | Change | Files |
|---|---|---|
| Device registration | The browser's prompt is only asked from a tap; a missing VAPID key shows "Not available" and logs an error instead of silently doing nothing. "On" now means *saved on the server*, not just allowed. Every app open with permission granted re-saves the device, so a failed save, a renewed subscription or new VAPID keys fix themselves. New "Needs attention → Try again" state | `hooks/usePushSubscription.js`, `components/student/profile/sheets.jsx`, `app/student/profile/page.js`, `components/ui/NotificationScheduler.jsx` |
| Save endpoint | Validates input; only accepts push addresses at the real push services (Google, Mozilla, Apple, Microsoft) so no one can register their own server; stores a clean copy; plain error messages; one SQL function; unused DELETE removed | `app/api/push/subscribe/route.js` |
| Database | `push_subscriptions` in a migration with type checks; one row per push address (a browser whose storage was cleared no longer gets everything twice); `save_push_subscription()` (server only); three reminder jobs reading the URL and key from Vault | `supabase/migrations/20261001_notifications.sql` |
| Notification function | Accepts only the project's secret keys (`apikey` header), reads the database with the secret key, reports delivered / failed / removed separately with the first failure's reason | `supabase/functions/send-notifications/index.ts` |
| Admin | Send result shows delivered and failed; admin route sends the new key the new way | `app/admin/notifications/page.js`, `app/api/admin/notifications/route.js` |
| Admin logins | `ADMIN_SESSION_SECRET` (32+ chars) is required; no fallback to the service key | `lib/adminSession.js`, `app/api/admin/auth/route.js` |
| Parent reports | Edge function (if ever configured) called with the secret key in `apikey` | `app/api/school/parent-report/route.js` |
| Banner | Same wording; text 13 px and 44 px tap targets; "once a day" uses the Lagos day | `components/ui/NotificationScheduler.jsx` |

## Behaviour changes (plain words)

- The in-app banner still appears first; tapping **Enable** now always opens the browser's own permission prompt.
- Settings shows **On** only when the phone can really receive notifications. New states: **Needs attention**
  (with Try again) and **Not available**.
- Students no longer get duplicate notifications on phones whose browser storage was cleared.
- Admins must log in again after `ADMIN_SESSION_SECRET` is set; admin login refuses to work without it.
- Admin "Send" shows real delivery numbers.

## Tests

- `supabase/tests/notifications_test.sql` (with `local_supabase_shims.sql` + `local_notification_shims.sql`):
  refuses to run without Vault secrets or with a legacy key, catches a wrong column type, runs twice cleanly,
  replaces only the reminder jobs, builds each job's request correctly, device saving (repeat, sign-in, cleared
  storage, renewed subscription), players can't call the save function, old duplicates cleaned up.
- The notification function was run with fake Supabase/web-push: only secret keys in `apikey` are accepted (no key,
  legacy JWT, publishable key, wrong key, secret-as-Bearer all refused), counts are honest, unsubscribed devices are
  marked inactive, the next batch of 500 carries the new key, and a missing secret key is a clear 500.
- The save endpoint was probed with bad device ids, an attacker's URL, a look-alike host, plain http, missing keys,
  junk fields and a database outage.
- In Chromium at 390 px (real banner, hook, sheet and endpoint; only the phone's push service faked): first enable,
  silent re-save on the next open, sign-in, cleared storage, failed save + Try again, changed VAPID keys, missing
  VAPID key, blocked.

**Library versions (checked 27 Sep):** the app uses `@supabase/supabase-js` 2.106.2 and `@supabase/ssr` 0.10.3.
Installed and probed with the new keys: every client sends the key in `apikey` and the identical value in
`Authorization: Bearer`, which Supabase explicitly allows for backward compatibility ("only allowed if the value in
the header exactly matches the value in the `apikey` header"), and Supabase says any client version works with the
new keys. No library upgrade is needed.

**Not verified here:** a real Supabase project (keys, Vault, pg_cron, pg_net), a real push service delivering to a
real phone, and a full Next.js build. Steps 6–9 above are where those get checked.
