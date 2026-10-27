# Mobile update: question content, offline media, sessions and review

**Design authority: the existing mobile app.** The owner confirms that mobile has its own more developed design. This update transfers content interpretation and behavior, not the web interface. Do not copy web screenshots, CSS, typography, colors, spacing, artwork, card shapes, button arrangement or screen layouts. Apply the requirements through the mobile app’s existing components and design system. This clarification takes precedence over older instructions to reproduce PWA appearance for this update.

Prepared from the current web working tree on 26 October 2026. This is an implementation handoff for the existing Flutter app, not a Flutter implementation or a new app design. Apply it as an update to the mobile app's existing architecture and design.

Read this before using an older PWA source snapshot. For the behavior covered here, this addendum supersedes older descriptions of question rendering, review and live 1v1 XP. Other confirmed mobile requirements remain in force. The owner reports that the question-instructions and student-content SQL migrations have been applied; remote function behavior has not been independently verified in this pass.

## 1. The main idea

Mobile and web use the same question bank. The work is to preserve and render richer content, rather than create a second version of each question. A question is more than a stem and four choices: it may contain an instruction, a reading extract, a source credit, inline annotations, maths and a required source diagram. Its explanation may contain a different diagram that belongs only to the solution.

Web loads content during use. Mobile downloads it first and reads it locally. Therefore the mobile update must cover the download/export mapping, local schema, installed-content migration, media installer, shared renderer, reveal rules, results and review. Updating only the visible question widget will leave older downloaded questions incomplete.

Do not replace local practice with a network request on every question. Preserve the current version-pinned sessions, durable storage and sequential subject download queue. This web repository does not contain the Flutter app, and its exact current local schema must be inspected before editing it.

## 2. Screens that must share the update

Use a single reusable question-content renderer, with mode-specific controls around it, for:

| Surface | Required treatment |
| --- | --- |
| Topic/custom practice, Quick 5 and Speed Round | Full instruction, passage, annotations, source image/SVG and formatted choices; preserve each mode's timing. |
| Study | Same content; preserve second-try behavior and explanation reveal. |
| Mock exams | Same content, including mixed-subject papers; hide hints and explanations until allowed. |
| Practice/mock answer review | Same original question plus selected answer, correct answer and rich explanation; add focused review. |
| Computer battle and battle review | Same content within the existing battle artwork, tiles and theme. Local battles use downloaded questions. |
| Live 1v1 current round and closed-round review | Same content from server match payloads; source figures before answering, answers/solutions after round closure. Live play remains online. |
| Daily challenge and its completed-answer review, if implemented in mobile | Same renderer; preserve attempt gating. See the provisioning caveat below. |

Other student question previews should reuse it too. Do not port admin import/reviewer screens merely because they are part of the source references.

## 3. Preserve these data fields end to end

The download mapper, serializer, local database and read model must retain the following. A new field in Supabase will not appear in an already installed pack automatically.

| Field | Meaning / rendering |
| --- | --- |
| `id`, exam, subject/topic IDs and names, year, difficulty | Stable identity and display metadata. Use IDs for association; names are labels. |
| `question_text` | The question stem. Some adapters call it `text` or `question`; normalize at the boundary. |
| `instruction_text` | Separate instruction, e.g. “Choose the option nearest in meaning to the underlined expression.” |
| `passage_text` | Reading passage, short extract or poem, retaining newlines and attribution. Legacy imports may call it `section`. |
| `passage_image_url` | An image of the reading material, distinct from the question diagram. Download the image file. |
| `options` | Ordered array or A–E keyed object; lowercase keys are supported. Preserve text formatting. |
| `correct_answer` | Existing key. May be a letter, option text or an actual numeric index in client-side legacy data. Preserve type. |
| `hint` | Optional; the mode decides whether it can be shown. |
| `has_image`, `image_url`, `image_description` | Question figure metadata. The description is accessibility/fallback text, not a replacement diagram. |
| `svg_diagram` | Legacy/top-level **source question** SVG, when present in the API DTO. This is not guaranteed to be a physical database column. |
| `explanation` | Structured object, JSON-encoded object string, legacy text or null. Retain it, rather than reducing it to one paragraph. |

Two important nested fields:

```text
explanation.question_diagram.svg        SOURCE question figure
explanation.question_diagram.image_url  SOURCE question image alternative
explanation.question_diagram.reviewed   editorial approval marker
explanation.svg_diagram                 SOLUTION illustration
```

Keep these roles separate even though the raw bank stores source metadata inside `explanation`. “Inside explanation” does not automatically mean “hidden until review.” Only the approved source figure is projected out for use before answering. Never project out solution text or the answer key along with it.

Some source metadata also includes `required`, `description`, `status`, `references` and a verification `signature`. These are editorial metadata. Do not show them as student instructions, use them to generate a new figure on the student's device, or expose review notes in live-round payloads. Mobile may retain the raw record for compatibility, but the student view should receive a deliberate display model.

Do not require an optional `sdash_id` field or a top-level SVG database column to exist. Do not query guessed columns. The canonical question UUID and content version are the mobile identity.

## 4. Content hierarchy within the existing mobile design

The important change is that the learner can distinguish the instruction, reading material, actual question and choices. Express this through the mobile app's established layout and components. The following is a conceptual content order, not a wireframe or prescribed screen design:

1. Instruction, when supplied: tells the learner what task to perform.
2. Passage, poem, extract or passage image, when supplied: the material used to answer.
3. Question stem: the specific question being asked about that material.
4. Source question diagram/image, when supplied: evidence needed to answer.
5. Answer choices, in their original order.
6. Feedback and explanation when the mode permits them.

Existing mobile layouts may keep reading material expandable, place diagrams differently alongside the stem, or use their current explanation panel/sheet. Preserve those designs while keeping all material accessible and the source/solution distinction clear. Do not infer that each item needs a new card, outline, background or heading.

Preserve paragraph breaks and poetry line breaks. An explicit author/source credit must remain associated with the extract and visually distinguishable from the question; use the mobile app's existing secondary attribution treatment, with smaller/italic text where appropriate. Keep the question readable without forcing web font sizes. Long passages must be usable without hiding the question/choices or trapping scroll gestures. Preserve the mobile app's light/dark palette, accessibility scaling, option controls, navigation, calculator, timers and battle presentation.

No web pixel values, viewport percentages, visual assets or button grids are requirements for mobile. Verify consistency against the current mobile app itself. The acceptance criterion is complete, readable content and correct interaction in the established mobile design.

Only separate a clearly marked final attribution from passage text. Examples: `By William Shakespeare`, `Source: …`, `Author: …`, or a dash followed by a recognizable author name. Preserve its wording. Do not guess that an ordinary final line of a poem is an author's name.

Illustration of meaning only:

```text
Instruction: Read the extract and answer the question.
Reading material: The evening folded gently over the fields,
                  And every path led home.
Attribution: Ada Mensah
Question: What mood does the extract suggest?
Choices: A …  B …  C …  D …
```

This demonstrates the separate roles of the content. It does not specify how the mobile screen should look, which containers to use, or how controls should be styled.

## 5. Text formatting and maths

JSON can carry formatting instructions as text. The app must interpret the supported markers rather than show them literally or discard them.

| Source | Student display |
| --- | --- |
| `<u>brief and to the point</u>` | Underlined target. |
| `**brief and to the point**` in question/passage/option content | Underlined target, matching the web's legacy source convention. |
| `*brief and to the point*` in a stem whose instruction or text mentions “underlined” | Convert that marked stem span to an underline. |
| `*a phrase*` elsewhere | Italic emphasis; do not convert all poem italics into underline targets. |
| `<strong>…</strong>` / `<b>…</b>` | Bold. |
| `<em>…</em>` / `<i>…</i>` | Italic. |
| `<sup>2</sup>`, `<sub>2</sub>` | Superscript/subscript. |
| `**important term**` inside explanation prose | Bold, not underline. |
| `$…$`, `$$…$$` | Inline/display maths. Parse these segments before interpreting asterisks or other rich-text marks. |

For example, `The speech was **brief and to the point**.` is a complete question target; the stars must become an underline in the student view. Do not flag it as lacking an underline because the JSON contains no native underline object.

Decode common HTML entities; normalize CRLF to LF; retain meaningful newlines. Convert `<br>` and paragraph boundaries appropriately. Legacy styled spans for underline/bold/italic are converted to supported marks. Strip executable script/style content and unsupported tags/attributes. Use a controlled rich-text tree rather than running arbitrary provider HTML in a WebView. Unbalanced or unsupported source should fail safely without crashing or silently inventing content.

Keep LaTeX backslashes, fractions, roots, powers, units and symbols intact. Bundle the math renderer's dependencies/fonts for offline operation; a network-hosted math script or font is not an offline implementation. Worked-step lines sometimes contain bare LaTeX; the web wraps lines containing a backslash and no dollar delimiter before rendering them as maths.

Reference behavior is in `questionContent.js`, `ContentText.jsx`, `questionPassage.js` and the supplied tests. Port the semantics to Dart; do not use the JS implementation as the native runtime.

## 6. Short extracts are valid; preserve source boundaries

A literature question may quote two lines, one sentence or a short dialogue. It does not require the full poem, chapter or book. Do not suppress a question or fabricate additional text merely because an extract is short.

Prefer explicitly stored instruction/passage fields. Remove an instruction or passage prefix from the displayed stem only when it is an exact duplicate. Do not remove a phrase simply because it looks similar.

For old records with an extract embedded in the stem, web uses a conservative display-only split at a recognizable trailing question. It does not rewrite the original. Port the tested helper or use an equivalently conservative adapter. If the boundary is ambiguous, show the intact source rather than cutting it incorrectly. Do not overwrite the installed raw content with a guessed split.

Distinguish a valid short extract from a reference such as “Read the passage above” when there is no supplied passage, passage image or recognizable embedded extract. The latter is incomplete content and should produce a meaningful content-error state or an installation validation issue. Answer disagreements and genuine missing material remain review issues; this update does not automatically approve every question.

## 7. Source diagrams and solution illustrations

Source figure selection follows the web behavior:

1. Prefer a reviewed nested source SVG from `explanation.question_diagram.svg`.
2. Otherwise use a valid legacy/top-level `svg_diagram`, if supplied.
3. Otherwise show the question `image_url`, or the reviewed nested source `image_url` when no top-level image URL exists.
4. Do not require `has_image=true` before rendering an actual usable SVG/image.

Sanitize and validate SVG before display. At minimum remove scripts, embedded HTML/`foreignObject`, event handlers and executable links; use a native SVG renderer with no script execution. For offline packs, reject or resolve external SVG dependencies during installation so the diagram does not secretly require the network. Keep its viewBox/aspect ratio, labels, arrows, angle marks, measurements and units readable. Do not crop to a fixed height that removes content.

A source diagram must be available with the question before answering. `explanation.svg_diagram` is the optional solution illustration and must appear only inside an allowed explanation view. Displaying it as the source figure can leak the solution.

The editorial workflow now holds questions requiring a source diagram until an appropriate figure is added and reviewed. Mobile is a consumer of that reviewed content. It should not generate SVG, copy prompts or ask students to repair an import. A diagram description alone does not satisfy a question that depends on a figure.

Provide tap-to-enlarge for passage images, source figures and solution illustrations. Support pan/zoom where needed, a visible close control, Android/system Back to close, and Escape/focus restoration on Windows. Expose meaningful image labels/description to accessibility services.

## 8. Offline download and installed-content migration

These are native implementation requirements arising from the richer content; the existing web RPC is not an immutable pack service.

1. Audit the export/download query and DTO mapping. Confirm every field in section 3 survives export, decoding, persistence and reading. Unknown optional fields must not crash older content readers.
2. Version the content/renderer schema. Update the SQLite/serialization model without deleting existing sessions or unsynced results.
3. Download actual bytes for passage images, source figures and solution media, not only their remote URLs. Inline SVG may be stored as sanitized UTF-8 text or a local file.
   Validate remote HTTP/HTTPS URLs when importing, then resolve installed media through the local manifest. Do not blindly port the web's HTTP-only image validator to the native display path: a legitimate installed local file/asset reference must still render. Validate local paths against the installed pack's media root.
4. Maintain a media manifest mapping the content reference to local files, integrity metadata and role (`passage`, `source`, `solution`). Preserve the original reference separately for update/debug purposes. These are proposed native storage concepts, not new Supabase columns.
5. Validate required media before marking new content ready. If a needed source image fails, keep the new installation staged with a clear retry message; do not advertise it as fully offline-ready. Keep an older valid installation usable while an update is staged. If optional solution media is missing, do not claim complete offline explanation coverage.
6. Preserve existing sequential subject/batch downloads, resumability and integrity checks. Avoid fetching an entire library automatically.
7. Existing packs that omitted new fields need a content refresh; a widget change cannot recover content that was never downloaded. Missing/optional fields should remain backward-compatible, while genuinely required missing material is surfaced honestly.
8. Pin each session/review to its question IDs, ordering and content/answer version. A later download must not change an old session's answer or figure halfway through it. Preserve versions/media referenced by saved sessions according to the native retention policy.
9. Test launch, practice, marking, source-image enlargement, explanations, results and resumed review in airplane mode after a full app restart.
10. Keep durable activity/outbox records scoped to the correct identity and retain them until acknowledged. UI filters must not delete or renumber stored answers.

Practice, mocks and computer battles continue to read installed content even when connected. Live 1v1 remains server-driven and online: locally cached question versions must not override the match payload or determine authoritative match grading.

The older mobile Supabase handoff is discovery evidence, not proof that a production pack endpoint, bearer-authenticated web API or `questions.updated_at` exists. Verify the native transport contract. Never embed service-role credentials. No new backend deployment is authorized by this document.

## 9. Explanation and answer review

Every completed-answer review should show the original question and choices, then:

- The student's selected letter **and option text**, or “Not answered.”
- The correct letter **and option text**; a paragraph alone is insufficient.
- The answer note/concept and introductory explanation, when present.
- Formula box and variable meanings.
- Optional solution SVG, distinct from the source figure.
- Numbered worked steps, retaining titles and mathematical lines.
- Reasons other options are wrong, including the option's letter/text. Put the student's incorrect selection first and identify it. Avoid repeated “A —” prefixes or duplicated option text.
- Study tip, when available.

Supported explanation fields: `concept`, `answer_note` (preferred over `correct`), `correct`, `intro`, `formula_box`, `variables_key`, `svg_diagram`, `steps`, legacy `workings`, `wrong_options`, `study_tip`.

An explanation may be an object, JSON text containing an object, plain legacy text, or null. Plain text becomes the answer-note text; null becomes an empty explanation. Steps/workings may be strings or objects with `title` and `lines`. Variable definitions may be strings or symbol/meaning objects. Normalize these shapes centrally.

If there is no worked explanation, show “A worked explanation has not been added for this question yet.” Still show a known correct answer. Do not invent working or silently show an empty panel. If the key itself cannot be resolved, show that it is unavailable rather than guessing A.

Use the mobile app’s existing explanation presentation and navigation. Do not introduce a full-screen sheet merely because the web uses one. Moving within a filtered review must move the explanation, question and selected answer together.

## 10. Preserve reveal timing and option identity

| Mode | Reveal rule to preserve |
| --- | --- |
| Practice/topic/custom | Selections may change before finish. Correct answers and explanations remain hidden until completion/review, including when revisiting a question. |
| Quick 5 | Uses practice behavior; review answers/explanations when finished. Do not revive the removed `answerMode: instant` hint. |
| Speed Round | Per-question countdown; practice-style answer/solution reveal at the end. |
| Study | Immediate feedback with a second try after an incorrect first answer; reveal the final answer/explanation when resolved under the existing study logic. |
| Mock | Practice-style end reveal; no hints. |
| Computer battle | Submission/timeout locks a round; correct-answer feedback after resolution, full explanations at battle-end review. |
| Live 1v1 | Server controls deadlines, closure and marking. Open-round data excludes correct answer/solution; closed rounds supply review data. |
| Web daily challenge | Two attempts. Do not reveal the correct key/explanation after an incorrect first attempt; reveal when the question completes. |

The local pack may contain an answer for offline marking. That does not authorize the UI to reveal it early, and is not a claim that offline storage makes answer keys secret.

Preserve choice ordering. Support arrays and keyed A–E/a–e options. Normalize lowercase answer letters and surrounding whitespace. Existing client compatibility also accepts an exact option-text answer or an actual numeric index; do not confuse a numeric string with a numeric index without an explicit source contract. Do not reorder options alphabetically by text or shuffle them without remapping keys and saved selections. Reject malformed/gapped choices during pack validation rather than silently shifting their letter identities.

## 11. Results and focused review

### Practice and mock

- Count the actual question list. Missing answer records count as skipped; extra records do not inflate the score.
- Show correct, incorrect, skipped, accuracy and rounded duration. Identify the actual mode: Practice, Study, Quick 5, Speed Round or Mock Exam.
- Keep mixed-subject/topic results separate by subject/topic identity, even if two subjects have a topic with the same name. Show weakest topics first; disclose that a list is limited when showing only the six lowest-scoring topics.
- Keep “Review Answers” and add direct “Review incorrect and skipped” when appropriate.
- Filters: All answers, Needs review, Incorrect, Skipped. Needs review means incorrect + skipped.
- Filter by original question indexes/IDs. If question 7 is the first match, display question 7, not question 1. Keep stored answers and the explanation associated with question 7.
- Previous/Next move through the active filter. Jumping to an excluded question using the full grid/subject tab restores All answers. Handle empty filters with a clear message and a way to return to all answers.

### Computer and live battles

- Results distinguish incorrect from unanswered. Offer both all-answer review and incorrect/unanswered review.
- Shared review filters: All answers, Needs review, Incorrect, Unanswered. Include counts, preserve original numbering and reset reading position when changing filters/questions.
- Present these filters with controls appropriate to the existing mobile battle design; no web button grid is prescribed. Retain Previous/Next, Finish review and return-to-results behavior. Empty filters retain working controls.
- Count only closed/played rounds for an early-ended live match. Unplayed planned questions are not unanswered rounds.
- A null selection and null/missing key must never compare as correct. Invalid/out-of-range choices are not correct answers.

### Daily challenge, where applicable

- Completed results can reopen all answers or Needs review. Here Needs review includes an incorrect question **or a correct question requiring the second attempt**. This differs intentionally from practice/battle filters.
- Preserve original numbering, all attempted choices and the final selected answer. Completed options remain read-only.
- Use the actual available question count instead of hardcoding two in results. Surface submission failure and retain the selection for retry.
- This does not decide native daily challenge scheduling, offline provisioning, ranking or anti-cheat policy. The older mobile plan has separate locally generated weekly challenges. Do not treat that as permission to turn the web daily leaderboard into an unrestricted offline feature.

## 12. XP and server authority

The rendering work does not change award policy. Current repository rules differ by activity:

| Activity | Current repository award |
| --- | --- |
| Saved practice/mock sessions | 5 XP per correct answer. |
| Computer battle | 5 per correct + 10 for win / 5 for draw / 0 loss bonus. |
| Live 1v1 | Existing SQL awards 10 per correct + 20 for win / 10 for draw / 0 loss bonus. The web display was corrected to match this. |
| Web daily challenge | 50 for first-try success, 25 for second-try success, 0 when both attempts fail. |

Battle points/speed bonuses and XP are different quantities. Do not calculate XP from the displayed battle point total. Live 1v1 awards/leaderboards are server-authoritative. Offline practice/computer results may be calculated locally for immediate presentation, then reconciled with the native sync contract and server validation. Do not duplicate an award on retry or rewrite historical balances merely to match a display update.

The old general statement that every battle uses the 5/10/5 formula is incomplete for live 1v1. See `lib/pvp/results.js`, `pvp_finish` and `battle_results_from_pvp`. The source files document expected behavior; a live-server smoke test is still needed.

## 13. Implementation sequence

1. Inspect current Flutter models, serializers, SQLite version, pack schema, installed fixtures and session version pinning. List dropped fields and missing assets.
2. Extend download/local contracts and backward-compatible migrations first. Preserve old data and the unsynced outbox.
3. Build the shared native rich-text/question/figure renderer and explanation model. Exercise it against the supplied examples and web test cases.
4. Wire practice and mock, then their results and filtered reviews.
5. Wire computer battles and battle review; separately update live round/closed-round DTOs without changing server authority.
6. Update daily completed review if that feature is already supported; keep unresolved daily provisioning policy explicit.
7. Validate old/new packs, required-media failure, interrupted updates, offline restart/resume, theme/layout/accessibility, filter navigation and grading parity.
8. Verify the changes within the current mobile app on Android phone and Windows desktop, including accessibility and consistency with its existing design. Web screenshot matching is not an acceptance criterion.

This handoff does not request a new design, a switch away from Flutter/SQLite, a fresh app scaffold, an AI diagram generator in the student app, or a backend migration from the mobile repository.

## 14. Acceptance checklist

The update is complete when all of these pass:

- An English question with `**target**` renders an underline; a single-star target under an underline instruction also works. Explanation double-star emphasis stays bold.
- Two-line literature extracts are accepted, retain line breaks, and do not fetch/fabricate a full poem. Explicit author credit is small/italic; an ordinary last verse line stays in the passage.
- Instruction/passage/stem display once each, including conservative handling of old embedded extracts.
- Fraction/root/power/subscript content renders in the stem, options and worked explanation without network dependencies.
- Reviewed nested source SVGs display before answering, including when `has_image=false`. Top-level/legacy source media remains compatible. Solution SVGs stay hidden until explanations are allowed.
- Passage images, source images and solution illustrations can be opened offline after restart, including zoom/close/Back/Escape behavior.
- A failed required-media download does not produce a falsely ready pack. Existing usable downloads/sessions remain intact after a failed update.
- Upper/lowercase option objects and answer letters produce the same grading results as the source test vectors; no accidental answer shuffling occurs.
- Selected answer, correct answer and explanation remain aligned in practice/mock/battle/daily review, including skipped/null selections.
- Filtered review preserves original numbers, handles zero matches, and keeps previous/next/explanation navigation consistent.
- Mixed-subject summaries do not merge unrelated topics. Early-ended live battles exclude unplayed rounds.
- No active-mode reveal rule changes merely because answers/explanations are downloaded.
- Saved old sessions remain tied to their original content/answer version when a pack updates; pending activity survives restart and identity changes under the existing native policy.
- Phone and Windows layouts, light/dark themes, large text and accessible labels are checked within the mobile app. New UI remains consistent with the established mobile design; matching web screenshots is not required.

## 15. Source references and limitations

The revised portable ZIP contains this detailed behavioral guide, representative synthetic JSON examples and a start-here instruction. It deliberately contains no web screenshots, CSS, UI source or visual assets. It is a descriptive handoff, not a complete app or runnable Flutter project. The earlier screenshot/source package is superseded for this task.

The following web paths identify the evidence behind the descriptions if implementation details need checking in the web repository. They are not UI templates or required native dependencies, and are not bundled in the revised descriptive package:

| Concern | Web reference |
| --- | --- |
| Content order/theme | `src/components/student/StudentQuestionContent.jsx` and `.module.css` |
| Inline text rules | `src/components/ui/ContentText.jsx`, `src/lib/questionContent.js` |
| Embedded reading/credit | `src/lib/questionPassage.js` |
| Figure source/sanitization/zoom | `src/components/ui/QuestionFigure.jsx`, `src/lib/studentQuestionContent.js`, `src/lib/questionDiagrams.js`, `src/lib/safeSvg.js` |
| Marking/options | `src/lib/answers.js`, `src/components/session/SessionUtils.js` |
| Explanation fields | `src/components/session/ExplanationBlock.jsx` |
| Practice/mock review | `src/lib/sessionReview.js`, `src/components/session/ReviewSession.jsx`, `SessionSummary.jsx` |
| Battle review/results | `src/lib/battleReview.js`, `src/components/battle/arena/BattleReview.jsx`, `BattleOutcome.jsx`, `src/components/battle/pvp/MatchResults.jsx` |
| Daily review | `src/lib/dailyReview.js`, `src/app/student/daily-challenge/page.js` |
| Current API/SQL shape | Student questions/daily routes and `src/supabase/migrations/20261026_student_question_content.sql` |
| Regression vectors | `tests/student-question-content.test.mjs`, `question-content.test.mjs`, `session-review.test.mjs`, `battle-review.test.mjs`, `daily-review.test.mjs`, `pvp-results.test.mjs` |

The student-content migration projects safe display fields into practice and open/closed live battle data. Open live rounds still exclude answers and solution explanations. Practice pack exports need their own complete content contract; the migration does not install native packs or add a mobile download endpoint.

Web verification includes automated rendered-component/domain tests and local interactive fixture checks. A real daily-attempt/two-player smoke test remains outstanding. These checks establish web behavior, not certification of the Flutter implementation or every production flow. Existing mobile designs remain authoritative.

## Copy-paste instruction for the mobile implementation chat

> Read `question-rendering-update-2026-10-26.md` and the supplied synthetic JSON examples before making changes. The mobile app’s existing design is authoritative: do not reproduce the web UI, request web screenshots for design matching, or copy web layout/styling. Examples illustrate content semantics only. Update the existing Flutter app to preserve and render the same rich question content as the current web app, while continuing to read practice/mock/computer-battle content from downloaded local packs. Audit export mappings, DTOs, SQLite storage, installed pack versions and downloaded media before editing widgets. Preserve separate instructions, passages/extracts, author credits, supported inline marks and maths. Keep approved source diagrams visible with the question and solution illustrations gated with explanations. Port answer/option compatibility, rich explanation review, actual-count summaries and filtered review with original numbering. Preserve each mode's reveal timing, the current design and version-pinned sessions. Do not generate missing diagrams on the student device, redesign the app, discard pending results or assume proposed native endpoints exist. Live 1v1 remains online and server-authoritative. First report the gaps found in the existing mobile implementation, then implement in working slices with offline restart, migration, grading, media and mobile design-consistency checks. This is a descriptive behavior handoff, not a web design reference; do not deploy backend changes from it.
