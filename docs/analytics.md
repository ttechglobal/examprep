# Admin Analytics

Analytics answers how ExamPrep is used. It's separate from Students (individual accounts) and Schools (partner schools and slots). Every number answers a product question.

| Tab | Question | What's on it |
|---|---|---|
| Overview | How is ExamPrep doing? | Active today and this week, questions answered, new students, Premium students (each with change vs the previous period); daily active students; new vs returning by week; feature usage; most practised subjects and topics; completion rate; Premium conversion; top upgrade triggers |
| Engagement | Are students coming back and studying? | Active students, study days, sessions and questions per student; daily activity and questions; new vs returning; this week's habits (1 / 2 / 3+ study days, one-time users); retention by join week |
| Features | What do students value? | Per feature: students, sessions, % of active students, started, completed, completion rate |
| Learning | What are they studying and struggling with? | Subjects (questions, students, accuracy, share); WAEC vs JAMB; most practised topics; most difficult topics |
| Conversion | Is free → paid working? | Trials started / active / ended / converted, Trial → Premium; students by plan; upgrade sheet views and WhatsApp taps; upgrade triggers and the purchases that followed |

The filters sit in one row and apply to every tab:
- Last 7, 30 or 90 days
- Exam (WAEC / JAMB)
- Plan (the student's plan **now**)
- School

## Definitions

- **Active student (on a day):** did something meaningful that day. That means answering a question (practice, battle, mock or daily challenge), starting a session, or opening a flashcard deck. Opening the app alone doesn't count.
- **New students:** accounts created in the period.
- **Returning students (in a week):** active that week and joined before it.
- **Feature:** what a session was.
  - Topic Practice: one topic chosen.
  - Quick 5, Mock Exam, Battle vs Computer, Speed Round.
  - Custom Practice: a whole subject, including Study Practice, which is saved the same way.
  - Battle vs Friends, Daily Challenge and Flashcards (decks opened).
  - The rule lives in two places, `lib/analytics.js` and `analytics_session_feature()` in SQL; keep them the same.
- **Sessions:** finished sessions (`practice_sessions`). These include everything saved before this release.
- **Started / completed:** recorded from this release on, in `student_events`.
  - A start is the session's first questions being served.
  - A completion is the same session being saved.
  - Retries and reloads count once.
- **Trial → Premium:** of students whose 7-day trial ended in the period, the share who have bought a plan.
- **Upgrade triggers:** what made the upgrade sheet appear, for example Mock Exam locked, Battle daily limit or Topic locked. Each counts once per student per trigger per day. "Bought" means an admin activated a plan within 30 days of the student first seeing that trigger.
- **Retention:** of students who joined in a 7-day week, the share active in each of the following 4 weeks. "…" means that week isn't over yet.

## What isn't measured

- **Guests.** Their practice stays on their phone until they sign up.
- **Lessons.** Nothing records lesson progress yet.
- **Smart Focus.** It isn't a feature in the app yet. When it ships, give it a mode, add it to the feature rule and it will appear.
- **Flashcard progress.** It stays on the phone; Analytics counts decks opened.

## How it's built

- **SQL** (`20261008_analytics.sql`): `analytics_*` functions count everything in Postgres, one round trip per section. The page asks only for its tab's sections. Indexes on the `created_at` of answers, sessions, profiles, matches and subscriptions keep range scans fast.
- **Events** (`lib/server/studentEvents.js`): written after the response is sent (Next.js `after()`), so recording never slows a student down. A lost event is logged and never breaks practice. Writers:
  - `/api/student/questions`: session start
  - `/api/student/questions/session/save`: completion
  - `/api/student/flashcards`: deck opened
  - `/api/student/events`: upgrade sheet shown, WhatsApp tapped
- **Page** (`app/admin/analytics`, `components/admin/analytics`):
  - plain SVG charts that draw at their real width
  - hover or keyboard crosshair and tooltips
  - a "Show data" table under each chart
  - colours from the validated data-viz palette
  - change arrows that pair an icon with the number, not colour alone

## Deploy

Run `20261008_analytics.sql` after `20261007` and before deploying. It checks the live column types it relies on. Started vs completed, flashcards and upgrade triggers fill in from the day it goes live.
