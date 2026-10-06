# Free and Premium plans

## The rules

| Feature | Free | Premium |
|---|---|---|
| Quick 5 | Open (5 questions) | Open |
| Topic Practice | First 5 topics of each subject | Every topic |
| Custom, Study and Speed Round | 1 session a day, shared | Unlimited |
| Mock Exam | Locked | Open |
| Battle vs computer | 2 battles a day | Unlimited |
| Battle vs friends | Locked (creating a battle; anyone can still join an invite) | Open |
| Flashcards, explanations, Learn, daily challenge, leaderboards, progress | Open | Open |

- Every new account gets **14 days of Premium** (the trial; `TRIAL_DAYS` in `src/lib/plans.js` and the default of `profiles.trial_ends_at`, set by `20261011_trial_and_admin_speed.sql`), whichever way its profile is created.
- Accounts that exist when `20261005_plans.sql` runs get 7 days from that moment.
- Guests (no account) are on Free. Their daily limits are counted on the device, and signing up starts their trial.
- Days are Nigerian calendar days, the same as streaks.
- "First 5 topics" means the first five topics that have questions for that exam, in curriculum order (`topics.order_index`).
- Paid plans: **₦1,000 for 2 months** and **₦5,000 for a year**. For now payment is manual: "Get Premium" opens WhatsApp with the plan and account already typed in, then an admin turns Premium on.

## Where it lives

- **`src/lib/plans.js`** holds the rules: limits, prices, `planStatus`, `featureAccess`, `practiceFeature`. It's pure code that both the server and the app use. To change a rule, change it here.
- **Database (`20261005_plans.sql`):**
  - `profiles.plan = 'premium'` with `plan_expires_at` means paid or school Premium. No expiry date means it never ends (school slots).
  - `profiles.trial_ends_at` holds the trial end, set by the column default.
  - The `feature_usage` table and `use_feature()` count daily uses. The count is atomic and counts once per session or match `ref`. Students can't change any plan columns themselves.
- **Server:**
  - `lib/server/entitlements.js` is called by `GET /api/student/questions`, which every practice mode, mock and battle goes through.
  - The server works out the feature from the request itself, so the app can't mislabel it.
  - A refused request returns `403 { code: 'premium_required' | 'daily_limit', feature, limit }`.
  - `GET /api/student/plan` returns the student's status and today's usage.
  - `lib/server/subjectTopics.js` builds the topic list for both the picker and the check, so they always agree on which topics are free.
- **App:** `contexts/PlanContext.jsx` (`usePlan()`, mounted in the student layout):
  - `gate(feature)` and `gateTopic(topic)` run before something starts.
  - `recordUse` and `denied` run after the server responds.
  - It also shows the upgrade sheet and one-time pop-ups: the trial welcome (after profile setup), trial ended, Premium ending within 7 days, and Premium ended. These never appear during a session, a mock or Battle World.
  - `components/plan/PlanBadge` shows "👑 Premium", "1 free today" or "Used today".

## Rollout

Run the migrations in order, **before** deploying the app code (the code
assumes them; there are no fallbacks for a missing table):
`20261004_battle_xp.sql` → `20261005_plans.sql` (on launch day: every account
that exists then gets its 7-day trial) → `20261006_subscriptions.sql` →
`20261007_schools_and_admin_log.sql`. Then deploy. Admins sign in again once.

## Managing subscriptions (admin → Students)

The flow: a student taps **Get Premium**, picks a plan and sends the WhatsApp message (it includes their name and phone, or email). They pay by transfer, and an admin activates the plan on the Students page.

- **Database (`20261006_subscriptions.sql`, run before deploying this code):**
  - `subscriptions` is the ledger: one row per activated plan, with amount, dates and a payment note. Rows are cancelled, never deleted.
  - `sync_profile_plan()` is the only thing that sets `profiles.plan` and `plan_expires_at`: the latest end of the student's active subscriptions (paid or school), otherwise Free. Activating, cancelling and school-slot changes all call it, so one source can't overwrite another.
  - `activate_subscription()`: a renewal made before expiry starts when the current plan ends.
  - `cancel_subscription()`: any plan queued after the cancelled one moves up.
- **The Students page (`/admin/users`):**
  - **Student year:** students who joined that year, or had a paid plan running in it.
  - **Cards and filters:** Total, Paid, Free (trial and expired count as Free), and Expiring within 7 days. Filters cover Free, On trial, Paid, 2 Months, Annual, Expiring Soon and Expired, plus school, search (name, username, phone, email, school) and sort.
  - **Manage** opens the student panel:
    - details, with Call, WhatsApp and Copy
    - Edit, for the name and school only. Phone and email are how the student signs in.
    - Activate or Renew, which shows the exact dates before confirming
    - history with a Cancel option
    - a WhatsApp renewal reminder for expiring and expired students
    - Delete
- **Students are told in the app**, once each: when their plan is within 7 days of ending, and when it has ended. Both point to Renew. Push notifications are broadcast-only today, so per-student expiry pushes would need the `send-notifications` function to target users.
- **APIs** (all require the admin login):
  - `GET /api/admin/students`
  - `GET` and `PATCH /api/admin/students/[id]`
  - `POST /api/admin/students/[id]/subscriptions`
  - `PATCH /api/admin/subscriptions/[id]`
  - `DELETE /api/admin/users/[id]`, which was already there

## Schools and the admin team

See [schools.md](schools.md): school slots are 12-month `subscriptions` rows
(`plan_id = 'school'`), team members have their own admin logins, and every
change is in the activity log. Access codes were removed.
