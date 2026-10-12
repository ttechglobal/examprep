# Notifications

Run `src/supabase/migrations/20261010_xp_and_notifications.sql` and then `20261011_trial_and_admin_speed.sql`
in the Supabase SQL editor, then deploy the app and the function:

```bash
supabase functions deploy send-notifications --workdir src --no-verify-jwt
```

The service worker (`public/sw.js`) updates itself the next time students open the app.

### Deploying in the Supabase Dashboard editor

The maintained function has three files: `index.ts`, `messages.ts` and `personalization.js`. Pasting only `index.ts` fails with “Module not found” because its local imports are missing.

For a single-file deployment, run `node scripts/prepare-notification-deploy.mjs` from the repository root. Open `src/supabase/deploy/send-notifications.ts`, copy its **entire contents**, and replace the contents of `index.ts` in the Dashboard's **send-notifications** function editor. Deploy with JWT verification disabled; the function checks the secret `apikey` itself. Keep the existing function secrets.

The generated file includes reminders, audiences, personalization and the version check. Edit the maintained source files for future changes and regenerate this file before deploying. `node scripts/prepare-notification-deploy.mjs --check` verifies it is current. Alternatively, create all three source files in the Dashboard editor with their exact filenames.

## House rules

- **No emojis**, in any notification, including the buttons on it. The admin sender refuses them.
- Short: title about 40 characters at most (the sender allows 45), message about 110 (the sender allows 140).
- Upbeat and a little game-like: XP, streaks, ranks, missions, the arena. Never guilt-tripping, and never a statistic we don't have.

## Automatic (12:00, 16:00 and 20:00 Lagos)

All the wording and the rules for who gets what are in one file:
`supabase/functions/send-notifications/messages.ts`. Edit the words there.

| When | Message | Sent to |
|---|---|---|
| Mon 12:00 | "<Name>, your weekly missions are live" | everyone with subjects |
| Wed 16:00 | "Midweek check: N missions to go" (names the next topic) | only if some are open |
| Fri 16:00 | "3 days left on your missions" | only if some are open |
| Sun 16:00 | "Missions close tonight" | only if some are open |
| 20:00 | "Protect your N-day streak" | streak of 2+ not practised today |
| 12:00 / 16:00 | "Make it N+1 days in a row" | streak of 2+ not practised today |
| otherwise | a reminder from the slot's pool (six lines each), rotating by day and student | students who haven't practised today |

A student who has already practised today gets no reminder. Students who never opened Battle this week
(so no missions exist yet) get "Your missions are waiting". Devices with no account get the plain pool reminder.

## Custom (admin → Notifications)

Pick a template (or start blank), write the title and message, choose where a tap leads and who gets it, check
the reach, send. Everything sent is recorded in the Activity Log.

- **Audience:** everyone · one student (search by name, username, phone or email) · by exam · by plan (free, on
  trial, paid) · not practised for 3/7/14/30 days · plan ending within 7 days. The count shown is the real number
  of phones with notifications turned on. A group with no phones can't be sent to.
- **When they tap it:** a page in the app, **the WhatsApp channel** (paste its link once: the browser remembers it,
  or set `NEXT_PUBLIC_WHATSAPP_CHANNEL_URL`), or any https link. Links to other sites open in their own tab.
- **`{name}`** in the title or message becomes the student's first name ("there" if unknown). `{{name}}` also works, as do spaces and uppercase letters inside the braces. The preview uses the same replacement as delivery; for a single student it previews their selected name, otherwise it uses "Ada" as an example.
- Each message has its own tag, so a new one never replaces an earlier one on a phone.
- Templates: WhatsApp channel update, scholarship, admission update, new feature, weekend push, exam season, plan
  ending soon, come back, personal note. They live in `src/lib/notifications.js`.

Personalization happens in the Supabase Edge Function, not the service worker. Deploying the Next.js app alone does not update the sender. Before sending a message containing a name token, the API makes an authenticated, read-only GET to the sender to check its personalization version. An older function returns 405; the API then reports that deployment is needed and sends nothing. Deploy the function above before deploying the updated app. No database migration is needed for the replacement changes (the existing `notification_targets` function supplies each recipient’s name).

Regression checks: `node --experimental-vm-modules --test tests/notification-personalization.test.mjs tests/notification-sender.test.mjs` (isolated sender/database dependencies; sends no real notifications).

## Why notifications show the old web address

The address a phone shows on a notification is the website the student **allowed notifications on**. The browser
decides it; the app can't change it. Students who allowed notifications while using the `…vercel.app` address keep
seeing that address until they allow them again on the real domain. Fix:

1. In Vercel, make the real domain the **primary** one, so the `vercel.app` address redirects to it.
2. On each phone, open the app on the real domain and turn notifications on again (Profile → Notifications). The
   old entry stops working and is cleaned up automatically the first time a push to it fails.

A student who turned them on under both addresses can get a message twice until the old one is cleaned up.
