# Analytics audit — 22 October 2026

## Recommendation

Keep the useful measurements, but rebuild the presentation around **Summary,
Student activity, and Learning**. Put paid-plan reporting in a secondary business
view. Keep shared school-computer usage in Schools (Desktop), with a link from
analytics. Fix the shared mobile/web measurement sources before redesigning the
charts: a simpler page would still mislead if its figures disagree.

The current system is partly shared across clients, not cleanly “web only” or
fully mobile-aware. Mobile session summaries enter some shared tables, while
other charts still require web-specific answer records or web API events.

## What the owner needs to know

| Question | Information that helps a decision |
| --- | --- |
| Are we reaching real students? | Genuine new accounts, signup method, incomplete setup, first practice completed. Exclude known test identities; show anonymous identities separately. |
| Are students actually using it? | Unique students practising, completed sessions, questions answered, study days, last activity, comparison with the preceding equivalent period. |
| Do they return? | Students returning for another study day, next-week retention and new accounts that never practise. Offer an actionable student list rather than only a heatmap. |
| What do they use? | Most-used features, subjects and exams; completed sessions and participating students. Count each student once in the overall total. |
| What needs improvement? | Topics with enough evidence of difficulty, question reports, failed downloads/sync and app errors; distinguish no reports from no problems. |
| Is the business working? | Confirmed individual purchases and renewals, active paid access and upgrade interest. Separate complimentary/trial/school access from actual payment. |
| Are installed school computers used? | Schools/computers reporting practice, sessions, last practice and last upload. These are devices and sessions, not unique students. Keep this operational view in Schools (Desktop). |

## Live evidence: the numbers already disagree

Read-only queries on 22 October used the same unfiltered window, **1–22 October
2026 in Lagos time**, for both analytics functions. This diagnostic window is
explicit; it is not a claim about whichever 7/30/90-day filter is currently open.

| Source | Questions answered | Correct |
| --- | ---: | ---: |
| `analytics_kpis` / Overview | 224 | Overview reports 46% accuracy |
| `analytics_engagement` / Engagement | 300 | Not returned by this function |
| `student_daily_stats` in that window | 300 | 150 |
| Shared `account_mastery_facts` in that window | 300 | 150 |
| Mobile `account_topic_results` in that window | 76 | 47 |

The 76-question difference matches the synced mobile topic summaries. The
shared facts view reconciles to the daily stats at 300 questions and 50%
accuracy. All returned rows were counted and checked against exact row counts;
these totals were not truncated at an API page limit.

The same analytics response reported 50 saved sessions. Feature reporting showed
25 computer-battle sessions but only 17 tracked starts / 15 completions; topic
practice showed 23 saved sessions but 11 starts / 9 completions. Saved sessions
and start events are different populations. These counts cannot support a
cross-client completion/drop-off conclusion without tracking coverage.

No production data or analytics functions were changed during this audit.

## Findings, in priority order

### 1. Shared activity is counted through incompatible sources

`analytics_kpis`, `analytics_daily`, `analytics_subjects`, `analytics_topics` and
`analytics_exams` read `question_attempts`. Engagement's question total reads
`student_daily_stats`. The mobile progress sync writes `practice_sessions` and
updates `student_daily_stats`, but its per-topic results live in
`account_topic_results`; it deliberately does not invent web answer rows.

The mobile backend already provides `account_mastery_facts`, combining web
answers and mobile topic results while avoiding a second contribution for a
session that already has web answer rows. This is a strong starting point for
the common question/accuracy/learning source. Validate its session-level
deduplication against mixed/partial imports before making it the analytics
contract. Do not simply add the two existing totals together.

**Keep:** shared session and day records. **Fix first:** all question totals and
learning charts must use one agreed, deduplicated source. Add reconciliation
tests against native-only, web-only and mixed-device fixtures.

### 2. Registered-student reporting can still include anonymous and test accounts

`analytics_scope` returns null with no filters, meaning “skip membership checks.”
Many unfiltered activity queries consequently do not enforce student role or
exclude anonymous Auth identities. Signup/plan/cohort queries mainly filter
profile role, which is insufficient for the anonymous student profiles found
earlier. The new classification in the admin student-list view does not
automatically change these separate analytics functions.

Introduce one canonical eligible-student scope, used even when filters are
empty: non-anonymous Auth identities with the appropriate student role, excluding
explicitly tagged test accounts. Preserve anonymous activity in its own report.
Mark test accounts through an audited admin mechanism; do not infer them from a
loose email-name pattern or delete their data to make charts cleaner.

### 3. Mobile feature detail is lost; completion coverage is incomplete

`sync_account_progress` currently writes a history row as mode `battle` or
`practice`. This loses distinctions such as Quick 5, Mock and Speed in that
shared session record. SQL then classifies ordinary practice by whether a topic
name is present. A Quick 5 native session may therefore appear under Topic or
Custom Practice rather than Quick 5.

The events writer accepts session start/completion, flashcard open and upgrade
events. The inspected writers are web API routes. Native progress sync does not
produce equivalent `student_events`. Existing completion figures mix saved
sessions with narrower event coverage. Friends battles and daily challenges
also use different counting units; flashcards measure opens, not completed
practice sessions.

Preserve a normalized feature identifier in native history/session metadata and
use it consistently across clients. Only show a completion percentage for
sessions with a matching observed start and a defined completion rule. Track
study-session starts, not content-prefetch requests. Display unavailable metrics
as unavailable until clients support them; zero is not a substitute.

### 4. There is no reliable platform breakdown

Sharing Supabase does not record whether activity came from web, Android or
Windows. The current analytics parameters and SQL have no platform dimension.
Signup method phone/email is not an operating-system or app-platform signal.

Add app platform, app version, installation identifier and event schema version
at ingestion. Keep account identity separate from device identity. A student
using both web and mobile is one student in the total and may appear in both
platform subsets; those subsets are not additive. Historical rows with no
trusted source must remain **Unknown**, not silently labelled Web. Treat shared
school installations as a separate population, not personal student accounts.

### 5. The interface repeats information and mixes time windows

Overview currently contains five KPIs and eight additional chart/table cards.
Daily active, new/returning, feature use, conversion and triggers reappear on
other tabs. The default tab requests eight analytics RPC sections, plus school
metadata on the first load. This is too much for an initial decision screen.

The selected period, “today,” rolling seven days, multi-week new/returning
charts, current plan mix and eight retention cohorts are not the same window.
For example, the 7-day selection still requests four weeks of new/returning
data. “Active This Week” is a trailing seven-day calculation, not necessarily
Monday through Sunday. Use explicit windows where an exception is useful.

Keep the five-minute cache and manual Refresh. Request only sections actually
shown. One failing optional query currently fails the whole tab; use independent
section errors so a revenue-query problem does not hide activity.

### 6. Filters are harder to interpret than their labels suggest

Plan filters use a student's plan **now**, even for historical study. The exam
scope includes students registered for that exam, while some queries additionally
filter actual activity by exam and others do not. The school filter reads the
web `schools` table, not desktop schools. “All schools” therefore does not mean
all installed school computers.

Keep date range prominent. Move exam and current access-plan filters behind
More filters, with clear semantics. Apply exam consistently to activity where
available. Keep desktop school/device filters on their own page. Historical
plan-at-event analysis requires a historical access definition; do not imply
that the current plan field supplies it.

### 7. Upgrade attribution is too weak to lead the dashboard

Conversion and triggers depend on web upgrade events and admin-sourced
subscription records. A subscription created within 30 days after an upgrade
view is an association, not proof that the view caused the purchase. The trigger
conversion query also does not filter out cancelled subscription rows. Trial
conversion uses students whose trials ended in the window and whether they have
an admin purchase, rather than a uniform conversion-observation window.

Keep actual confirmed purchase/renewal reporting. Move trigger rankings and the
cohort heatmap out of the landing view. Define a conversion cohort, observation
window, qualifying payment statuses and complimentary exclusions before showing
a headline conversion rate. A lack of native upgrade events is a coverage gap,
not proof that mobile students never attempt to upgrade.

### Adjacent Admin Studio totals also need reconciliation

The admin home dashboard separately downloads question/profile rows and counts
array lengths. Those reads have no explicit pagination or exact-count metadata,
so totals and “new this week” can hit the API row ceiling. Its success-rate card
uses only `question_attempts`. Reuse the corrected metric contract there after
the analytics fixes, instead of leaving two dashboards with competing meanings.

### 8. “Difficult topics” needs stronger evidence

The current minimum is 20 answers; this may come from one student's repeated
attempts. Keep the capability, but add participating-student counts and a minimum
distinct-student threshold. Show sample size and “Not enough data” when needed.
Separate content-error reports from genuine topic difficulty. Accuracy on
self-reported native results should be labelled appropriately, not presented as
an independently graded assessment of school or student ability.

## Keep, simplify, remove from the landing page, add

| Action | Items |
| --- | --- |
| Keep | Genuine new accounts; active practising students; completed sessions; questions answered; one daily trend; feature/subject use; returning students; confirmed purchases; deeper retention and topic evidence. |
| Simplify | One question per view; four headline figures on Summary; one trend with an optional questions/activity toggle; short metric definitions; date range first; detailed filters collapsed; click-throughs to relevant student records. |
| Remove from Summary | Repeated new/returning and daily-active charts; full feature tables; difficult-topic tables; upgrade-trigger rankings; trial funnels; plan mix; retention heatmap. Retain useful drill-downs rather than deleting the underlying historical data. |
| Add first | Correct shared data source; anonymous/test exclusion; mobile feature identifiers; source/OS/version coverage; activity vs upload dates; tracked/untracked completion coverage. |
| Add next | Signup → setup → first practice activation funnel; students who never start or stop returning; sync/download/error health; feedback triage; last successful sync and data freshness. App opens and lesson/flashcard progress need explicit instrumentation before reporting. |

## Proposed information architecture

**Summary:** four figures — active practising students, genuine new students,
completed sessions and questions answered — with equivalent-period comparison.
One activity trend; top three features; a small “Needs attention” area for
inactive new accounts or reported problems. Include coverage/freshness in a
compact expandable note. Avoid adding interpretation cards with invented
“insights” while the sample is small.

**Student activity:** new vs returning, study frequency, first-practice funnel
and an actionable list of students who have not started or have stopped
returning. Put cohort retention under an expandable advanced section. Do not
automatically message students from an analytics rule.

**Learning:** subjects/features used and difficult topics with sample sizes.
Separate “Popular” from “Needs improvement.” Link question reports to the
existing review workflow. Add lesson and flashcard progress once captured.

**Business, secondary navigation:** confirmed paid students/purchases, renewals,
trial cohorts and upgrade interest. Keep desktop device purchases in Schools
(Desktop), rather than adding their device counts to personal student totals.

**Schools (Desktop):** the redesigned school overview and dedicated Schools,
Computers, Payments and Usage views. School sessions are never labelled as unique
student counts.

## Delivery order and acceptance checks

1. Agree the metric contract and unify eligible identities and question facts.
   The same scope/window must produce identical question totals on Summary,
   Student activity and Learning. Verify no anonymous/test contamination and no
   double-counting when the same session syncs twice or is imported from web.
2. Preserve native feature/source/version and separate original occurrence time
   from server receipt time. Uploading yesterday's offline practice today must
   contribute to yesterday's activity. Track late arrivals and retries.
3. Build the simpler three-view interface against these corrected sources;
   keep business reporting secondary and detailed cohort work expandable.
4. Add first-practice and return/drop-off views, then reliability/download
   telemetry. Validate platform coverage before advertising a platform filter.

School UI changes were implemented in this task. Analytics is an audit and
implementation recommendation: no analytics UI, metric formula or production
database was silently rewritten.

## Source map

- `src/app/admin/analytics/page.js`: five tabs, repeated cards, filters and cache.
- `src/app/api/admin/analytics/route.js`: RPC fan-out, different windows, all-or-nothing loading.
- `src/supabase/migrations/20261008_analytics.sql`: scope, activity, KPIs, features, learning, retention and conversion definitions.
- `src/components/admin/analytics/sections.jsx`: displayed labels, rates and difficulty tables.
- `src/lib/server/studentEvents.js` and student questions/flashcards/events routes: web event coverage.
- `src/lib/analytics.js`: feature classification.
- Mobile checkout `app/backend/20261017_account_progress_sync.sql`: native sessions, XP and shared daily totals.
- Mobile checkout `app/backend/20261017_account_learning_summaries.sql`: topic results and the deduplicated `account_mastery_facts` view.
- `docs/analytics.md`: previous intended behaviour; several exclusions are now stale because native sync exists.

## School redesign validation

The school and desktop-school pages pass focused lint; five usage/API boundary
tests pass. Navigation and responsive layout were checked in the local browser.
The currently connected school registry is empty, so no production activation
or payment was submitted to exercise a populated drawer. Two pre-existing
set-state-in-effect lint errors and an image warning remain in AdminSidebar;
this change only renames its school links. The existing Admin Studio dashboard
also has a Date.now/purity lint error; its changes here are school labels and a
desktop-school navigation link. No database migration is required for the
school UI redesign.

## Implementation follow-up — 22 October 2026

The audit recommendations are now implemented in the shared analytics snapshot and three-view admin page. See analytics.md for current definitions, request behavior and limitations; the audit evidence above describes the earlier implementation.

The owner applied 20261022_shared_analytics.sql successfully. A subsequent live 30-day snapshot returned 427 answers, matching daily, platform and subject totals. Browser verification showed the same figures. Web and native app usage are distinguished, with unidentifiable history retained as Unknown; native includes personal Windows as well as mobile. The web implementation still requires deployment to publish it.

Eleven focused analytics and school usage tests pass, including actual migration execution in SQL fixtures. The new payload is bounded, views share one request, and warm-instance caches avoid repeating aggregate work on every visit. Schools (Desktop) now has an explicitly bold heading.
