# Update guide — 27 Sep 2026 (everything from this session)

Follow this top to bottom. It assumes **none** of this session's updates are applied yet. Every SQL file is safe to
run again if you already ran it. Allow about 45 minutes.

What's in this update:
- **1v1 battles:** the freeze on the last question, the lag, and one phone not starting.
- **Notifications:** nobody ever received one; now they work end to end.
- **Security:** the leaked service-role key, and admin logins that could be forged with it.
- **Clean-up:** diagnostic mentions and dead code removed.

Details: `PVP_1V1_FIXES.md`, `PUSH_AND_KEYS.md`.

> **Never paste a key into a chat, a ticket or a file in the repo.** Only into the Supabase and Vercel dashboards.

---

## A. Supabase dashboard (about 5 minutes)

**1. Create the new API keys.** Go to Settings → API Keys and create:
- a **publishable** key (`sb_publishable_…`);
- a **secret** key (`sb_secret_…`). If one named `default` already exists, use that.

**2. Put two secrets in Vault.** Open the SQL editor and run the lines below once. Paste your secret key between the quotes:
```sql
select vault.create_secret('https://kctmonevqybrrkrmuanj.supabase.co', 'project_url');
select vault.create_secret('sb_secret_PASTE_YOUR_KEY_HERE',            'notifications_secret_key');
```

## B. Database (SQL editor, in this order)

| # | File (in `src/supabase/migrations/`) | What it does | You should see |
|---|---|---|---|
| 3 | `20260929_fix_attempts_session_id.sql` | Fixes the column that froze 1v1 on the last question and blocked practice saves | two rows saying `text` |
| 4 | `20260930_pvp_realtime_and_retries.sql` | Lets 1v1 phones receive live updates, and makes resent answers and joins harmless | no error |
| 5 | `20261001_notifications.sql` | Device table and saving; removes the six broken reminder jobs (and the leaked key in their history); adds three working ones | three `push-reminder-*` jobs at `0 11`, `0 15`, `0 19` |

If step 5 stops with an error, the message tells you what's missing (usually a Vault secret from step 2). When it
stops, nothing has been applied, so fix the problem and run it again.

## C. Notification function (about 5 minutes)

**6.** Supabase → Edge Functions → Secrets. Check these three:
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are **one pair**, generated together.
- `VAPID_PUBLIC_KEY` is **exactly** the same text you put in Vercel as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- `VAPID_SUBJECT` is set, e.g. `mailto:you@yourdomain`.

**7.** Deploy the function from your computer, inside the project's **`src`** folder (the one that holds `supabase/`):
```
npx supabase login
npx supabase functions deploy send-notifications --no-verify-jwt --project-ref kctmonevqybrrkrmuanj
```
`--no-verify-jwt` is required, because the new secret keys aren't JWTs. The function checks the key itself.

## D. Vercel environment variables

**8.** Go to Vercel → Settings → Environment Variables and set these for **Production** and **Preview**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **publishable** key `sb_publishable_…` |
| `SUPABASE_SERVICE_ROLE_KEY` | the **secret** key `sb_secret_…` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the VAPID public key (same as the function's `VAPID_PUBLIC_KEY`) |
| `ADMIN_SESSION_SECRET` | a new random value, 32+ characters (see below) |

To make `ADMIN_SESSION_SECRET`, run `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
Admin login won't work without it (on purpose). The variable names stay the same; only the values change.

## E. Code

**9. Replace the `src` folder.** First **delete** your old `src` folder, then put the new one in its place. Don't copy
the new files on top of the old ones: this update deletes one unused file (`lib/topicSequencer.js`). No changes
to `package.json` or anything outside `src`.

**10. Commit and push.** Vercel builds and deploys it with the variables from step 8.
- *Safest option:* push to a new branch first. Vercel gives it a Preview address, so run the checks in F there,
  then merge.

## F. Checks (on a phone; Chrome on Android if possible)

- [ ] Sign in; sign up a test student.
- [ ] Finish a practice session; XP and history update.
- [ ] Leaderboard loads.
- [ ] **1v1:** create a match, join from a second phone and play to the end. Both phones reach the results screen, and each
      reveal shows on both phones at about the same moment.
- [ ] **Admin:** log in (you'll have to log in again), open a few pages.
- [ ] **Notifications:** Settings → Notifications → Turn on. **The browser's own prompt appears.** Tap Allow and the row
      says **On**.
- [ ] **Admin → Notifications:** send a test. It says "Delivered to 1 device", and the notification arrives on the phone.

## G. Switch off the old keys (this retires the leaked key)

**11.** Supabase → Settings → API Keys → legacy keys → **Deactivate**. First make sure nothing else still uses them:
other apps or scripts, automations, local `.env` files. You can reactivate them if something breaks. Then run the
checks in F once more.

## H. Next day

**12.** After the next 12pm, 4pm or 8pm reminder, run:
```sql
select created, status_code, left(content::text, 120) from net._http_response order by created desc limit 3;
```
- **`200`** with `"delivered": N`: working.
- **`401`**: the secret key in Vault is wrong; fix it with `vault.update_secret`.
- **Couldn't resolve host**: the `project_url` secret is wrong.

To change a Vault secret later:
`select vault.update_secret((select id from vault.secrets where name = 'notifications_secret_key'), 'sb_secret_…');`

---

## Also in this update

- **Diagnostic mentions removed.** There is no diagnostic test in the app, so:
  - the early-access page now promises what the app actually does ("…serves practice on their weakest topics first");
  - the admin Core Topics page no longer claims core topics feed diagnostics or study plans;
  - the unused `QUESTION_CONTEXT` constant, the unused `lib/topicSequencer.js` and old comments are gone.
- **Worth knowing:** marking a topic as Core in the admin area currently has **no effect** for students. Nothing
  outside the admin page reads `core_topics`. If Core topics should shape practice, that's a feature to build.
- **Left as is on purpose:** the database's list of answer types still includes `'diagnostic'`. Older saved answers
  may use it, and removing it would reject them.
- **Standards:** `ENGINEERING_STANDARDS.md` gained the migration rule: check a column's *type*, not just whether it exists.

## What was tested (and what wasn't)

**Tested:** on a local database shaped like live, all migrations ran in the order above, twice; the 1v1 engine,
Realtime/retry and notification test suites all pass. Every page, layout and API route compiles (150 of 150, the
same as before). 1v1 matches were played on two simulated phones, including answer changes, time-ups, a hung
request and a failed server. The notification flow was checked in Chromium at 390 px, and the notification
function against fakes.

**Not tested here:** your real Supabase project (new keys, Vault, scheduled jobs), a real push reaching a real
phone, and a full `next build`. Steps F and H cover those.
