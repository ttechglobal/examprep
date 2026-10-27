# Daily challenge results and review

Completed daily challenges now offer all-answer review and a focused review for incorrect answers and questions solved on the second attempt. The existing daily question card shows the question, all options, selected answers, correct answer and shared explanation content. Review is restricted to completed questions and preserves original numbering. Existing theme variables and daily card styles are reused.

Results use the available question count instead of assuming two questions. Answer submission failures show an error and retain the selection for retry. Active question cards reset their local selection when the question changes.

Validation: `node --experimental-vm-modules --test tests/*.test.mjs` reports 195 tests, 189 passed, 6 skipped and no failures. Daily-review tests cover second-attempt successes, exhausted attempts, active questions and original numbering. ESLint still reports existing daily-page effect, dependency and apostrophe issues; browser visual QA is pending.

The pending student-content database migration, battle and daily responsive/theme visual checks, and reconciliation of live 1v1 XP remain before rollout. Native mobile work follows the web pass.
