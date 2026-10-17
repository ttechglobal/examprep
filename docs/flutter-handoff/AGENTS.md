# ExamPrep A1 Flutter project instructions

- Read the handoff README and PRD before coding. Treat confirmed product decisions as requirements; treat open decisions and architecture recommendations as proposals.
- Implement Android and Windows in Flutter. Preserve the supplied PWA's actual appearance, navigation, copy, interaction patterns, and responsive layouts. Do not redesign or substitute generic Material screens.
- Exclude the marketing landing page and Learning World. Do not port admin, reviewer, partner, or web school-management dashboards unless separately requested.
- Reference PWA files are immutable design/business-rule evidence, not the new app's runtime. Keep new application code separate.
- Require a personal account using the existing onboarding flow. All practice reads downloaded content locally. Flashcards and formulas are optional downloads.
- Keep durable local storage, content downloads, learning sessions, sync, entitlements, and school results behind clear interfaces. Widgets must not contain SQL, HTTP orchestration, XP formulas, or subscription policy.
- School mode is a separate context: all applicable features unlocked; optional separate named completed results; no student account, name-based totals, or named unfinished-session resume.
- Show the dismissible school home-practice prompt with https://www.examprepa1.online/ after completion, including when saving is skipped.
- Preserve personal pricing/access rules from the source. Never embed server credentials or service-role keys in clients. Existing cookie-based Next.js APIs require a deliberate native authentication contract.
- Keep all personal pending sync records until acknowledged. Make retries idempotent and keep records scoped to the correct identity. Never silently discard pending activity or erase it on logout.
- Capture visual references and compare corresponding Flutter screenshots before claiming fidelity. Report unavailable references honestly.
- Implement in working vertical slices with appropriate persistence, offline, migration, and rule-parity tests. Do not build speculative microservices or future school management features.
