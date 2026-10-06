# Battle missions, topic frequency, XP and notifications

Run, in the Supabase SQL editor, in this order, **before** deploying:

1. `src/supabase/migrations/20261009_frequency_and_missions.sql`
2. `src/supabase/migrations/20261010_xp_and_notifications.sql`

Then deploy the app and the notification function:

```bash
supabase functions deploy send-notifications --no-verify-jwt
```

Both migrations are safe to re-run.

## Weekly missions

On the battle hub, a "Weekly missions" card: **always 3 missions**, each "answer N questions on <topic> in
battles this week", paying **50 XP** once when done.

- The week runs **Monday to Sunday** (Nigerian time). New missions appear on Monday.
- Only the subjects the student registered. However many they have (7 to 9 is normal), they get three
  this week: the subjects that went longest without a mission go first, so every subject comes round
  within a few weeks (9 subjects = every one in 3 weeks). A student with fewer than 3 subjects gets
  several topics in the same subject.
- Topics come from the most-examined topics in past papers (below), and a topic isn't repeated for 4 weeks.
- N is 10, rising to 15 and 20 with battle rank (`missionTarget` in `src/lib/missions.js`).
- Tapping a mission opens the battle setup already filled in.
- **To raise it to 4 or 5 missions later** (by rank, or by how steadily they finish): change
  `missionCountFor()` in `src/lib/missions.js`. It is the only place.
- **Computer battles only.** 1v1 does not count yet.

| Piece | Where |
|---|---|
| Rules (XP, count, target, picker) | `src/lib/missions.js` |
| Generate / list / pay out | `GET /api/student/battle/missions` |
| Progress | counted live in SQL, `mission_progress_count()`: battle answers on the topic this week |
| Payout | `claim_completed_missions()`: once per mission, via `battle_results` (source `mission`) and `total_points` |
| UI | `src/components/battle/BattleMissions.jsx`, prefill in `BattleSetup.jsx` |

## Topic frequency

`topic_frequency(subject, exam)` ranks a subject's topics by the number of **distinct years** they appeared in
across past papers, then by question count. One `GROUP BY` (no 1,000-row cap). Past papers only.
Admin: **Questions → Topic Frequency** (`/admin/frequency`); topics marked *Mission* are the pool (top 8
with at least 15 questions in the bank). The Past Questions chart reads the same function.

## XP: 5 per correct answer

`src/lib/xp.js`: **5 XP for every correct answer** in practice, mock and battle. Battles add +10 for a win and
+5 for a draw. No participation XP and no accuracy bonuses. Missions pay 50 XP. The weekly leaderboard's XP
column is also correct × 5 (`20261010`). Existing XP is not changed.

- 10 right in a practice session = 50 XP. A battle with 10 right and a win = 60.
- **Daily Challenge is unchanged** (50 XP first try, 25 second try). That is far above 5 per answer; lower
  it in `src/app/api/student/daily-quiz/attempt/route.js` (`xpForCompletion`) and the page text if you want it in line.
- Ranks (`src/lib/ranks.js`) need the same XP as before, so they now take longer to climb. Rookie ranks need
  220 to 380 XP each, about 45 to 75 correct answers. Retune `RANK_XP` if that feels too slow.
- **1v1 is not updated:** the SQL that awards 1v1 XP (`pvp_finish`, `battle_results_from_pvp`) still uses
  correct × 10, +20 win, +10 draw. Move it to the new rates when 1v1 is reviewed.

## Notifications

Reminders still go out at **12:00, 16:00 and 20:00** (Lagos). They are now personal
(`supabase/functions/send-notifications/messages.ts`, plain functions with no network, so they can be tested anywhere):

| When | Message | Sent to |
|---|---|---|
| Mon 12:00 | "Your new missions are live" (names the student, 50 XP each) | everyone with subjects |
| Wed 16:00 | "N missions still open", names the next topic | only if some are open |
| Fri 16:00 | "3 days left on your missions" | only if some are open |
| Sun 16:00 | "Missions end tonight", names the next topic | only if some are open |
| 20:00 | "Your N-day streak ends tonight" | streak of 2+ not practised today |
| otherwise | a reminder from the slot's pool, rotating by day and student | those who haven't practised today |

- A student who has already practised today gets **no** generic reminder (fewer, better-timed pushes). Mission
  reminders on Mon/Wed/Fri/Sun still go.
- Students who never opened Battle this week (so no missions exist yet) get "Your weekly missions are waiting".
- Devices without an account get the plain reminder. Admin custom blasts are unchanged.
- The old copy had made-up numbers ("retain 35% more"); they are gone. Nothing now states a statistic we don't have.
- The function's reply has a new `skipped` count (students who'd already practised).
- To change wording or timing: `messages.ts` only.

## Removed

- **Core Topics** (admin page, API, table).
- **Access codes**: the code was already removed. The `drop table access_codes` line in
  `20261009` is commented out; check the table holds nothing you need, then run it by hand.

## Left alone

`subtopics.exam_frequency` (hand-set 1 to 5 from the lesson-building days). Not the real frequency.
