# Student battle results and review

CPU and live 1v1 results now offer a direct review of incorrect and unanswered questions alongside the full answer review. The shared review lets students switch between all answers, needs review, incorrect and unanswered; original question numbers remain visible. An empty filter keeps the controls and return action available.

Results distinguish incorrect answers from unanswered questions. CPU counts follow the actual question list; live results continue to count only played rounds when a match ends early. Setup describes answer locking and explanation availability. Existing battle buttons, panels and theme remain in use.

Validation: Node tests with `--experimental-vm-modules`: 193 total, 187 passed, 6 skipped. The new tests cover review indexes, timeout handling, invalid choices, absent answer keys and early/empty results. ESLint reported only existing live-match effect/unescaped-apostrophe errors. No interactive visual QA was performed for this pass.

Remaining: daily-challenge results/review, responsive/light/dark visual QA, pending student-content database migration, then native mobile. The existing `src/lib/pvp/results.js` TODO also records a difference between client XP display rates and SQL award rates; scoring was not changed here and needs reconciliation with deployed database behavior.
