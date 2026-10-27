# ExamPrep A1 Flutter handoff — start here

This is the portable context for a fresh chat and a new Flutter repository. The owner wants a faithful Android and Windows reproduction of the existing PWA, with offline downloads and shared school mode. This is product planning and a source snapshot, not a Flutter implementation.

Read in order:

**26 October update:** When updating an existing mobile implementation, read `question-rendering-update-2026-10-26.md` first (`docs/question-rendering-update-2026-10-26.md` in regenerated full packages). It documents the current question fields, rich-text/media rendering, offline pack migration, results/review and live 1v1 XP differences. The existing mobile design is authoritative for this update; do not copy web screenshots or styling. Older source snapshots may predate these changes.

1. `docs/product-prd.md` — confirmed scope, user stories, acceptance criteria, flows, and open decisions.
2. `docs/architecture.md` — proposed scalable V1 boundaries and delivery sequence.
3. `docs/visual-parity.md` — reference map and visual verification requirements.
4. `docs/backend-contracts.md` — existing integration evidence and gaps.
5. `reference/screen-inventory.csv`, `reference/api-inventory.csv`, and `reference/assets.csv`.
6. `reference/pwa-source/` — original source, styles, public assets, tests, database migrations, and existing product notes.

## Move into a fresh project

Extract the ZIP into a new empty folder, such as `examprep_flutter`. Add/open that folder as the new project's workspace and start a new chat there. All references are inside this package; access to the old project is unnecessary. Do not initialize Flutter over the references without checking file collisions first.

Use `START-HERE-PROMPT.md` as the first message. `AGENTS.md` is intended for the new repository only; it does not change instructions in the PWA project.

## Included and missing

Included: source snapshot, original assets in `reference/pwa-source/public`, styles, business rules, backend route implementations, migrations, tests, PRD, architecture proposal, inventories, source revision/status, and SHA-256 file manifest.

Not included: `.env` files, credentials, production database exports, downloaded production question content, `node_modules`, `.next`, Git metadata, or Flutter application code. Referenced server environment variable names in source are not configured secrets.

**Visual reference limitation:** authenticated screen screenshots and recordings have not yet been captured. Source inspection is complete enough for planning, but is not visual certification. The new chat must capture/obtain reference screens before claiming exact parity. `docs/visual-parity.md` specifies the capture checklist. Font definitions are included in source; actual font binaries may need to be obtained and bundled with appropriate licenses.

The source snapshot includes web admin and school-management code for dependency/backend context. Those screens are not Flutter implementation scope. No backend migrations are authorized merely by including them.

## Verified product decisions

- Android personal; Windows personal and school. Future platforms are not launch scope.
- Same PWA student design and flows; exclude marketing landing page and Learning World.
- Personal account required; existing registration/profile flow, then download-first content.
- All downloaded content works offline; results persist locally and sync later.
- Optional question, flashcard, and formula downloads; no automatic whole-library install.
- Persist cached leaderboards; live 1v1 needs connectivity.
- Preserve personal Free/Premium rules. School V1 is free and unrestricted for applicable features.
- School results: optional name/username, one entry per completed session, no aggregation by name, no individual profiles or unfinished named-session resume.
- School completion invites students to practice at home: https://www.examprepa1.online/.
- Build V1 reliably while keeping modules, storage, APIs, and school mode extensible. Avoid speculative future features.

## Verification and regeneration

The source root contains `scripts/build-flutter-handoff.ps1` to regenerate a fresh package from explicitly selected paths. Existing output folders are never recursively deleted; each build uses a new timestamped folder. `manifest.csv` hashes all packaged files except itself. After extraction, verify files with PowerShell `Get-FileHash -Algorithm SHA256` against that manifest.

Open decisions remain in the PRD. Recommendations in architecture notes are proposals, not retroactive user approvals.
