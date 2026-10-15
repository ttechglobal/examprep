# Flashcards

`/student/learn/flashcards` has a searchable subject library, subject topic lists, a recall session and results. It uses the available content from `/api/student/flashcards`, rather than hardcoding the subjects shown in the design reference. Categories adapt to the returned subjects, and other subjects receive a generic book icon and theme.

The library shows a continue banner for the latest unfinished deck and keeps Recently studied. Empty libraries, empty subjects, empty decks, search misses and request failures each have their own state. Students without configured subjects can browse the available library. No placeholder cards, mastery totals or XP awards are invented.

Progress remains on the device under the existing `ep_fc_progress` key. Each topic stores its old metadata (`done`, `total`, `lastStudied`, `completed`, `cardIndex`, subject/topic objects) plus ratings keyed by card ID: `known`, `almost`, `again`. Changing an answer replaces its previous rating; it never counts twice. Results can restart the full deck or review only cards not marked Got it. Deleted cards and unsupported ratings are filtered out when resuming.

Existing progress records still appear in the library. Earlier versions did not store per-card ratings, so their saved Got it total cannot be reconstructed for a resumed session; new ratings establish the detailed breakdown as the student studies. “Got it” is a self-rating, not a claim of tested mastery.

Topics shared by WAEC/JAMB return `topic_ids` alongside their combined card count. The client passes these IDs when opening the deck so the actual deck size matches the topic count. Older clients can continue fetching a single `topicId`.

Subject headers use generated 3D artwork in six 2×2 image atlases, covering 24 distinct subjects. The shared `lib/subjectArtwork.js` registry covers every subject in `SUBJECT_THEME` plus The Lekki Headmaster and French; it is reusable by other parts of the app. Subject name matching ignores case, extra spaces and WAEC/JAMB/NECO/IGCSE suffixes, and recognizes aliases including CRK/CRS, IRK/IRS, Financial Accounting and Computer Studies. New flashcard content automatically picks its registered illustration without another UI change. Unknown names use a generic book illustration.

`docs/subject-artwork-gallery.html` is a visual catalogue of all 24 panels. Image files are versioned under `public/images/flashcards`. The Flashcards title uses a separate transparent card-stack illustration; topic rows retain shared subject icons. Diagrams use the sanitized QuestionFigure renderer. The library still displays only subjects with actual cards, and Refresh library discovers newly published subjects while preserving cached study decks. Artwork does not create empty or placeholder decks.

The card turn runs from front-facing to edge-on, swaps content at 250 ms, then returns from the other edge to front-facing. No text face rotates beyond 89 degrees, so the answer cannot remain mirrored. Controls are disabled during the turn; timers are cleared when the session unmounts. Reduced-motion preferences reveal the answer immediately. Long content grows the card instead of clipping.

Study sessions now use `/student/learn/flashcards/session`, excluded from the student sidebar, header, bottom navigation, notification prompt and profile setup gate. Topic pages have an All subjects button at the top rather than breadcrumbs. Cards turn on reveal (disabled for reduced motion), keep question/answer content at the top and the reveal/answer label at the bottom, and offer Previous card, Review again and Got it. Hints and mnemonics are omitted. Earlier Almost ratings are included in Review again totals; new sessions use two outcomes.

Public subjects, topics and decks load on demand through `lib/flashcardCache.js`. Non-empty responses are cached in `ep-flashcards-v1` on the device and reused without background fetches, including after a reload and while offline. The cache holds up to 80 responses; browser storage eviction can require a later download. The service worker preserves this cache during updates. Results include an explicit Refresh saved cards action to fetch published changes. Progress remains separate from cached content.

Validation: `node --experimental-vm-modules --test tests/flashcards.test.mjs tests/flashcards-api.test.mjs tests/flashcards-view.test.mjs tests/flashcard-cache.test.mjs`. Tests isolate database/network dependencies and render actual JSX for the empty, error, question and result states; they make no live database changes.
