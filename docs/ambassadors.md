# Teacher Ambassadors

Teachers recommend ExamPrep A1 to their students. Each teacher gets a referral code, link and QR code. When a student they referred **pays for the first time**, the teacher earns a percentage of that payment (20% by default). Admins record what they pay out.

The public page is `/ambassador` (what the program is, the FAQ and the application form). Everything below is what happens after a teacher is accepted.

## The rules

- **Commission is on a student's first payment only.** Renewals earn nothing. School slots (`plan_id = 'school'`) and `legacy` plans earn nothing. Exams are written every year, so each year's class is a new set of students.
- **The rate** is `ambassadors.commission_rate` (0 to 0.5, default 0.20). Each commission stores the rate and amount it was earned at, so changing a rate never rewrites history.
- **A cancelled or refunded first payment reverses its commission.** The student's next paid plan then becomes the one that earns.
- **A student is linked to one ambassador, once.** It's set at sign-up (or later, see below) and students can't change it. An ambassador can't refer themselves (same account, phone or email).
- **Late codes:** a student can add a code after signing up only in their first 7 days and before any paid plan (Profile → Account & Security).
- **Paused ambassadors** can't take new students. Students they already have still earn, and an admin decides whether to pay.
- **Balance** = commissions earned − payouts recorded, across all years. It doesn't reset in January. Students and earnings are shown per year.
- **Payouts are recorded by hand.** Paying someone is a bank transfer; Admin → Ambassadors → Record a payout writes it down. It can't exceed the balance.
- The 20% is stated in the `/ambassador` FAQ only. No naira prices appear on that page.

## How a referral travels

1. The teacher signs up at **`/partner/signup`** (open to anyone who finds it: an ambassador only earns when students they refer pay) and presses **Generate my referral code** once. The code is 8 characters (no `0 O 1 I`) and never changes.
2. The student opens **`/r/CODE`** (link or QR). It says "Adeola invited you", saves the code on the device for 30 days (`lib/referral.js`) and goes to onboarding. The newest link a student opens wins. The first-time slides still show first.
3. On sign-up the optional **Referral code** box is prefilled and shows "Invited by Adeola ✓". `/api/auth/signup` saves `profiles.referred_by` through `apply_referral`. A wrong code never blocks sign-up.
4. When an admin activates the student's first plan, `activate_subscription` calls `refresh_referral_commission` in the same transaction and the commission appears on the teacher's dashboard. Cancelling a plan calls it too.

## Where it lives

| What | Where |
|---|---|
| Tables, functions, commission rule | `20261014_ambassadors.sql` (`ambassadors`, `referral_commissions`, `ambassador_payouts`, `ambassador_stats`, `apply_referral`, `refresh_referral_commission`, `ambassador_dashboard`, …) |
| Admin list and panel queries | `20261015_admin_ambassadors.sql` |
| Cheaper dashboard and payout queries | `20261016_ambassadors_lean.sql` |
| Teacher portal | `app/partner/*` (`/partner/signup`, `/partner/login`, `/partner/dashboard`), `app/api/partner/*`, `lib/server/partner.js` |
| Capturing the code | `app/r/[code]`, `lib/referral.js`, `components/onboarding/AuthPanel.jsx`, `app/api/referral/check`, `app/api/referral/apply` |
| Late code box | `ReferralCodeBox` in `components/student/profile/sheets.jsx` |
| Admin | `app/admin/ambassadors`, `app/api/admin/ambassadors/*`, `components/admin/ambassadors/AmbassadorPanel.jsx` |

The role `ambassador` is allowed by widening `profiles_role_check` in the first migration. `profiles.referred_by` and `referred_at` are protected from the browser by `tg_protect_profile_columns` (same as `plan` and `role`).

## Admin: Ambassadors

Open **Admin → Users → Ambassadors**. Pick a year; the list shows students, subscribed and earned for that year, and what you owe in total. **Manage** opens the panel:

- **Overview:** contact (call, WhatsApp, copy), referral code and link, earned / paid / owed, **Record a payout**, commission rate, Pause or Resume.
- **Students:** everyone they referred with plan state and commission (admins see real names and phones; ambassadors see first name and last initial only).
- **Payouts:** every payment recorded, who recorded it, and the note.

Every change is in the Activity Log (`ambassador.signup`, `referral.earn`, `referral.reverse`, `ambassador.update`, `ambassador.payout`). The student panel also shows **Referred by**.

## Load on the database (free plan)

Nothing polls. Each action costs:

| Action | Requests | Notes |
|---|---|---|
| Student types a code on sign-up | 0 while typing, 1 after they stop | Cached on the device and for 60 s on the server and CDN; 30 checks a minute per visitor |
| Student opens `/r/CODE` | 1 lookup, cached 60 s per code | Chat apps' link previews share the cache |
| Student signs up with a code | +1 `apply_referral` | Only when a code is present |
| Teacher opens the dashboard | 1 auth check + 1 SQL function | Switching to a year already opened in the last 30 s is free |
| Teacher generates the code | 1 auth check + 1 SQL function | Once, ever |
| Admin activates / cancels a plan | +1 `refresh_referral_commission` | A few indexed lookups, in the same transaction |
| Admin opens the list or a panel | 1 SQL function (list); 5 parallel queries (panel) | Admin only |
| Teacher sign-up | 10 an hour per visitor | Creates an auth user |

Limits and caches are in memory, per server instance (`lib/server/rateLimit.js`, `lib/server/memo.js`). They stop a script hammering one instance, not a distributed attack.

Analytics, leaderboards and notification audiences already exclude ambassadors: the analytics functions filter on `role = 'student'`, leaderboards are built from practice activity, and "everyone" notifications reach devices subscribed in the student app.

## Rollout

Run the migrations in the Supabase SQL editor, in order, **before** deploying the code:
`20261014_ambassadors.sql` → `20261015_admin_ambassadors.sql` → `20261016_ambassadors_lean.sql`. Each is safe to re-run. Until they have run, the referral box reads "We don't recognise this code" (sign-up still works) and the admin Ambassadors page shows an error.

Then check it end to end: sign up a test teacher, generate a code, sign up a test student at `/r/CODE`, activate a plan for them in Admin → Students, and confirm the commission appears on the dashboard. Cancel the plan and confirm it reverses.

## Known limits

- Payments are manual today, so commission is recorded when an admin activates a plan. When online payments are added, they should call `activate_subscription` and commission follows.
- The student list on a teacher's dashboard shows up to 500 students per view.
- Phone and email changes aren't compared again after sign-up, so the self-referral check only catches matches at the moment a code is applied.
