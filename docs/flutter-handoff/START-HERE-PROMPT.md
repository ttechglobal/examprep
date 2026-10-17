Read AGENTS.md, README.md, and the documents under docs before implementing.

We are building ExamPrep A1 in Flutter for Android and Windows in this fresh project. Reproduce the supplied PWA student screens faithfully, including their styles, assets, responsive behavior, sheets, and dialogs. Do not redesign. Exclude the landing page and Learning World. The source snapshot is under reference/pwa-source.

Follow the PRD for account-required onboarding, download-first content, complete offline use of downloaded features, durable local activity and sync, existing personal Free/Premium rules, and free Windows school mode. School leaderboard results are optional and separate per session. After school practice, show a dismissible invitation to continue at home at https://www.examprepa1.online/.

Keep V1 simple but extensible: feature boundaries, durable versioned storage, versioned content packs, account-scoped idempotent sync, and isolated school data. Follow architecture recommendations where suitable, and resolve meaningful undecided product policy before implementing dependent behavior.

First inspect the references, check the available Flutter/toolchain environment, identify missing visual/backend inputs, and propose the first working vertical slice. Capture reference screenshots before claiming visual parity. Then implement the agreed slice and verify it on the target platforms available here. Do not modify the original PWA reference or deploy backend changes without explicit authorization.
