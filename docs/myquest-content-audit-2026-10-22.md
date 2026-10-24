# MyQuest passages, excerpts and annotation audit

Date: 22 October 2026

Scope: current working-tree implementation, including existing uncommitted changes. Read-only code audit; no production database queries, provider requests, or browser verification. No question records or application behavior changed. Findings apply across subjects, with particular consequences for English, Use of English and Literature in English. Actual affected-record counts and MyQuest payload shapes remain unverified.

## Confirmed findings

### P1 — Main student sessions omit the context required to answer

`src/components/session/QuestionCard.jsx` renders the stem, QuestionFigure and options, but never reads `passage_text`, `passage_image_url` or `instruction_text`. Practice, mock, demo and session review use this card. QuestionFigure only handles the question image/SVG, so it does not fill the gap.

`src/app/api/student/questions/route.js:89` explicitly sets `instruction_text: null`, while returning passage text and passage image. Adding an instruction display alone will therefore not repair the full path.

Impact: a comprehension question can reach the student without its reading passage; a synonym/antonym question can lose the instruction distinguishing the two tasks. Existing content in storage may be recoverable through display fixes.

### P1 — Enrichment solves passage-dependent questions without their passages

`src/lib/questionParser.js:869` builds questionLines from `q.question` and `q.option` only. `q.section` is omitted. Yet `mergeImportEnrichment` later assigns that same section to `passage_text` (line 1228).

The prompt requires a best answer even when unsure, and merge prefers `verified_answer` over the provider answer. Therefore a missing passage can produce an unsupported answer/explanation that becomes the saved answer. An answer disagreement is not a sufficient safeguard: agreement does not establish that the answer was grounded in the passage.

Fix: provide complete context before requesting a solution; return a missing-context status and hold unresolved questions for review instead of forcing a guess.

### P1 — Underlines have no working representation through this pipeline

`src/lib/questionParser.js:281` and `src/lib/subjectModules.js:781` prescribe `**word**` for underlined source text. `src/lib/mathRenderer.js:378` renders prose with escaped literal text; it does not parse Markdown bold, italic or underline. HTML such as `<u>` is escaped too. This protects against raw HTML execution but cannot reproduce the intended annotation.

The enrichment output schema is explanation-oriented. Merge preserves the raw stem/options and does not apply corrected stem markup or returned instruction_text. Subject rules asking the model to supply these fields do not establish a working preservation path.

Impact: both whole-word underlining and letter-level pronunciation targets can be invisible or appear as literal markup. Do not infer the target from the answer; an ambiguous target requires source review.

### P1 — Instructions are requested but discarded across multiple boundaries

The subject module requests instruction_text, but the enrichment example schemas omit it, merge does not return it, the bulk question POST does not write it, question PATCH does not allow it, and the student API returns null. These are separate breaks, requiring an agreed storage contract before adding fields to SQL writes. This audit does not establish whether the deployed database has an instruction column.

### P2 — Typography obscures meaningful emphasis and long-text structure

`src/components/session/session.module.css:453` gives the whole stem font-weight 800 (with desktop size 26px). A long embedded excerpt receives the same question-heading treatment. MathText does not turn paragraphs, poetry line breaks, quotations, attribution or speaker labels into semantic blocks, and its normal inline output does not itself preserve whitespace.

Fix: separate instruction, reading content, attribution and stem. Use normal-weight reading text, generous line-height, preserved paragraphs/poem lines, and distinct actual underlining. Keep bold for intentional emphasis.

### P2 — Preview and student behavior disagree

The raw MyQuest preview (`src/app/admin/questions/myquest-import/page.js:212`) shows section text in a three-line clamp and uses plain React text for stems/options. Its enriched preview also uses plain text for passages. The older quiz card and student preview support passage/instruction sections; the main session card does not. Battle displays passage via MathText but its card has no instruction prop.

Impact: an administrator can approve a passage-bearing question in preview while students cannot see its passage in practice/mock. Preview must use the same content renderer as student sessions, with a full-text expansion for long material.

### P2 — Section content is assumed to be passage content

Raw bulk import (`src/app/api/admin/myquest/import/route.js:78`) converts `mq.section` directly to passage_text; enrichment merge does the same without classifying it. There is no distinction here between section heading, answer instruction, prose passage, poem, dialogue or attribution. Alternative provider fields and structured section objects are not normalized in this content path.

This is a code limitation, not proof that MyQuest currently sends every one of those shapes. Capture real samples before designing provider-specific mapping. Do not automatically attach a previous question's passage to subsequent questions unless a source group/reference explicitly supports that relationship.

### P2 — Incomplete context can be published as active content

Raw bulk import checks question/answer presence and option count, then sets is_active true. It does not validate missing referenced passages, missing underline targets, missing instructions or malformed excerpt content. The inspected tests have no passage/underline/instruction-specific coverage.

Use context-quality checks on both raw and enriched saves. Hold questions with unresolved dependencies; retain explicit review reasons. Review previously imported answer keys whose enrichment omitted required context.

## Recommended content contract

Use one subject-independent representation and one renderer across import preview, admin editing, practice, mock, battle, review and offline consumers.

- Instruction: how to answer, distinct from the reading material.
- Reading content: typed blocks for prose, verse, dialogue, quotation and tables where needed; preserve paragraph and line boundaries.
- Source attribution: work title, author, chapter/page/line references only where supplied and verified. Do not manufacture citations.
- Stem and options: inline marks with separate semantics for underline, bold, italic, superscript/subscript and letter-level targets. Use a safe allowlist/structured representation; never insert provider HTML directly.
- Provenance: provider question ID, original payload or controlled source snapshot, normalization version, source grouping/reference and review status.

Keep existing passage_text as a backwards-compatible input during migration. Explicit source grouping can later support passage reuse; each independently selected question must still resolve its required context. Source underlines and student-created highlights/notes are different features and should have separate storage if personal annotations are added.

For Lekki Headmaster, treat the work title as a work/reference attribute rather than assuming it is always the subject. Verify actual provider catalogue placement and the intended ExamPrep subject mapping; the existing aliases do not establish a specific Lekki mapping. A book-recall question need not have an excerpt. A question explicitly referring to an extract must carry that exact extract. Do not invent chapter or page references.

## Repair order and acceptance checks

1. Restore context visibility in the shared session card and pass instructions through the API/storage contract. Verify practice, mock and review with the same passage fixture.
2. Include source context in enrichment, use stable provider IDs for matching where available, and gate unresolved context before activation. Test two similar stems against different passages so explanations cannot cross-match through the existing prefix matcher.
3. Introduce safe rich content rendering and normalization, then update all previews and question surfaces. Preserve source text and distinguish intentional normalization from editorial corrections.
4. Review existing English/literature records for absent passages, visible markup, missing targets and potentially unsupported enriched answers. Reimport only after checking deduplication/update behavior; a display fix cannot restore formatting that was absent from the imported source.

Minimum fixtures: multi-paragraph comprehension shared by several questions; synonym versus antonym instruction; underlined letters within a word and within options; poem with stanza breaks; drama extract with speaker labels; attributed quotation; long mobile passage; missing passage; unknown underline target; escaped provider HTML; mixed maths and prose; standalone book-recall question. Validate import → prompt → merge → save → API → render, including review and battle. Check keyboard/screen-reader readability and passage access while choosing an answer.

## Evidence still needed

Inspect a small authorized sample of real MyQuest English, Literature and Lekki Headmaster payloads across available JAMB/WAEC years. Establish whether the provider includes rich markup, separate passages/instructions, source grouping, and attribution before defining exact adapters. Query deployed schema and representative stored questions separately to quantify damage and determine whether each issue originated upstream, at import, at save, or at render. This report makes no claims about live paper availability or specific affected production records.
