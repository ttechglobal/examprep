# Student web question presentation

## Coverage

The active practice and mock screens share `components/session/QuestionCard.jsx`; their review screens share `ReviewSession` and `ExplanationBlock`. Computer battles, live 1v1 and battle reviews use `components/battle/arena/QuestionCard.jsx`. Daily Challenge had a separate renderer. All now use the shared `StudentQuestionContent`/`ContentText`/`QuestionFigure` presentation path.

Instructions, reading extracts, attribution and verse line breaks remain distinct from the stem and answer options. Legacy extracts embedded in the stem use the existing conservative display separator. Source underline marks render as underline; explanation emphasis renders as bold/italic. Math delimiters stay intact for KaTeX. Provider HTML is rendered through safe React elements rather than executed.

Long reading blocks scroll independently. Source images and SVGs can be enlarged with keyboard-accessible close/Escape behavior and focus restoration. The question's source diagram remains separate from the optional solution illustration; source diagrams are available before answering, solution illustrations only when the mode already permits explanation review.

Reviews display the student's selected answer or “Not answered”, the correct answer, explanation, worked steps, wrong-option reasons and study tips. Legacy explanation strings and workings are supported. Missing worked explanations are stated explicitly. Lowercase imported option keys/answer letters are supported consistently by the web client and the SQL 1v1 helpers.

This pass preserves practice/study/mock/battle answer-reveal timing, game timers, scoring and XP rules. It does not redesign landing/setup/statistics pages or the native mobile app.

## Database rollout

Apply `src/supabase/migrations/20261026_student_question_content.sql` in Supabase after the existing question-instructions migration. It updates the practice question RPC and both live/closed-round 1v1 payloads with display fields. Live-round authorization and answer/explanation gating remain in place. The shared SQL display projection includes source diagrams but excludes solution text, answer keys and review metadata.

The migration is included but was **not executed against a database in this task**. The new fields cannot reach practice/live-battle clients through the old RPC definitions until it is applied. Daily Challenge reads the available row columns and projects public display fields in its API, while retaining its existing completion-based explanation/answer gating.

After applying the migration, `src/supabase/tests/student_question_content_test.sql` checks the SQL projections and lowercase option compatibility without modifying records. The existing PvP engine SQL suite should also be run in the database test environment.

## Verification

- Full Node suite: 177 passed, 6 skipped, 0 failed (183 total).
- New rendered-component tests cover passage/poem preservation, annotations, math, source/solution diagram separation, reviews, lowercase keys and answer reveal behavior.
- Browser checks used the actual components in a temporary local fixture at desktop and 390px viewport widths. Literature and maths had no horizontal overflow. Source SVG enlargement, Escape closing and focus restoration were verified.
- The temporary fixture route was removed after checking. `docs/previews/student-web-review-2026-10-26.png` records the reviewed desktop layout.
- Lint reports pre-existing effect/state and unescaped-text errors in older session/daily/battle files; the new shared components and content helpers have no lint errors.

## Theme consistency follow-up

The instruction now uses the established subtle surface and secondary text tokens, with no border or left accent. The reading block has no enclosing border, background or added padding. Passage text inherits the app font. Question text follows the existing session typography at each breakpoint; the original answer buttons, navigation, panels and explanation styling are retained.

The preview image was replaced with a screenshot of the actual `ReviewSession`/`SessionFrame` layout, rather than the earlier standalone test wrapper. Desktop and 390px mobile layouts were checked; mobile had no horizontal overflow. The eight existing student content tests passed. Temporary preview routes were removed after inspection.

### Passage surface and text-size refinement

The passage now shares the instruction's subtle theme background, with 14px padding and no decorative border. Question text is 19px on phones, 20px on compact desktops and 22px on larger desktops, at weight 700. Battle cards use their own light surface and ink values so the inset content remains readable even when the surrounding app uses dark mode.

Both light and dark palettes were checked in the actual review layout with the current source styles. Dark-mode and light-mode screenshots are in `docs/previews/student-web-review-2026-10-26.png` and `docs/previews/student-web-review-light-2026-10-26.png`. The theme preview did not persist a preference change, and the temporary preview files were removed.

### Author/source credits

Explicit final credit lines (for example, “— A. Poet, ‘River Song’”, “By William Shakespeare”, or “Source: …”) display at 13px in italics using the secondary text colour. Original wording is retained. Unmarked final verse lines remain passage text rather than being guessed to be author names. Thirteen targeted passage/student-content tests pass. The screenshots were refreshed from rendered components with the current styles; temporary snapshot-serving files were removed.
