# Student web verification

The user reports applying both question-instruction and student-content migrations. No remote SQL was run by the agent.

## Live 1v1 XP

The results display and immediate local points update now mirror the existing `pvp_finish` and leaderboard rates: 10 per correct answer, 20 win bonus or 10 draw bonus. Computer/practice rates remain unchanged. No award functions, balances or historical records were modified. Tests cover both player roles, win/draw/loss, early finishes and unfinished matches, and compare the documented SQL formulas. This verifies repository SQL, not remote function definitions.

## Layout checks

Rendered actual daily recap and completed question components with synthetic completed-question fixtures at a 390px container width in light and dark themes. Verified author credit, passage, options and explanation presentation. Rendered actual live match results with an early-finish fixture: four of five rounds, two correct, one incorrect, one unanswered, 40 XP.

Screenshots are in `docs/previews/student-daily-results-light-2026-10-26.png`, `student-daily-review-dark-2026-10-26.png` and `student-live-battle-results-2026-10-26.png`. Temporary routes and HTML fixtures were removed. These static SSR checks do not verify interaction or full device viewport behavior.

The available local browser account shows a required exam/subject setup prompt. No account settings or real challenge attempts were changed. Full signed-in daily-attempt and two-player match smoke tests remain outstanding, along with full responsive battle-review checks.

Validation: 199 tests total, 193 passed, 6 skipped, zero failures (`node --experimental-vm-modules --test tests/*.test.mjs`). Existing page lint issues reported in the prior passes remain separate from this change.

## Interactive review follow-up

Used a temporary local React fixture page to exercise actual BattleReview and the current daily DoneScreen/QuestionCard function bodies (copied directly from the daily source for the fixture, with no backend calls). Verified daily needs-review, switching to all answers, closing review, and disabled completed answer choices. Verified battle needs-review navigation from original question 2 to original question 3, unanswered-only filtering, and finish-review return. Browser checks covered a true 390px iframe viewport and the 1280px desktop viewport. This still does not constitute a real daily attempt or a two-player network match.

Polish from this pass: battle filters use a stable two-column grid; changing filters also resets scroll position. Loading tips now distinguish computer and live 1v1 XP. Two added battle render tests check empty-filter recovery and original numbering/correct-answer presentation; all five battle-review tests pass. Changed BattleReview and test files pass ESLint.

The dev browser retained stale assets after some edits, so the final CSS polish was source-checked; it was not independently re-rendered with fresh assets. Screenshots document the interactive phone fixtures. Temporary fixture route files were removed after testing.
