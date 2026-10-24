# Question import review, deletion and retained-content audit

## Current live data

The previously archived 360 English/Literature questions have now been **permanently deleted**, as explicitly requested. An archive is an existing database record with `is_active = false`; permanent deletion removes the record. The 360 deleted IDs were checked afterward and none remain. Their original full records remain in a private local backup. The 34 student-attempt records referring to them were verified preserved. No related daily-quiz attempts, question flags or battle matches were found before deletion.

The other 471 questions were screened for structure and editorial concerns. Formatting was improved for 275 by storing a source instruction separately while keeping the original complete stem, so current student clients do not lose instructions. No answer keys or spelling distractors were changed. No rich markup was inserted into these live stems merely to make a visual change before student rendering supports it.

134 retained questions now have persistent `is_flagged = true`, specific reasons in `explanation.content_review`, and `is_active = false`. They are review drafts, not permanently deleted records. 337 remain active. Coverage was refreshed for all 16 buckets affected by this hold.

| Subject | Exam | Active | Review drafts | Permanently deleted |
| --- | --- | ---: | ---: | ---: |
| English Language | WAEC | 123 | 25 | 52 |
| English Language | JAMB | 202 | 68 | 203 |
| Literature in English | WAEC | 11 | 1 | 26 |
| Literature in English | JAMB | 1 | 0 | 79 |
| The Lekki Headmaster | JAMB | 0 | 40 | 0 |
| Total | | 337 | 134 | 360 |

The screening does **not** certify every retained answer or source attribution. Reasons include multiple plausible answers, suspected answer-key errors, malformed wording and duplicate choices. All 40 book-specific Lekki questions are retained for verification against the novel; they have not been labeled wrong merely because they require book knowledge. An automatic formatting check cannot provide a factual guarantee about those answers.

Backups, exact ID plans, before/after snapshots and verified receipts are in the Git-ignored folder `handoff-output/question-content-cleanup/2026-10-22T11-50-51-865Z/`. Current receipts are `permanent-delete-receipt.json`, `retained-review-receipt.json`, `review-drafts-receipt.json` and `final-live-verification.json`.

## Admin import and review improvements

- Import review displays the original source beside the proposed question, with complete passages, instructions and all options. Stems use reading weight; annotations retain their actual semantics; long options stack vertically. No passage/explanation truncation is used in the main review content.
- Selected words or individual letters can be underlined, bolded or italicized using toolbar controls. Source corrections still require regeneration of enrichment rather than silently retaining a stale answer.
- The header shows separate ready-to-publish and needs-review counts. Only ready questions are offered for ordinary publication. A question can also be explicitly flagged by the administrator even when automatic checks do not detect an issue.
- “Save flagged drafts for review” persists unresolved questions in the ordinary questions table as inactive/flagged, together with issue reasons and source content. Publication coverage is not increased for these drafts. The review screen shows save errors and indicates which items have been saved to the queue.
- Raw bulk import also retains detected unresolved content as inactive flagged drafts rather than dropping those questions and leaving only an error message. Published and flagged counts are reported separately; active coverage counts only published rows.
- `/admin/questions?review=1` opens the flagged review queue. The API includes inactive flagged records; the inactive-only filter can narrow the queue. Selecting a record shows its stored review reasons and an editor for its instruction, reading material/image, stem, options and answer explanation.
- Resolving a review requires a source/reference and resolution note. Source-formatting/answer checks still apply; a note alone cannot override a missing underline or invalid answer choice. Resolving a draft does not automatically publish it. Unflag/reactivate actions cannot bypass a pending review.
- Source extract splitting preserves word boundaries and complete source wording. A proposal that changes or omits words is not accepted. Proposed line breaks absent from the source receive an explicit layout-review flag.

These changes use the existing question flags, activation state and explanation JSON. No additional database migration was required for this review workflow. The previously supplied instruction migration is already present in the connected database. Code changes are local; this task has not deployed them.

## What “missing layout” means

The inspected MyQuest English samples say “the word underlined” but sometimes supply only a quoted word, for example `'concerted'`, without an underline annotation. Some Literature samples put a complete poem/extract and its question into a single flattened string. The app cannot establish the original underline or stanza structure from a missing signal. It preserves the available source and flags unresolved targets/layout for a person to check; it does not claim to restore lost source typography automatically.

## Google Fonts and verification

The app uses `next/font/google`, which fetches configured fonts during a production build. The restricted execution environment could not resolve `fonts.googleapis.com`; the failure did not originate in question imports. Direct endpoint access succeeded with network permission, and the production webpack build subsequently passed without changing any font definitions.

Targeted tests cover missing-context flags, raw/enriched import drafts, option/key validation, answer conflicts, preservation of existing stems and distractors, exact extract splitting, and safeguards against bypassing pending review. The build and tests do not replace authenticated browser acceptance of the external enrichment copy/paste workflow. Student rendering changes remain the next separate phase.


## Passage display follow-up

The Past Questions page now uses the shared admin content display when a row is expanded. Passage/extract text appears in a shaded reading block with a left border, serif reading typography and preserved line breaks; the question follows with its own label, divider and spacing. Collapsed rows show the actual question and a passage badge rather than clipping the reading block. Instructions keep their separate styling.

Legacy stems can be separated for display when a recognizable trailing literary question or explicit direct question creates a clear boundary. The helper slices original text without changing words, citations or answer keys. Existing passage fields take precedence. Ordinary question-only stems, book recall and ambiguous boundaries stay intact. This is a presentation change and does not rewrite database records or invent missing passages/stanza layouts.

A visible **Review drafts** button in the Past Questions header opens the saved review queue. The queue explains that inactive drafts remain out of student sessions. The same reading display is shared with the question-bank drawer and MyQuest source/proposed preview.


## Import review decisions and brand styling

The shared passage panel uses the brand navy (#062A78), blue (#1264E5), and a pale blue background, retaining the reading typography and question separation.

Review no longer flags Literature questions solely for exceeding 160 characters. Enrichment identity compares complete normalized prefixes, preserves mathematical signs and Unicode, ignores inline emphasis, and accepts a question-only snippet when an exact source split proves identity. Missing responses, duplicate identities and differing snippets have distinct reasons; neither a missing response nor an ordering difference establishes a defective question. The exact cause of the user's unsaved 16-question batch cannot be established without that batch's source and enrichment response.

The import review screen provides All / Needs review / Ready / Skipped filters, a question jump menu displaying reasons, previous/next review navigation, grouped reason counts, and matching evidence (source ID, response ID and both snippets). Each question can be skipped locally, saved as an inactive flagged draft, corrected and re-enriched, or explicitly accepted with a review note for reviewable warnings. Required content (missing stem/options/key, referenced passage, underline target, invalid source markup, missing context or an unassigned enrichment response) still needs correction. Acceptance is bound to the content, answer, explanation and findings; edits reopen review. The server validates the same decision and records accepted issues and the note in explanation.content_review. Drafts stay inactive and do not increase coverage. Saved drafts cannot be re-included in the same batch, avoiding duplicate publication. Outstanding flagged questions must be resolved, skipped or saved before publishing closes the batch.

Question Bank has a Review Drafts tab across sources, with a dedicated /admin/questions/review route and sidebar entry. No migration is required for these additions: review decisions use the existing explanation JSON.
