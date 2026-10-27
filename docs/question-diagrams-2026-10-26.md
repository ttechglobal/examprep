# Question diagrams and explanation illustrations

Source diagrams and optional teaching illustrations have separate workflows.

## Source question diagrams

Detection is shared across the import UI and server checks. It considers source image URLs, `has_image`, `image_description`, `diagram_description`, `figure_description`, `imageDescription`, nested image/diagram descriptions, descriptions stored in the `image` field, diagram references in the stem/instruction/passage, and image markup in answer options. Ordinary references to a “figure of speech” are not image references. Description-only records are held too.

In MyQuest enrichment imports, these records stay in the Held tab's IndexedDB store. Refetching the same paper preserves saved diagram work. The group records retain subject, exam, year and provider identities. This storage is local to that browser; clearing site data removes these held records.

Each held question has a source diagram editor: description, copyable SVG recreation prompt, original image references, SVG paste preview and explicit source verification. Insufficient descriptions must be supplemented from the original; prompts forbid inventing missing labels/data and forbid adding solution clues. Image-only answer options retain their source URLs and option identities.

Bulk imports return unresolved diagram questions to the Held tab instead of inserting them into the question bank. General save and draft-save endpoints also reject missing or unchecked source diagrams. Existing diagram records in the question bank remain editable through its **Source diagrams needing review** filter and drawer. The drawer has the same editor. Source diagram metadata lives in `explanation.question_diagram`, so no new database column is required.

Source verification requires an image URL or complete SVG and binds to the question, options, context and diagram content. Content changes reopen diagram review. Merely providing an explanation SVG or accepting a general review warning cannot clear a required source diagram. AI enrichment cannot approve its own source diagram. Required diagram checks run on server save and activation as well as in the UI.

Verified source SVGs render with the question, independently of explanation illustrations. Source SVG previews use an image context rather than injecting source HTML.

## Explanation illustrations

The previous prompts had conflicting rules: a narrow maths whitelist, calculated-values-only instructions, Biology's “if in doubt, draw it”, and a fallback that banned diagrams for Geography and Agricultural Science.

Both prompt paths now assess a specific visual benefit and source accuracy across subjects. Given quantities and verified derived quantities are allowed; qualitative diagrams need no invented measurements. Statistics plots, Venn diagrams, scientific structures/processes, apparatus, maps and geographical processes are candidates when supported by the question. Routine recall and simple symbolic manipulation do not automatically need images.

Enrichment returns `illustration_reason` alongside the existing title and prompt. The admin review preview displays that decision even when no illustration is requested. Existing optional illustration SVG generation/paste remains separate and optional; it does not block publication of an otherwise complete question.

These changes audit code paths and test representative provider shapes. They do not verify the diagram content of a newly fetched live paper. Regenerate enrichment prompts to apply the new decision instructions to future AI responses.
