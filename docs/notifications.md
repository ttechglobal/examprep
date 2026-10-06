# Notifications

Run `src/supabase/migrations/20261010_xp_and_notifications.sql` and then `20261011_trial_and_admin_speed.sql`
in the Supabase SQL editor, then deploy the app and the function:

```bash
supabase functions deploy send-notifications --no-verify-jwt
```

The service worker (`public/sw.js`) updates itself the next time students open the app.

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
- **`{name}`** in the title or message becomes the student's first name ("there" if unknown).
- Each message has its own tag, so a new one never replaces an earlier one on a phone.
- Templates: WhatsApp channel update, scholarship, admission update, new feature, weekend push, exam season, plan
  ending soon, come back, personal note. They live in `src/lib/notifications.js`.

## Why notifications show the old web address

The address a phone shows on a notification is the website the student **allowed notifications on**. The browser
decides it; the app can't change it. Students who allowed notifications while using the `…vercel.app` address keep
seeing that address until they allow them again on the real domain. Fix:

1. In Vercel, make the real domain the **primary** one, so the `vercel.app` address redirects to it.
2. On each phone, open the app on the real domain and turn notifications on again (Profile → Notifications). The
   old entry stops working and is cleaned up automatically the first time a push to it fails.

A student who turned them on under both addresses can get a message twice until the old one is cleaned up.
