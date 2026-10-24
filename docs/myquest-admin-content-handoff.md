# MyQuest admin content preservation and student handoff

Implemented locally on 22 October 2026. Existing question records have not been deleted or rewritten. Student screens/APIs have not been changed in this work.

Update: a subsequent authorized cleanup archived 360 legacy English/literature questions and verified the live provider/database. See `docs/language-question-cleanup-2026-10-22.md` for the exact counts, additional fixes and remaining acceptance checks. The original implementation notes below describe the first pass.

Final follow-up: `docs/question-import-review-2026-10-22.md` records permanent deletion of those 360, formatting improvements to 275 retained questions, 134 inactive review drafts, the persistent flagged-draft workflow and a successful network-enabled production build. Existing stored stems may repeat `instruction_text` as a prefix for compatibility with current student clients; a renderer may remove that exact duplicate prefix for display without rewriting the question.

## Admin behavior

- Raw and enriched imports normalize source paragraphs, line breaks and inline formatting. Recognized HTML becomes safe text plus allowlisted marks; scripts, styles and event attributes are not executed. Inline span styles for underline, bold and italic are converted to explicit marks. Unknown object-shaped source content is flagged for review instead of becoming `[object Object]`.
- Enrichment prompts include the instruction, full passage, passage-image reference and stable question ID. They explicitly permit a missing-context response without a guessed answer. Image URLs alone do not mean an external model has seen the image.
- Matching prefers source ID, checks the snippet and refuses ambiguous legacy snippet matches. It does not silently match by array order. Short exact stems can match too.
- Admin cards and content preview show instructions, complete passages, safe passage-image links, normal-weight stems and formatted options. The preview is named “Content preview”: it is not a claim that current student screens already support the new contract.
- Reviewers can correct the instruction, passage, image URL, stem and options, then rebuild the enrichment prompt from the corrected source. Any edit invalidates the old enrichment until it is run again. Source corrections do not invent missing targets or extracts.
- Both raw bulk import and enriched save enforce content checks on the server. Detected missing referenced passages, missing underline targets, malformed inline marks, unsupported source structures, matching failures and explicit missing-context responses cannot be activated through these saves.
- Hidden questions retain passage/instruction/image content and review reasons; restoring refuses unresolved reasons. After independently resolving them, the hidden restore API accepts an explicit reviewed `updates.content_review_issues: []` along with corrected content. Held IndexedDB groups retain their raw objects, and a partial/failed save does not delete the group. Held saves no longer fall back to an unrelated subject.
- “Figure of speech” is no longer classified as a missing figure by the shared/import image detector.

Detection is deliberately conservative, not a proof that every question is complete. Review actual provider material, especially unusual section structures or formatting encoded in external CSS. No passage is inherited from a neighboring question without an explicit source relationship. No book title is automatically treated as a subject or remapped to a different subject.

## Deploy before importing

Apply `src/supabase/migrations/20261022_question_instructions.sql` before deploying the new admin writes. It adds `questions.instruction_text`, plus passage text/image, instructions and review-reason storage on the optional hidden_questions table. It does not delete questions or change student RLS policies. The migration has been prepared, not applied to a live database in this task.

Use a small actual MyQuest paper sample to verify source fidelity after deployment before a large reimport. Check the deployed schema, the original source payload, enriched review and saved record. Existing data cleanup is a separate operation; decide exact subjects/years and handle deletion/reimport together after acceptance. Do not delete all English records before this check.

## Contract for student web / mobile / offline consumers

Preserve these independent fields in every question DTO, session cache and review object:

| Field | Meaning |
| --- | --- |
| `instruction_text` | How to answer; display separately before the reading material/stem. Nullable. |
| `passage_text` | Complete reading material, extract or quotation; retain paragraphs and poem line breaks. Nullable. |
| `passage_image_url` | Source passage image; make it readable/enlargeable. Nullable, HTTP(S). |
| `question_text` / DTO `text` | Question stem; normal-weight reading text. |
| `options` | Option strings; annotations can occur inside words here too. |

Text uses literal newline boundaries and these safe inline marks: `<u>`, `<strong>`, `<em>`, `<sup>`, `<sub>`. Do not inject strings as executable HTML. Interpret the allowlist as native text spans/elements; all other content remains text or goes through the same normalizer. Legacy `**target**` in question/passage/options is shown as underline by the admin content renderer. Do not apply that legacy interpretation to explanation Markdown, where `**…**` means bold.

Examples:

```json
{
  "instruction_text": "Choose the option opposite in meaning to the underlined word.",
  "passage_text": null,
  "question_text": "The room was <u>tranquil</u>.",
  "options": { "A": "Noisy", "B": "Peaceful" }
}
```

For oral English, `<u>ch</u>urch` underlines only the letters. A poem may contain `Line one.\nLine two.\n\nNext stanza.` Source attribution remains in the supplied text; this version does not add a separate bibliographic data model or manufacture book/chapter/page references. Personal student highlights/notes are not source annotations and are outside this contract.

Known student work still required: stop returning `instruction_text: null` in the student questions API; render passage text and images in the shared session QuestionCard; use a safe rich-text renderer for stem/options and preserve the fields in battle, review, mock and offline transports. Current student consumers can still display literal formatting tags until that work is done.

## Verification

Run `node --experimental-vm-modules --test tests/question-content.test.mjs tests/myquest-content-api.test.mjs tests/admin-neco.test.mjs`.

Tests cover normalization, source markup safety, span underlining, paragraph/verse boundaries, prompt context, matching similar stems against different passages, missing-context responses, server save blocking, raw bulk-import dry-run mapping, hidden-queue context retention, and server-rendered semantic preview output. Database/provider calls in API tests use fixtures. Targeted ESLint reports no errors; existing import-page warnings remain. JSX compilation was checked with the installed Next compiler. A production Turbopack build remained in the compile phase without a result and was stopped; a full production build and authenticated browser/live-provider acceptance are not claimed.
