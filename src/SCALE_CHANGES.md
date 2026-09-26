# Scale & robustness changes — 26 Sep 2026

Goes with `supabase/migrations/20260926_scale_hardening.sql`.

## Deploy order (important)

1. **Back up** the database (Supabase dashboard → Database → Backups, or `pg_dump`).
2. **Run the migration** in the Supabase SQL editor, top to bottom. It is safe to re-run.
   It briefly locks `question_attempts` for inserts while it backfills daily stats (seconds at today's size).
3. **Deploy the app.** The new API routes call the new database functions, so the migration must be in first.
4. **Admins log in again.** Old admin cookies are no longer accepted.
5. **Push notifications:** redeploy the edge function (`supabase functions deploy send-notifications`) and make sure
   the pg_cron job calls it with `Authorization: Bearer <service_role_key>`. The function now rejects the anon key.
6. Optional: set `ADMIN_SESSION_SECRET` (any long random string). Without it the service role key signs admin sessions.

## What changed

### Security
| Change | Files |
| --- | --- |
| Admin sessions are signed, expiring tokens (HMAC) instead of "any cookie named admin_session" | `lib/adminSession.js`, `lib/adminAuth.js`, `app/api/admin/auth`, `app/admin/layout.js` |
| Every `/api/admin/*` route is gated in middleware, plus a per-handler check | `middleware.js`, 16 admin routes |
| Student profile sheet uses a public subject catalog instead of the admin API | `app/api/student/subjects` (`?catalog=1`), `components/student/profile/sheets.jsx` |
| Session save re-checks every answer server-side, drops unknown/duplicate questions, caps at 200, and is idempotent per `session_id` | `app/api/student/questions/session/save` |
| School dashboard, reports and cohort roster require `role = 'school_admin'`; cohort creation and setup-complete only for your own school | `app/api/school/*`, `lib/server/schoolStats.js` |
| Parent reports: only the student or their school admin; HTML-escaped; max one email per student per week | `app/api/school/parent-report` |
| Daily challenge: the submitted question must be today's question for that card | `app/api/student/daily-quiz/attempt` |
| Profile columns students must never edit (`total_points`, `streak_days`, `role`, `school_id`, `plan`, …) snap back if changed with the public key | migration §9a |
| New and existing XP functions (`increment_points` included) can only be called by the server | migration §9b |
| Push notification function requires the service role key | `supabase/functions/send-notifications` |
| Daily challenge board shows "Favour A." instead of full names | `app/api/student/daily-quiz/board` |
| API errors no longer return stack traces | `app/api/student/questions` and others |

### Scale
| Change | Before → after |
| --- | --- |
| `student_daily_stats` table kept by a trigger; leaderboards rank from it | Weekly board read every answer (200k rows at 2,000 students) → ~25 rows |
| Leaderboard top list memoised per server instance (60 s; 10 min for past weeks) | Every signed-in view recomputed |
| Questions API samples in one SQL call (`get_practice_questions`) | ~60 DB calls per session, ~240 per JAMB mock → 1–2 |
| Mastery, activity, topic counts, school dashboard/report, parent report group in SQL | Silent 1,000-row cut-offs → exact numbers |
| Streak stored on the profile and updated on save | Re-read up to 1,000 rows on every save |
| Session save is one transaction (`save_practice_session`) | 5+ separate writes, partial saves possible |
| Push notifications paged 500 per invocation, self-chaining | Only the first 1,000 subscribers were notified |
| Daily challenge picks cost 2 tiny queries, memoised per day | 400 full questions loaded per page view |
| Indexes for every hot query | — |

### Correctness
- Daily challenge stores one row **per card**, so card 2 is playable after card 1.
- One XP formula (`lib/xp.js`) shared by the phone and the server — the number shown no longer jumps after sync.
- One answer-checking rule (`lib/answers.js`) shared by the phone and the server.
- "Today", weeks and months use the Nigerian calendar day everywhere (`lib/dates.js`, `app_today()`).
- Battle stats update atomically (`record_battle_result`).
- `PointsContext` no longer makes its own auth + profile calls on every app open.

### Removed (unreferenced)
`contexts/SyncContexts.jsx`, `hooks/useOfflineQuestions.js`, `lib/offlineSync.js`, `components/ui/NotificationBell.jsx`,
`components/student/StudentTopbar.jsx`, `components/student/DailyQuests.jsx`, `components/lesson/LessonWithGate.jsx`,
`components/lesson/PrerequisiteGate.jsx`.

## Behaviour changes to know about
- **Leaderboard ties share a rank** (two students on 300 XP are both #4).
- **Streaks** count through yesterday: practise today or yesterday and the streak stands; miss a full day and it reads 0.
- Sessions queued by old app versions without a `session_id` still sync; they get a stable id derived from their contents.
- The school dashboard's "last 4 weeks" engagement uses calendar days (Nigeria) instead of rolling 24-hour blocks.

## Still to do (not in this change)
- **Rate limiting + sign-up captcha.** Needs infrastructure (e.g. Vercel Firewall rules or Upstash) and Turnstile keys.
- **XP farming by script.** Practice still sends `correct_answer` to the phone (needed for instant feedback and offline
  use), so a script could answer real questions correctly and earn XP. The server now blocks fake questions, fake
  "correct" flags, repeats and replays; closing the rest means holding answers server-side, as planned for 1v1.
- **1v1 battles** — design in the audit doc.

## How this was tested
- Migration run twice against Postgres 16 with a Supabase-like schema (roles, RLS, varchar/bigint column variants).
- Every new SQL function exercised directly, including the privilege lockdown over PostgREST.
- The rewritten API routes run end to end against PostgREST + Postgres: question sampling and year spread, session save
  (forged correctness ignored, duplicates rejected, legacy ids), all four leaderboard periods, mastery/activity/topics,
  both daily challenge cards, battle stats, school access control, dashboard totals matching raw rows past 1,000, and
  the admin gate (forged cookie rejected, signed token accepted).
- XP formula checked against the old client formulas on 2,000 random sessions.

Not covered here: a full `next build` with your real `package.json`/env, and a browser pass. Please run both on a
preview deployment before promoting.

---

# 1v1 battles (in development) — 26 Sep 2026

Hidden until launch: the battle hub shows Player vs Player as "Coming soon" with the button disabled.
Test it at `/student/battle/1v1`. Launch = enable that button in `app/student/battle/page.js`.

## Deploy
1. `npm install qrcode` (the waiting room draws its QR code with it).
2. Run migrations in order: `20260926_scale_hardening.sql` → `20260927_battle_recent_form.sql` → `20260928_pvp_engine.sql`.
3. Supabase → Database → Extensions → enable **pg_cron**, then re-run the last block of `20260928_pvp_engine.sql`
   (schedules the 5-minute clean-up).
4. Supabase → Authentication → Sign In / Providers → turn on **Allow anonymous sign-ins**. Friends without an
   account play on a guest login from the invite link. If it's off, the challenge page says so and offers sign-in.
   (Before launch, add Turnstile CAPTCHA to Auth — it covers anonymous sign-ins too.)
5. Simultaneous battles default to 5:
   `update app_settings set value = '5' where key = 'pvp_max_live_matches';`

## What's built
| Phase | Status |
|---|---|
| 1. Engine (tables, SQL functions, Realtime policy, sweep, tests in `supabase/tests/`) | Done |
| 2. 1v1 hub, create (shared setup screens), waiting room (code, WhatsApp, share, QR, expiry, cancel), `/b/<code>` challenge page with link preview | Done |
| Guests via link: accept with just a first name, sign-up card after the match, results kept on sign-up | Done |
| 3. Live match screen: countdown, shared server timer, lock in / change answer, "opponent answered", reveal with both picks and points, results, review, rematch, leave, claim win when the opponent is away, reconnect | Done |
| 4. Share result card | Planned |

## How a match plays
- Pick an answer, then **Lock in**. You can change it (tap another, then **Change**) until time is up or both have
  locked in. A pick that wasn't locked in when time runs out is sent anyway (the server allows 2 s of grace).
- 10 points per correct answer + up to 5 for speed. Ties go to the faster total time on correct answers.
- After each question both phones show the answer, who picked what and the points; the next one starts 3 s later.
- **Reconnect:** closing the app or losing signal doesn't stop the match; reopening the link picks it up where it is,
  with your locked answer kept. Answers made while offline are retried until time is up.
- **Leave** (Menu → Leave match) ends the match as a loss for the leaver.
- **Opponent away:** if your friend misses 3 questions in a row while you answer, you can **Claim win**.
- **Rematch:** either player asks; the other sees "X wants a rematch!" and accepts. Pressing Rematch when the other
  has already asked accepts theirs. Both phones move into the new match; the old one is never changed.

## Guests (no account)
- `/b/<code>` asks for a first name, signs in anonymously and joins. A guest can join battles and request a rematch,
  but can't create a battle (`PVP_ACCOUNT_REQUIRED`).
- A guest's answers stay in the `pvp_*` tables only: no XP, no `question_attempts`, nothing on leaderboards.
- The rest of the app treats a guest login as signed out. Outside `/student/battle/1v1/*` a guest goes to /onboarding.
- After the match: "Create an account to save your progress". Sign-up or sign-in (from anywhere) sends the guest
  token to `/api/student/battle/claim-guest`, which verifies it, runs `merge_battle_guest` (answers → attempts dated
  when played, XP with the normal formula, 1v1 form merged) and deletes the guest login.

## Files
- Engine: `supabase/migrations/20260928_pvp_engine.sql`
- Client helper: `lib/pvp/client.js` (all engine calls, messages, invite text, Realtime + polling), `lib/pvp/constants.js`
- Live match: `lib/pvp/useMatch.js` (follows the match, server clock, wake-ups, answer queue), `lib/pvp/results.js`,
  `components/battle/pvp/MatchResults.jsx`
- Shared battle look (vs Computer and 1v1): `components/battle/arena/*` — header, question card, answer tiles, timer,
  countdown, results hero, score strip, review
- Screens: `app/student/battle/1v1/*`, `app/b/[code]/page.js`, `components/battle/{BattleSetup,ChallengeClient,GuestUpgradeCard,PvpNotice,RecentForm}.jsx`
- Guest claim: `app/api/student/battle/claim-guest/route.js`, `lib/auth/client.js` (`signUp` / `signIn`)
- Design: the "1v1 Battle Design" doc

### Engine additions (re-run `20260928_pvp_engine.sql`, safe to repeat)
- `pvp_state` now includes `opponent_away` and `rematch` (the latest rematch offer of that match).
- `pvp_rematch` accepts an existing offer instead of opening a second match (locked, so a double press is safe).
- `pvp_claim_win(match)`: allowed when the opponent missed the last 3 questions and hasn't answered the current one,
  and you answered at least one of those 3. Finishes with `finish_reason = 'opponent_away'`.
