# Schools, slots and the admin team

## How it works

- **Joining.** A school signs up at `/school-signup` with the school name, contact name, email, WhatsApp phone and a password. `/api/school/signup` creates the account, the school and the school-admin profile together, and the school starts with **1 free slot**.
- **Slots.** One slot gives one student **12 months of Premium**. Schools pay **₦4,000 per slot**; a student on their own pays ₦5,000 a year. Slots never expire, so unused ones carry over.
- **Adding a student.** In the school dashboard, under **Slots & Premium**, the school types the phone number or email the student signed up with. That uses a slot, gives the student Premium for 12 months (starting after any Premium they already have) and adds them to the school's student list.
- **Removing a student.** If the student was added within the last **7 days**, the slot comes back, which covers mistakes. After that the slot stays used.
- **Buying slots.**
  1. The school picks how many slots it wants and the dashboard works out the total.
  2. "Request on WhatsApp" opens a chat with ExamPrep that already contains the school name, contact name, email, phone and the amount.
  3. We send payment details.
  4. Once payment is confirmed, an admin opens the school on **Admin → Schools** and clicks **Add Slots**. The amount defaults to slots × ₦4,000 and can be changed if a different price was agreed.
- **The student list.** A school's students are everyone linked to it: students it added with a slot, and students who joined with its invite code. Invite-code students show as Free unless they have Premium of their own. The dashboard, reports and the school leaderboard all use this one list.
- **The admin team.**
  - The owner signs in with `ADMIN_PASSWORD`. It shows as "Owner", or the name in `ADMIN_OWNER_NAME`.
  - Under **Admin → Admin Team**, the owner adds team members with their own email and password, removes their access (it ends immediately) or resets their password.
- **Activity log** (Admin → Activity Log, and a tab on each school). It records who did what and when:
  - every subscription activated or cancelled
  - slots added or corrected
  - students added to or removed from schools, with the school admin's name
  - students edited or deleted
  - team changes
  - school sign-ups

  Each entry is written in the same database transaction as the change itself, so a change can't happen without its record. Any admin can read the log; nobody can edit it.

## What the school-side audit found

| Problem | Effect | Fix |
|---|---|---|
| `POST /api/school/setup` turned **any** signed-in user into a school admin of a new school with 2 free slots | A student could give themselves Premium | Removed. Schools are only created by `/api/school/signup`, together with a brand-new account |
| The dashboard's student list was only the newest active cohort | Students added with a slot (who join no cohort) and students in older cohorts were missing from the overview, students tab, performance, reports and the school leaderboard. This is the "nonsense data" | The roster is now everyone linked to the school (`lib/server/paging.js schoolStudentIds`) |
| Adding a student by slot never linked them to the school | The school paid for students it then couldn't see | Adding a student links them to the school in the same transaction |
| Students could only be added by email, by scanning the first 1,000 sign-in accounts | Phone sign-ups couldn't be added at all; after 1,000 users, nobody could | Lookup by phone or email in SQL (`find_student_by_contact`) |
| `slots_used` was read in the app, then written back | Two quick adds could both use the last slot, and the counter drifted | Slots are a ledger; checking and using a slot is one locked transaction |
| Removing a school student set `plan = 'free'` | Wiped a plan the student had paid for themselves | The plan is always worked out from all of the student's subscriptions (`sync_profile_plan`) |
| The "Buy slots" WhatsApp button went to a placeholder number (`2348000000000`) | No slot request could have reached us | It now uses the support number (`lib/contact.js`) and includes the school's details and the total |
| The Subscriptions tab was passed the admin's **name** as their email | Wrong contact in requests | The tab gets contact details from the server |
| The admin Schools list read `schools.is_active`, which doesn't exist | The admin Schools page came back empty | Rebuilt on `admin_schools()` |
| Admin slot changes overwrote a number | No record of what was paid or who did it | Purchases and corrections are recorded rows with amount, note and admin |
| `/school/onboarding` and `/api/school/setup/complete` were never linked to | Dead code (and onboarding used the unsafe POST) | Deleted |

**Still true, and worth knowing:**
- Dashboard numbers come from synced practice (`question_attempts`). Practice done offline or as a guest counts once it syncs.
- Accuracy and "active" cover the **last 30 days**. The dashboard is cached for up to 2 minutes.
- Any student with a school's invite code can join that school's list. Rotate or disable the code from the Invite Code page if it leaks.

## Deploy

1. Run `20261007_schools_and_admin_log.sql` after the earlier ones (see [plans.md](plans.md)).
   - It checks the live column types it relies on and stops with a clear error if any differ.
   - It moves every active row of the old `school_subscriptions` list into 12-month subscriptions, counted from when each student was added.
   - Each school's old slot total becomes an opening balance.
2. Deploy the app. Every admin signs in again once, because sessions now name the admin.
3. Optional: set `ADMIN_OWNER_NAME` (e.g. your first name) so the log shows it instead of "Owner".

**Tested:** all four migrations were run on PGlite (Postgres 16), and the last one was run twice. The tests cover:
- slots: the free slot, adding students, no slots left, already added, slot returned within 7 days and not after
- the backfill and corrections
- a paid student queued correctly when a school adds them
- the team functions, sign-up and contact lookup
- every log entry

## Update: several students at once, faster, requests that identify the school

Run `20261013_school_roster.sql` before deploying.

- **Add many students at once.** On Slots & Premium, paste or type phone numbers or emails, one per line (or separated by
  commas), up to 50 at a time. Each uses a slot. One person failing (no account yet, linked to another school, already
  added) never stops the rest; when the slots run out the remaining ones are reported as not added. Whoever failed stays in
  the box so it can be fixed and tried again.
- **Slot requests carry who is asking.** "Request N slots on WhatsApp" now includes the school and the admin's name, sign-in
  email and phone, taken from the account (not typed), so the school can be found on the admin Schools page. A student's
  Premium request includes their name, phone, email and username the same way.
- **Light inputs.** The student box and the slots number used to look dark on the white cards on some phones and browsers
  (they had no background set). They are always light now.
- **Lighter on the database.** The roster (students and their Premium) is one query (`school_roster`) instead of four or five
  round trips; the dashboard runs its independent queries at once and keeps the result for 90 seconds per school; adding or
  removing a student, or the admin adding slots, clears it. The admin Schools panel opens at once with the row you clicked
  and loads the students behind it.
