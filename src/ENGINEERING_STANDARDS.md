# ExamPrep Engineering Standards

**Read this before changing any code.** It applies to every contributor, human or AI, in every chat and every session.
If a request conflicts with this document, say so before writing code.

Last updated: 26 Sep 2026 · Owner: tech lead

---

## 1. The one rule: understand first, then change

We do not patch symptoms. Every change starts with understanding why the problem exists.

A **patch** makes the visible symptom go away: a fallback on top of a fallback, a `try/catch` that hides an error,
an `if (x === undefined) x = …` added where the bad value shows up, a copy of a function tweaked for one caller.
A **fix** removes the cause, so the symptom can't come back anywhere else.

Before writing code, you must be able to answer, in writing, in the chat or the PR:

1. **What is the actual problem?** Reproduce it, or point at the exact line or query that causes it.
2. **Why does it happen?** Trace the data from where it's created to where it breaks
   (database → API route → client state → screen). Name the root cause.
3. **What else depends on this?** Search for every caller, every screen and every table touched (the blast radius).
4. **What's the cleanest change that removes the cause?** Prefer changing the one place the truth lives over
   adjusting every place that reads it.

If you can't answer these yet, keep investigating. Do not write code to "see if it helps".

---

## 2. How every change is done

| Step | What you do | Output |
|---|---|---|
| 1. Audit | Read the relevant files end to end. Trace the data flow. Check the database side (tables, functions, indexes, RLS). | A short statement of the root cause |
| 2. Plan | Decide the fix and list every file, table and screen it touches. Flag behaviour changes and anything that needs a migration. | A plan the owner can read in 1 minute |
| 3. Implement | Make the change in the place the truth lives. Remove what the change makes obsolete. | Clean diff, no leftovers |
| 4. Verify | Compile, run it, test the edge cases (guest, offline, empty data, big data, wrong user). Look at the screen at phone width (390 px). | Evidence: test output, screenshots |
| 5. Document | Update the file header comment, the changelog for the release, and this document if a rule changed. Migrations get deploy notes. | Notes a teammate can deploy from |

Small changes still follow the steps. They're just quicker.

---

## 3. Architecture: where things live

**Stack:** Next.js (App Router) · Supabase (Postgres, Auth, PostgREST, Edge Functions) · PWA, mobile-first, local-first.

| Concern | Lives in | Rule |
|---|---|---|
| Student identity and profile | `app/student/layout.js` (fetched once) → `useStudentUser()` | Pages never call `supabase.auth.getUser()` or re-fetch the profile |
| XP total on screen | `contexts/PointsContext.js` | Only updated via `setTotalPoints` / `reconcileServerPoints` |
| Answer checking | `lib/answers.js` | The only definition of "correct". Client and server both import it |
| XP formula | `lib/xp.js` | The only XP formula. Client shows it, server awards it |
| Dates, "today", weeks | `lib/dates.js` (JS) and `app_today()` (SQL) | Always the Nigerian calendar day (UTC+1). Never `new Date().toISOString().slice(0,10)` |
| Streaks | `profiles.streak_days` + `last_active_date`, read through `lib/streak.js` | Never recompute from raw answers |
| Service-role DB access | `lib/server/supabaseAdmin.js` | Server-only. Never import from a `'use client'` file |
| Paging long lists | `lib/server/paging.js` (`selectAll`, `schoolStudentIds`) | Any list that can pass 1,000 rows |
| School data access | `lib/server/schoolStats.js` (`requireSchoolAdmin`, aggregates) | All school endpoints go through it |
| Admin session | `lib/adminSession.js`, enforced in `middleware.js` | Every `/api/admin/*` route is gated automatically |
| Offline and guest practice | `lib/localSessionSync.js` | Save locally first, sync in the background, idempotent by `session_id` |
| Database schema, functions, policies | `supabase/migrations/*.sql` | The only way the schema changes. No hand edits in the dashboard |

**Before creating a new helper, search for an existing one.** Two versions of the same logic will drift apart.
That's how we ended up with three different XP formulas and two answer checkers.

---

## 4. Data and database rules

1. **Let Postgres do the counting.** Totals, averages, rankings and "group by" happen in SQL (a view or an RPC function).
   API routes never download raw rows to add them up in JavaScript.
2. **Assume the 1,000-row ceiling.** Supabase returns at most 1,000 rows per request, silently. Any query on a growing
   table (`question_attempts`, `practice_sessions`, `profiles`, `push_subscriptions`…) must be aggregated in SQL,
   limited on purpose, or paged with `selectAll`.
3. **Never read-then-write a counter.** XP, streaks and battle stats change in one atomic SQL statement
   (`award_xp`, `save_practice_session`, `record_battle_result`). `select total_points` → `+ xp` → `update` loses points.
4. **Multi-step writes are one transaction.** If a session, its answers and its XP must all be saved together,
   that's one SQL function, not four API calls.
5. **Writes are idempotent.** Anything a phone might retry (session saves, attempts) carries a unique id and a unique
   constraint, so saving twice changes nothing.
6. **Select the columns you use.** No `select('*')` in app code.
7. **Every hot query has an index.** Add it in the same migration as the feature.
8. **Migrations:**
   - One file per change, named `YYYYMMDD_short_name.sql`, safe to re-run (`if not exists`, `create or replace`).
   - They run **before** the app deploys, and the file header says so.
   - New functions: `security definer`, `set search_path = public`, explicit casts on returned columns, and
     `revoke execute … from public, anon, authenticated` unless the browser genuinely needs to call it.
   - Test the migration against a local Postgres before shipping, and run it twice.
9. **No "maybe the column exists" code.** If the code needs a column, the migration adds it. Don't write fallback
   selects for old schemas.

---

## 5. API route rules

Every route in `app/api/**` follows this order:

1. **Parse and validate input.** Check types, ranges and formats (uuids via regex). Reject bad input with a `400`
   before touching the database.
2. **Authenticate.** `supabase.auth.getUser()` on the server. Guests get a defined guest response, never a crash.
3. **Authorize.** Can *this* user see or change *this* record? Own data only, unless the role allows more
   (`school_admin` for their own school only, admins through the admin gate).
4. **Do the work** with the fewest round trips: parallel with `Promise.all`, or one SQL function.
5. **Respond.**
   - Errors: log the details server-side (`console.error('[route] …', err.message)`), return a plain message.
     Never return stack traces or raw database errors.
   - Caching: `public, s-maxage=…` only if the response is identical for every user. Anything personal is `private`.
     Question feeds are `no-store`.

**The server is the source of truth for anything that earns points or ranks people.** The phone reports what the
student picked; the server decides if it was right, how much XP it's worth, and whether it counts. Never trust
`is_correct`, `xp`, `score` or `outcome` from the client without checking it.

---

## 6. Client rules

- **Local-first stays.** Save to the device first, show the result instantly, sync in the background. Never block
  the screen on a network call you don't need.
- **No duplicate fetching.** The profile, XP and subject ids are already loaded or cached. Read them from context
  or `lib/localProfile` before calling an API.
- **Everything works for guests and offline**, or shows a clear message when it can't.
- **Shared UI rules:**
  - Primary actions (Next, Submit, Continue) are visible without scrolling, docked at the bottom on mobile.
  - A new step or question starts at the top of the screen.
  - Tap targets are at least 44 px; text in cards is at least 13 px.
  - Styles a component needs live with that component. Never rely on a class defined in another screen.
  - Check every screen at 390 px wide, in light and dark mode where it applies.
- **Explanations appear after a session (in review), not mid-battle.**

---

## 7. Code style

- **Every file starts with a header comment**: what the file does, who calls it, and for routes the request/response
  shape. When you change behaviour, add a one-line version note (`v3: …`) saying what changed and why.
- **Comments explain why, not what.** `// Supabase caps responses at 1,000 rows, so page this` is useful.
  `// loop over rows` is not.
- **Small, named functions** over long inline blocks. If a block needs a comment to explain what it does,
  it probably wants to be a function.
- **Constants have one home** (`LETTERS`, exam lists, XP values). Import them; don't redeclare them.
- **Delete dead code** in the same change that makes it dead. Git remembers it. Don't comment it out.
- **No debug logging left behind.** `console.log` is for local debugging; server logs use `console.error` /
  `console.warn` with a `[route]` prefix.
- **Keep each file's existing line endings** (many files are CRLF). Don't reformat files you aren't changing.
- **Names say what things are:** `studentIds`, not `ids2`; `fetchTodaysSlots`, not `doStuff`.

---

## 8. Anti-patterns we have removed (do not reintroduce)

| Pattern | Why it's banned | Do this instead |
|---|---|---|
| Summing raw rows in an API route | Hits the 1,000-row cap; slow; heavy egress | SQL aggregate / RPC |
| Leaderboard recomputed from every answer per request | This is what took down the signature app | Pre-aggregated `student_daily_stats` |
| `select total_points` then `update total_points = …` | Loses XP under concurrency | `award_xp()` or one SQL statement |
| "Best-effort" writes that silently continue | Half-saved sessions, wrong data | One transaction; fail loudly so the client retries |
| Trusting `is_correct` / `xp` from the phone | Leaderboard cheating | Re-check on the server |
| Checking only that a cookie *exists* | Anyone can forge it | Signed, verified tokens |
| Service-role routes without an authorization check | Any student can read or delete anything | Validate → authenticate → authorize |
| Fallback chains (`ilike` on question text if the id lookup fails…) | Hides data bugs, does full table scans | Fix the data; fail clearly |
| Copy-pasted helpers with small differences | Behaviour drifts between screens | One shared module |
| New public functions left executable by `anon` | Callable by anyone with the app's public key | `revoke execute` in the migration |
| CSS classes shared across screens by accident | Styles vanish on the other screen | Component-local styles |

---

## 9. Performance budget

| Action | Budget |
|---|---|
| Start any practice / battle / mock session | 1–2 database round trips |
| Save a session | 1 transaction |
| Any leaderboard view | Reads under 100 rows |
| Any page load for a signed-in student | No repeat of profile/auth calls the layout already made |
| Any query on a table that grows with usage | Aggregated, limited or paged, and backed by an index |

If a change can't meet the budget, say so in the plan and explain why.

---

## 10. Security checklist (every change that touches data)

- [ ] Inputs validated (type, range, uuid format)
- [ ] User authenticated where needed; guests handled
- [ ] Authorization: own data only, or an explicit role check
- [ ] No service-role client reachable from the browser
- [ ] New SQL functions revoked from `public`/`anon`/`authenticated`
- [ ] Student-written text escaped in HTML/emails and quoted in CSV exports
- [ ] No secrets, stack traces or internal errors in responses
- [ ] Points, scores and rankings computed or verified server-side

---

## 11. Real-time features (1v1 battles and anything live)

- **The server owns the match; phones only display it.** Match state lives in Postgres.
- Questions go to phones **without answers**. Answers are submitted to an RPC that checks them, stamps the time
  server-side and scores them.
- Supabase Realtime **Broadcast** carries signals ("opponent answered", scores); **Presence** shows who's connected.
  Don't use Postgres Changes for game traffic.
- Every match can be finished from the database alone (deadlines stored in the row), so a dropped phone can't
  freeze a match.
- Open realtime connections only on screens that need them, and close them on exit.
  Plan capacity against the Realtime connection limits of the current Supabase plan.

---

## 12. Definition of done

A change is done when:

- [ ] The root cause is stated, and the fix addresses it (not the symptom)
- [ ] It compiles, and every import resolves
- [ ] It was run: API calls tested, and the UI checked at 390 px
- [ ] Edge cases checked: guest, offline, empty data, large data, wrong user
- [ ] Nothing is left behind: no dead code, debug logs, duplicate helpers or commented-out blocks
- [ ] Migrations are idempotent, tested, and come with deploy order notes
- [ ] File headers and the release changelog are updated
- [ ] Behaviour changes are listed for the owner in plain words

---

## 13. Working with AI assistants

- At the start of a new chat, the assistant reads this file (and `SCALE_CHANGES.md` for recent history) before
  proposing changes.
- For anything non-trivial, the assistant states the root cause and a plan before editing.
- The assistant says what it could not verify (e.g. "not tested with a real build"), instead of implying it was.
- The owner does not need to repeat "clean code, no patching". This document is that instruction.
