# Practice setup, results and focused review

This pass uses the existing session summary cards, action rows and subject-tab styling. It does not introduce a new design or change scoring, answer reveal timing, timers or XP.

- Quick 5 setup now states that answers/explanations are reviewed at the end, matching the current session implementation. The unused `answerMode: instant` hint was removed. Study setup describes the second try after an incorrect first answer; practice setup states that selections can be changed before finishing.
- Summary counts are based on the actual question list. Missing answer entries count as skipped; extra answer records do not inflate results. Fractional durations display as rounded seconds.
- Study, Speed Round and Quick 5 summaries identify the played mode. Topic breakdowns keep matching topic names from different subjects separate and disclose when only the six lowest-scoring topics are shown.
- Summary retains Review Answers and adds a direct Review incorrect and skipped action when needed. Practice and mock pages pass the requested filter into ReviewSession.
- Review filters cover All answers, Needs review, Incorrect and Skipped. Previous/Next and the explanation sheet move through matching original indexes, keeping original question numbers and answer associations. Directly jumping to an excluded question via the full question grid or a subject tab returns to All answers. Empty filters show a clear message and an action to show all answers.

Verification: 184 Node tests passed, 6 skipped, no failures. New tests cover missing answer records, mixed-subject topic names, filter indexes, summary labels and initial filtered review rendering. Lint has existing Date.now/ref findings in SessionFrame; the new helpers, summary and review changes have no new lint errors. `docs/previews/student-review-filters-2026-10-26.png` is a rendered component preview in the existing session styling. Temporary snapshot/serving files were removed after checking.
