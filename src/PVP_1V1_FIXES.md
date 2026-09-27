# 1v1 battle fixes — 26 Sep 2026

Goes with `supabase/migrations/20260929_fix_attempts_session_id.sql` and
`supabase/migrations/20260930_pvp_realtime_and_retries.sql`.

## Deploy order

Follow **`UPDATE_GUIDE.md`** — it covers these fixes and the notification/key changes in one sequence.

## What was wrong, and what changed

| Problem (what players saw) | Root cause | Fix | Files |
| --- | --- | --- | --- |
| Match froze on the last question: both "Locked in", timer ran out, no reveal, no results | `question_attempts.session_id` was `uuid` on live; the code writes text (`pvp-<id>`, practice ids). 20260926's `add column if not exists … text` skipped the existing column. The finish step failed and rolled back the last answer. Behind it, the context check didn't allow `'pvp'` | Column → `text`; `'pvp'` added to the context check | `20260929_fix_attempts_session_id.sql` |
| **Practice and mock sessions weren't saving to the server** (same column) | Same as above: `save_practice_session` failed on every call | Same fix. Queued sessions still on phones will sync; ones already retried 5 times were dropped by `localSessionSync` and are lost | `20260929_fix_attempts_session_id.sql` |
| Frozen screen with no message when the server failed | The app treated server errors like being offline: an answer was resent every second forever, match reads ignored server errors, an overdue round was re-checked every 250 ms | Offline → keep retrying. Server error → 3 tries, then the "locked in" mark is taken back. A red banner appears when a round is 5 s past its deadline without moving; it clears by itself when the server recovers. Overdue checks every 1 s | `lib/pvp/useMatch.js`, `lib/pvp/client.js`, `1v1/match/page.js`, `1v1/lobby/page.js` |
| One phone stuck on 3-2-1 until refresh; after one lost answer, every later answer silently dropped | Requests had no time limit. One hung request blocked match reads for good (watchMatch) or the answer queue for the rest of the match | Requests give up after 8 s (match reads 4 s) and are retried | `lib/pvp/client.js` |
| Reveal ~1.5 s late on the phone that locked in first; opponent's "answered" late | The Realtime policies read `pvp_matches` as the player, who can't see it (RLS), so neither player could join the match channel. 1v1 ran on polling only | Policies call `pvp_can_use_channel()` (security definer) | `20260930_pvp_realtime_and_retries.sql` |
| A resent answer cost speed bonus; a resent join failed with "code not found" | `pvp_answer` overwrote the time on any resend; `pvp_join` only looked at waiting matches | Same choice resent = no change; resent join returns the match you're in | `20260930_pvp_realtime_and_retries.sql` |
| Tapping another option (without pressing Change) replaced the locked answer at time-up | `onTimeUp` sent whatever was highlighted | A locked answer always stands. A pick that was never locked still counts (owner's decision) | `1v1/match/page.js` |
| Answers could be changed after the timer showed 0 (server's hidden 2 s grace) | Tiles and Lock button stayed active | Tiles and button lock at 0; dock shows "Your answer: A" | `1v1/match/page.js` |
| — | `TimerRing` restarted on every parent render and could fire `onTimeUp` repeatedly | Callback read from a ref; fires once per countdown (also used by vs Computer, whose handler already ignored repeats) | `components/battle/arena/TimerRing.jsx` |

## Behaviour changes (plain words)

- When the timer hits 0 the answer tiles stop responding. Your locked answer is final.
- If you never pressed Lock in, the option you last tapped is still sent when time runs out.
- If the server can't finish a round, players see a red "Something went wrong on our side" banner with
  **Back to 1v1** instead of a frozen screen. The match carries on by itself once the server recovers.

## Tests

- `supabase/tests/pvp_engine_test.sql` — passes on a database shaped like live (after 20260929).
- `supabase/tests/pvp_realtime_retries_test.sql` (new) — players can use their match channel, strangers
  and other matches can't; resent answers keep their time; resent joins return the match. Fails on the old code.
- `supabase/tests/local_supabase_shims.sql` — now includes stand-ins for `realtime.messages` / `realtime.topic()`
  so the Realtime policies are tested locally instead of skipped.
- The match screen was run on two simulated phones and in Chromium at 390 px against a local engine: full
  matches, answer changes, time-ups, a hung request, and a database failure on the last round (with recovery).

**Not verified:** real Supabase Realtime delivery (only the access rule was tested locally), a real Next.js
build, and the vs Computer battle in a browser (compiled only).
