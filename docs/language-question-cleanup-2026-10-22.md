# English and literature cleanup — 22 October 2026

Current status: the 360 archived records described below were subsequently permanently deleted at the user's explicit request. Of the retained 471, 134 are now inactive flagged review drafts and 337 remain active; 275 received separate source instructions. See `docs/question-import-review-2026-10-22.md` for the final verification and import-review improvements. The original archive report below is retained as an audit record.

## Live database result

All 831 existing questions in the five matching WAEC/JAMB subject groups were read, with pagination and a full local snapshot before mutation. The cleanup archived 360 specific question IDs using the application's normal `is_active = false` deletion behavior. All 360 were verified inactive afterward. No records were permanently deleted. No other subject or exam was targeted.

| Subject | Exam | Inspected | Archived | Active afterward |
| --- | --- | ---: | ---: | ---: |
| English Language | WAEC | 200 | 52 | 148 |
| English Language | JAMB | 473 | 203 | 270 |
| Literature in English | WAEC | 38 | 26 | 12 |
| Literature in English | JAMB | 80 | 79 | 1 |
| The Lekki Headmaster | JAMB | 40 | 0 | 40 |
| Total | | 831 | 360 | 471 |

Coverage counts were recomputed successfully for all 18 affected subject/exam/year buckets. Years inspected: WAEC English 2005–2008, WAEC Literature 2024, JAMB English 2014–2025, JAMB Literature 2024–2025, and Lekki Headmaster 2025. There was no WAEC Lekki Headmaster subject row in the connected database.

The selection covers legacy passage/section fields, excerpt or annotation references, embedded literary reading material, and damaged encoding. It is a policy for removing the old content types the user authorized replacing; it is not a claim that every selected question was impossible to answer. Some excerpts were embedded in a flattened stem rather than absent. Standalone book recall, literary definitions and unrelated grammar sentences were retained. All 40 Lekki questions were inspected as standalone book-recall questions and do not require removing an absent excerpt merely because a book/chapter title is quoted. This is not an independent fact-check of their answers.

## Backup and receipt

Private, Git-ignored local folder:

`handoff-output/question-content-cleanup/2026-10-22T11-50-51-865Z/`

- `question-snapshot.json`: full original rows and scoped subject inventory.
- `inventory.json`: initial broad screening, including deliberately overinclusive candidates. This is not the final deletion list.
- `cleanup-plan.json`: exact 360 selected IDs and per-record reasons.
- `cleanup-receipt.json`: actual archived IDs, verified post-update counts and coverage refresh results.
- `provider-*.json`: representative live MyQuest samples inspected without importing records.

Archived records remain in the database for recovery/history. Do not re-run the apply script against this already-completed snapshot; its preflight will detect changed rows and abort. `scripts/audit-language-questions.mjs` is read-only and can generate a fresh inventory. The apply script only operates on an explicit plan and preflights scope and original records; it never issues an unfiltered delete.

## Additional admin fixes from live verification

The previous implementation was not fully verified against current provider payloads. This pass found and fixed additional issues:

1. Current MyQuest samples use `options` and `correct_answer`. The latter was not normalized to the answer shape used by import and answer comparison. Raw bulk import could reject these valid source rows. Both shapes are now supported and tested.
2. MyQuest IDs restart at 1 within each paper. Raw duplicate lookup is now scoped to the same subject, exam and year, ignores inactive rows, compares full text/context instead of truncated prefixes, detects repeated identical rows within a batch and fails visibly on lookup errors. Archived questions no longer prevent a corrected raw reimport.
3. MyQuest often embeds extracts and the trailing question in one string. Enrichment can now return `source_content.passage_text` and `source_content.question_text`. Merge accepts this only when their concatenation reproduces the entire original source exactly apart from whitespace. Rewrites/omissions are blocked. Long Literature extracts must be separated before activation. Source attribution stays with the original reading material; no bibliographic information is invented.
4. The general admin question-bank preview now uses the safe content renderer for passage/instruction/stem/options and is labeled “Content preview”. This does not imply the student renderer has been updated.
5. Ordinary uses of “figure”, including “fertility figure” and “figure of speech”, no longer get held as missing diagrams; explicit figure references still do.
6. The live questions table has `instruction_text`, confirming that migration is present. It does not have `updated_at`. The first cleanup attempt failed before any mutation because of that assumption. Cleanup then used the actual schema, and the existing admin edit/archive endpoint now retries without that optional timestamp only for the specific missing-column error. Other errors are not swallowed. No additional migration is needed for this compatibility fix.

## Is the admin work finished?

The main content-preservation and review flow is implemented locally and ready for an administrator's acceptance trial. Live database inspection, cleanup and representative provider checks are complete. Full sign-off still requires the authenticated end-to-end import trial, especially editing an ambiguous underline, regenerating enrichment, reviewing a split excerpt and verifying the saved record. Student rendering remains a separate phase.

MyQuest's inspected English samples say “underlined” but represent some targets only with quotation marks; inspected literary samples often flatten original poetry lines. The system cannot verify lost source typography automatically. It intentionally blocks unresolved targets/context and requires review against a trustworthy original. A quoted word alone is not automatically converted to an underline. Splitting an excerpt preserves words but cannot prove an original stanza layout that the provider has already lost.

Remaining optional design work includes a structured bibliographic model, shared passage groups and a source-formatting editor that does not expose inline-mark syntax. Those are not prerequisites for the current reviewed import flow, and should not be described as already implemented.

## Validation

Twenty targeted tests passed across content normalization/rendering, provider shapes, exact extract splitting, missing-context save gates, API import/hidden queues, cleanup classification and timestamp compatibility. JSX compilation is checked separately. Lint for the newly expanded question-bank page exposes pre-existing hook-effect and apostrophe errors; these are outside the content-preview edits. Production webpack build could not complete because this environment cannot resolve `fonts.googleapis.com`; no successful full build or deployed UI acceptance is claimed. The code changes have not been deployed by this task.
