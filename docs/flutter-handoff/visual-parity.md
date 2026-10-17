# Visual parity and screen handoff

## Source of truth

The original PWA design is the target, not a loose inspiration. Match mobile PWA layouts on Android and desktop PWA layouts on Windows. Retain brand, copy, art, spacing, hierarchy, transitions where applicable, and existing interaction behavior. Offline and school additions should use the same design vocabulary.

Primary references inside `reference/pwa-source`:

| Concern | Source |
| --- | --- |
| Theme and base styles | `src/app/globals.css`, `src/contexts/ThemeContext*` |
| Navigation and shell | `src/components/student/StudentNav*`, `MobileTopbar*`, `src/app/student/layout.js` |
| Introduction and authentication | `src/components/onboarding/*`, `src/app/onboarding/page.js` |
| Profile and setup | `src/components/student/profile/*`, `ProfileSetupGate*`, `src/lib/profileSetup.js` |
| Home | `src/components/student/home/*`, `src/app/student/home/page.js` |
| Practice and mock setup | `src/components/student/practice/*`, `src/components/student/mock/*` |
| Questions, results, review, calculator | `src/components/session/*`, `src/app/student/practice/session/page.js` |
| Learn and flashcards | `src/components/student/learn/*`, `src/components/student/flashcards/*`, flashcard pages |
| Battle | `src/app/student/battle/*`, related battle components/hooks and `src/lib/battle*` |
| Progress and leaderboard | Corresponding pages and `src/components/student/leaderboard/*` |
| Original files | `public/images`, `public/icons`, plus inline SVG/JSX art in components |
| Fonts | `src/lib/fonts.js`, root layout, and `src/components/student/gameFonts.js` |

Brand colors extracted from source: navy `#062A78`, blue `#1264E5`, cyan `#18B7F2`, gold `#FFB800`, orange `#FF6A00`; light canvas `#f0f4ff`, dark canvas `#0a0c14`. These are starting tokens, not the full style specification. Read component-level CSS for exact values.

## Capture checklist — pending

No authenticated screenshot suite is included yet. Capture from the current PWA in an authorized test account or an isolated local fixture environment; do not fabricate a production account or claim source-derived mocks are screenshots.

For every route in `reference/screen-inventory.csv`, capture relevant states at recorded mobile and desktop viewport dimensions, recording theme, account/plan, selected exam/subjects, and fixture data. Include:

- Intro slides, auth methods/errors, profile setup sheets.
- Home, navigation, practice mode sheets, mock selection and setup.
- Question text, image, passage, diagram, math, explanation, answer grid, calculator, timers, exit confirmation, results, and review.
- Flashcard selection and front/back/session completion; formulas and nested tool dialogs.
- Battle states, missions, settings, 1v1 create/join/lobby/match/results.
- Leaderboard tabs, Hall of Fame, progress/trends, profile and all settings sheets.
- Empty/loading/error/locked states and light/dark themes.
- New designs for download readiness/progress/failure/update, offline/sync indicators, school setup, optional result naming, school leaderboard, and home-practice prompt.

Learning World is excluded even though the snapshot contains its reference code.

## Comparison process

Choose representative mobile/desktop reference sizes, record them, and render Flutter at matching logical dimensions. Compare screenshots side by side or with overlays. Fix differences in layout, typography, assets, colors, sizing, and interaction order. Check additional narrow/wide sizes, Windows resizing, text scaling, scrolling, and touch/keyboard controls.

Maintain a checklist with source screen/state, screenshot filename, Flutter destination, implementation status, comparison status, and exceptions approved by the owner. A route being implemented does not imply all its sheets and states are complete.

`screen-inventory.csv` automatically inventories routes; nested component states still require this capture/review pass. Fonts referenced through Next.js font loaders are definitions, not proof that distributable binaries/licenses are already bundled.
