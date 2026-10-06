# Illustrated battle redesign

The seven supplied screenshots define the computer-battle journey. Battle is a separate game world; the rest of the student application retains its original design. Visible text, selections, scores and timers are real controls.

## Presentation and ownership

- Entering Battle World always shows a loading screen for at least 3.5 s (up to 10 s while artwork is still downloading): crest, progress bar, tips and a Back button that asks before leaving. Behind it, `lib/battleAssets.js` preloads the exact image URLs the battle screens use. Lobby music starts with it when the student has already tapped on the page (the usual in-app entry); after a cold page load it starts on the first tap.
- `BattleExperience`, mounted by the battle route layout, owns artwork loading, entrance progress, exit confirmation, browser/device Back handling and one audio engine. It persists between battle routes and cleans up on exit. It also defines the battle scale unit `--u` (below) for every battle screen.
- Exit: only the battle hub has an Exit button, and only the hub's Back leaves the battle world (after a prompt). In a match, Back asks before abandoning it and returns to the hub; other battle screens step back to the hub (`lib/battleNavigation.js`). In-match "Leave match" and the results "Battle home" also return to the hub.
- `components/student/GameShell`: courtyard backdrop and scoped game colors/fonts. Battle uses its immersive presentation with no application navigation.
- `components/battle/BattleWorld`: one frame for the hub, setup, leaderboard, loading, countdown, results and review — guide, speech bubble, wooden title/ribbon, parchment choices and gold actions. Setup omits the numbered step indicator and question-bank counts.

## Layout system

- `--u = clamp(7px, min(.78vw, 1.25dvh), 14px)`: every size is a multiple of it with a readable minimum, so a screen scales with the smaller of width and height. Short laptops shrink instead of overflowing; large monitors grow instead of leaving the composition in a corner.
- Desktop (≥ 900px): bar (hub only) → stage. The stage is a grid of guide column | main column, capped at 1480px and centred. The main column holds a scroll area and the dock, so long selections scroll while Back/Continue stay visible, and the Back button can never cover the mascot. A gutter keeps content clear of the speech bubble.
- Phones (< 900px): one scrolling column with the guide strip on top; the dock (and the results actions) stick to the bottom.
- The title board keeps the artwork's true proportions (1493 × 922, the art's opaque area) and places its text in container-query units, so title and subtitle always sit on the planks and ribbon.
- The arena puts the score duel in the top bar on desktop, sizes the question board to its content (scrolling only when long) and shows the podium fighters from 1100px wide.
- Each stylesheet is a single cascade: earlier versions appended unconditional override blocks after the media queries, which silently cancelled the tablet and large-screen rules.

## Battle leaderboard

`/student/battle/leaderboard` ranks XP earned in battles only — This Week, Last Week, All Time, no school scope. Battle XP still counts on the main leaderboard. Names use the same public form as the main board ("Ada O."), falling back to the username.

`20261003_battle_leaderboard.sql` adds a `battle_results` ledger (one row per student per battle) filled by triggers: computer battles take their XP from the server-checked session save and their outcome from `record_battle_result`; 1v1 battles are recorded when the match finishes. It backfills earlier battles (older computer battles have XP but no recorded outcome). `/api/leaderboard/battle` reads it through `battle_leaderboard_top` / `battle_leaderboard_me`, and reports `unavailable` until the migration has run.
- `BattleSetup`: a reducer owns exam, subject, random/topic mode, topic selection, question count and timer. Catalog loading is cancellable and exposes loading, empty, failure and retry states.
- `arena/BattleArena`: blue/red score panels and character podiums, progress strip, clock, question board, answer choices and green submit action. Settings, pause and report dialogs trap keyboard focus and restore it on close.
- `BattleOutcome` and `BattleReview`: results, earned XP, follow-up topics, explanation review and rematch use the same visual system.

Home, Practice, Learn, Profile, Leaderboard, profile setup and shared student navigation have been restored to their original styling and artwork. The arena removes the logo/mode banner and keeps Submit/Next visible while long question content scrolls inside the board. The references do not specify redesigned friend matchmaking screens.

Every battle-world screen has a top bar: Exit (hub) or Back on the left, the player's **battle XP** and avatar (initials, display only) on the right; desktop (≥ 900px) also shows the rank tier earned from battle XP and the player's all-time battle-leaderboard place.

## Battle XP and practice activity

- `profiles.battle_xp` (`20261004_battle_xp.sql`) is the battle world's own score: the sum of the `battle_results` ledger, kept up to date by a trigger and protected from client edits. `GET /api/student/battle/stats` returns it with the all-time rank; guests use this device's record. Battle XP still also counts towards total XP.
- A computer battle is saved as a practice session (`mode: 'battle'`) and sent immediately, so it counts towards activity, streak and mastery and appears in Recent Sessions as "⚔️ Battle".

## Caching

The service worker (v6) keeps `/images`, `/icons`, `/audio`, code and the optimized `/_next/image` copies on the device after the first download, and saves the battle pages at install; `images.minimumCacheTTL` is one year. Only the player's data (`/api/*`) is fetched on each visit. The arena keeps its own match bar; the countdown has none. On phones each screen's board (`header`) comes first, then the guide strip, then the content.

## Audio

- `lib/battleMusic.js` holds two composed 8-bar loops as data: "Courtyard" (lobby, 100 bpm, C major, bell melody over pads, arpeggio, light percussion) and "Arena" (match, 132 bpm, A minor, pumping bass, four-on-the-floor drums, staccato lead, snare fill into the loop).
- `lib/battleAudio.js` plays them with a look-ahead scheduler on the audio clock (no timer drift), through pads, plucks, bell, bass and drum voices, a shared reverb and a compressor. Scenes cross-fade; music dips under the announcer. Effects: select, correct, wrong, five-second ticks, time-up, win fanfare, loss, draw.
- The announcer varies its lines and uses the most natural English voice the device has (neural/"Natural" voices first, Nigerian English preferred).
- Settings: Sound (everything), Music, Announcer voice, Volume. They persist; audio starts after the first tap, suspends in hidden tabs and stops on exit.
- `lib/battleAudioFiles.js`: set paths to recorded music (looping) or voice lines in `public/audio/battle/` and they replace the synthesized versions; a missing or broken file falls back automatically.
- Balance was measured from offline renders: both themes about −21 dB RMS with −6 dB peaks; melody in front of the bass.

## Illustrations

Questions show their image (`image_url`, tap to enlarge), inline SVG diagram (`svg_diagram`, sanitized by `lib/safeSvg.js`) and passage image in battle, battle review and practice (`components/ui/QuestionFigure`). Explanation diagrams (`explanation.svg_diagram`) already showed in review. `20261003_question_illustrations.sql` adds these fields to `get_practice_questions`, which previously left them out.

## Match rules and data

The computer setup offers 5, 10, 20, 30 and 50 questions, with 15, 30, 45 or 60 seconds per question. Topic mode supports up to twelve topics. Friend setup preserves the existing RPC limits of one topic and 5/10/15/20 questions.

The public exam catalog supplies subjects even when a guest has not chosen profile subjects. Subject and topic bank counts are omitted from setup. Empty selections have useful recovery actions.

The question endpoint queries the existing published-question RPC for each selected topic, retaining subject, exam and exclusion filters. It deduplicates the resulting pool and fails the request if a selected-topic query fails. When fewer questions are available, the match uses the available set and its counter displays that actual total.

A match loads the entire set before the countdown. Submission and timeout resolve each round once. Pausing captures elapsed time before updating the deadline; Previous opens read-only completed rounds and pauses the active round. Scores show correct answers while the existing reward calculation and stored ten-point scoring stay compatible.

The computer normalizes letter, numeric-index and text answer keys into the actual option text. Incorrect choices exclude the correct option. Results save once; rematch transitions to loading before clearing the result, resets round state and excludes the previous match's questions.

## Art fidelity

`public/images/battle/design` retains the supplied sheets used for original exam, subject, topic and utility illustrations. CSS sprite windows preserve these illustrations; Next image optimization reduces transfer size. Their paper backgrounds are part of the original flattened sheets.

The courtyard, logo, wooden title board, boy mascot, robot, reading robot and crossed-sword crest were reconstructed as individual raster assets from the supplied references with ImageGen. They are close visual reconstructions, not the original layered source art or pixel-identical exports. Original transparent assets would remove this remaining fidelity limitation. See `battle-art-assets.md`.

## Validation

- Production build succeeds (`npm run build`).
- Targeted ESLint passes on the new battle components, computer session, APIs, shared shell and changed helpers.
- `node --test tests/battle-question-pool.test.mjs tests/battle-opponent.test.mjs`: six checks pass, covering invalid/oversized topic selections, 50-round rematch filters, pool deduplication/failure behavior and the computer's answer-key formats.
- Live browser walkthrough: exam/subject/type, two-topic selection, five rounds, timeout, pause/resume, locked Previous review, victory, XP, explanations and rematch. Desktop and 390px mobile compositions were inspected.
- A broader battle-folder lint run still reports pre-existing issues in untouched friend lobby/match, ChallengeClient and GuestUpgradeCard files.

