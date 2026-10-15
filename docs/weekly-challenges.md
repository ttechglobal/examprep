# Weekly Practice challenges and offline shell — 15 Oct 2026

Home replaces its This Week chart with Weekly Challenges. Practice's existing
streak chart remains. Battle's missions, records, progress and battle XP remain
independent; only the unchanged registered-subject lookup is now a shared helper.

## Deployment

1. Apply `src/supabase/migrations/20261014_practice_challenges.sql` after the existing
   frequency/missions and XP migrations, before deploying this client and API.
2. Deploy the app and `public/sw.js` together. No image filenames are replaced.
3. Verify with a signed-in test account: play a challenge, return Home, check XP,
   refresh twice, then verify Battle's missions did not change from that practice.

The migration was tested against an isolated PostgreSQL fixture using PGlite,
including running twice. It has not been applied to or compared against the live
database. It checks prerequisites and existing challenge table column types and
fails rather than silently accepting incompatible shapes. Take the usual database
backup and verify the live schema before applying it.

## Initial rules

- Weeks run Monday–Sunday in Africa/Lagos. Up to three topic challenges per set,
  drawn from registered exam subjects and playable topics open on Free. With
  fewer eligible topics the set is smaller; no invented topics are displayed.
- Each challenge requires ten distinct question-bank questions in its topic and
  exam, and awards 50 account XP. Practice, Study, Quick 5, timed/custom practice
  and mock sessions count. Battle does not count. Repeating a question does not
  advance that challenge twice. Existing server answer verification is retained.
- First-set progress includes eligible answers already saved during that week.
  Finishing the first set before Sunday starts earns 25 additional XP, based on
  the verified completion timestamp rather than the date Home was opened.
- One optional extra set may be unlocked before Sunday. It uses new topics and
  only answers saved after its unlock time. The first set stays available in a
  completed-set disclosure. An extra set has no second early-finish bonus.
- Reward markers and `award_xp` run in one database transaction under an account
  lock. Repeated requests cannot pay twice. Last week's completed challenges
  can still be claimed the following week. No Battle reward ledger is used.
- Guests see a sign-in invitation. Rewards require a signed-in account. Offline
  snapshots display saved progress; progress/rewards update after sessions reach
  the server. No unverified device data awards challenge XP.

## Data and UI

`GET /api/student/practice/challenges` initializes/returns the current set and
claims completed rewards. `POST` unlocks an eligible extra set after checking the
request origin and account. Account identity comes only from the server session.
The hook scopes persistent snapshots and in-flight requests by account and Lagos
week; it refreshes on reconnect, visible-page return, session sync, and set unlock.
Cached data never awards XP. The new card opens the ordinary Practice session
with the topic preselected; existing plan checks still run at the question API.

Mobile header: actual brand mark, compact gold XP link to Progress, and an
accessible 44px theme switch. Large totals use compact notation with their full
value in the accessible label. Bottom navigation retains its five destinations
and gains rounded top corners, a clear active underline and focus outlines.
Home card label emoji are replaced by crisp book/controller SVGs.

## Offline behavior

The worker returns saved HTML immediately and refreshes it in the background,
saving the page's required code before replacing the old snapshot. Home/Practice
artwork is warmed at install. Raw and optimized images/icons are cached, existing
downloads survive the worker update, and core artwork/referenced code is protected
from ordinary cache eviction. Storage-disabled browsers can still use online
responses. Offline client navigation falls back to saved document navigation;
Flight responses and private APIs are never cached by the worker.

This does not download the entire question bank: starting a new uncached question
session still needs internet. Device storage can also be cleared by the user/OS.
Service worker registration remains production-only; a dev preview does not prove
an installed production app's airplane-mode lifecycle.

## Validation

- PostgreSQL integration tests cover Battle exclusion, exam/account isolation,
  distinct-question counting, once-only rewards, late claim, extra-set boundaries,
  Sunday deadlines, public-role restrictions, and incompatible schema rejection.
- Worker tests cover cache-first artwork, optimized icons, immediate saved pages,
  required code warming, failed refresh preservation, query separation, offline
  Flight fallback, API exclusions, pinned assets/code and disabled storage.
- Component preview checked at 390px in light/dark and 1440px on desktop, with
  guest, empty, error/retry, offline and completion states. Fixture route removed.
- Targeted lint passes for new/changed feature modules. The existing student
  layout's synchronous `setGate` in `useLayoutEffect` still triggers its prior
  `react-hooks/set-state-in-effect` lint error; the extracted header adds none.
- Production webpack build succeeds, including static page generation. Existing
  middleware-deprecation and missing-metadataBase warnings remain unrelated.

Run SQL tests with an external PGlite install (not an app dependency):

```powershell
$env:EXAMPREP_PGLITE_PATH='<external install>/@electric-sql/pglite/dist/index.js'
node --test tests/practice-challenges.test.mjs tests/offline-shell.test.mjs
```

Local API smoke checks also passed: guest GET/POST return 200 with `private,
no-store`, while a foreign-origin POST returns 403. The origin check accounts
for the public Host and forwarded protocol when Next normalizes its internal URL.
Final targeted verification: 22 tests passed (6 PostgreSQL, 10 worker/cache,
3 Battle navigation and 3 subject-icon regressions).

## Topic setup and shared placement (15 October 2026)

Home and Practice display the same ordinary-practice challenge card. Battle
missions remain separate. Challenge clicks open the topic session options sheet
before starting: 5, 10, 20, 30 or 50 questions, with no timer by default or
15–120 seconds per question. Ordinary topic practice uses the same options.
When a countdown expires, the session keeps the selected answer and advances.
This remains normal topic practice, including its existing access rules.

Goals now say “Complete 10 questions”, with completion progress separately.
The kicker and internal counting explanation were removed. Challenge counting,
weekly targets and rewards have not changed. The existing database migration
is still required to enable challenge records in a deployment.

Home illustrations retain their 2:1 proportions at every breakpoint. The mobile
and desktop headers share ExamPrep A1 branding and accessible XP/theme controls.
Verification: 25 targeted tests passed; browser checks confirmed count/timer
selection reaches the session config and the cards/options fit a 390px viewport.
