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

See `docs/notifications.md` (automatic reminders, weekly-mission messages, the admin sender, no emojis).

## Removed

- **Core Topics** (admin page, API, table).
- **Access codes**: the code was already removed. The `drop table access_codes` line in
  `20261009` is commented out; check the table holds nothing you need, then run it by hand.

## Left alone

`subtopics.exam_frequency` (hand-set 1 to 5 from the lesson-building days). Not the real frequency.

## Update: the Missions page and button

Run `20261012_trial_for_everyone.sql` and `20261013_school_roster.sql` too (after `20261011`).

- **The battle hub always has a Missions button** (a full-width row above Leaderboard and Settings) saying where the student
  stands: "1 of 3 done · 2 days left", "Mission complete! +50 XP", "Sign in to get weekly missions", "Choose your subjects to
  get missions". A red dot shows when missions are still open in the last 3 days of the week.
- **`/student/battle/missions`** lists the missions with progress. Tapping one opens the battle setup already filled in. It
  explains itself when there are none (guest, no subjects, nothing ready yet) with a button for what to do.
- **Why missions could be missing.** The old inline card hid itself without a word when there was nothing to show. Two causes
  are fixed: the app keeps a student's subjects on the phone first, so a new account might have none saved yet (the phone's
  subjects are now sent with the request and used when the account has none); and a subject whose past papers aren't all
  imported had no eligible topic (the best-stocked topics now fill in).
- Opening the Missions button from the hub costs one request; going on to the page within 15 seconds reuses it.

## Update: the trial and the admin pages

- `20261012_trial_for_everyone.sql` gives every student without Premium a fresh 14 days from the moment it runs. Students see
  the mascot's welcome once more ("You have 14 days of Premium").
- Admin Analytics keeps each view for 5 minutes (server and page; "Refresh" counts again), and no longer fetches twice on
  first load. The Students list counts in one pass, and only when year, school or search change. The Schools list is kept
  for a minute. See `src/lib/server/memo.js`.
