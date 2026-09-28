# Home + Practice redesign, Battle tab, offline app — 27–28 Sep 2026

## Why

- Home and Practice move to the new designs (desktop + phone mockups).
- Battle becomes a main tab: sidebar and bottom nav (Home · Practice · Battle · Leaderboard · Profile).
- Students on weak or no data: images and app code download once, and the app opens without internet
  instead of a white screen.

## Deploy order

1. **Artwork** (optional to start: every slot has a fallback, so the pages look finished without it).
   Sizes and rules are in the `art.js` files.
   - `public/images/home/`: `hero-student.webp`, `practice-card.webp`, `battle-card.webp`
     (`components/student/home/art.js`)
   - `public/images/practice/`: `hero-student.webp`, `topic-card.webp`, `mock-card.webp`
     (`components/student/practice/art.js`)
2. **Service worker**: replace `public/sw.js` with the new one (v5). It keeps your push and
   notification-click code unchanged and adds the offline caching. There is no separate offline file.
3. **Image cache headers**: add to `next.config`:
   ```js
   async headers() {
     return [{
       source: '/images/:path*',
       headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
     }]
   },
   ```
   From then on, never overwrite a file in `/images`: publish a new name and update the reference.
4. Deploy the app. **No database changes** (the new sessions endpoint uses the existing
   `practice_sessions_student_idx` index).

## What changed

### Home
| Area | Change | Files |
|---|---|---|
| Layout | New design; one markup for every width (single column on phones, main + side column from 1300 px) | `app/student/home/page.js`, `components/student/home/*` |
| Cards | Practice / Battle cards are the shared `ArtCard`: gradient + real text and button, picture fades in on top | `components/ui/ArtCard.jsx`, `components/ui/LazyImage.jsx` |
| This Week | Shared `WeekActivityCard`. Server numbers for signed-in students (all devices), instant from the last saved reply, works offline, counts unsynced sessions | `components/student/WeekActivityCard.jsx`, `hooks/useStudentActivity.js` |
| Leaderboard | Uses the leaderboard page's cached hook; top 3 + your row at its real rank | `app/student/home/page.js`, `lib/leaderboard/avatar.js` |

### Practice
| Area | Change | Files |
|---|---|---|
| Layout | New design: greeting, Topic Practice + Mock Exam cards, More Practice Modes (Quick 5, Custom, Study), Recent Sessions, Practice Streak | `app/student/practice/page.js` (v16), `components/student/practice/*` |
| Modes | "Study Practice" opens Custom with Study (instant explanations) already chosen. Desktop can hide the modes row (remembered on the device); phones get "See all" (opens the full picker). Speed Round stays in the picker only | `components/student/practice/PracticeSections.jsx`, `PracticeSetupSheet.jsx` |
| Setup sheet | Moved out of the page file unchanged, plus `initialSessionType` | `components/student/practice/PracticeSetupSheet.jsx` |
| Recent Sessions | Subject icon, "Topic: …", score bar, time ("Today, 4:32 PM"). Device history first; signed-in students also get sessions from other devices, merged by session id, refreshed at most every 2 min | `hooks/useRecentSessions.js`, `app/api/student/sessions/route.js` (new) |
| Session saving | Topic sessions now send `topic_name` (the server already stored it, the page never sent it). Local history keeps each session's time and topic; its date is the real day instead of "Today" forever | `app/student/practice/session/page.js`, `lib/localSessionSync.js` |
| Removed | Battle card on Practice (Battle has a tab); `SessionHistory.jsx` (replaced; its server refresh never ran because of an undefined `MAX_LOCAL`); `BattleEntryCard.jsx` (no longer used) | |

### Navigation, Battle, offline
| Area | Change | Files |
|---|---|---|
| Navigation | Battle in the sidebar and bottom nav; bottom nav with line icons and an active pill. Flashcards button (phones only) opens flashcards directly, shrinks on scroll, hidden on Battle and flashcards | `components/student/StudentNav.jsx`, `StudentNav.module.css` |
| Battle hub | Inside the app shell (nav stays). Setup, match and 1v1 remain full screen | `app/student/battle/page.js`, `app/student/layout.js` |
| Phone top bar | Brand on Home and Practice, page name elsewhere | `app/student/layout.js` |
| Service worker v5 | Student pages + their code saved at install; code and images cached for good; pages network-first (4 s) with the saved copy as fallback; launch at "/" offline → app home; unsaved page → `/offline`. Push + notification clicks unchanged. Old v4 would have deleted the offline caches on every update (it removed every cache but its own) | `public/sw.js`, `components/ServiceWorkerRegistration.jsx`, `app/offline/page.js` |
| Offline messages | Sessions say "You're offline" + Try again instead of "Failed to fetch"; 1v1 answers offline instantly | `lib/network.js`, `components/session/SessionPrimitives.jsx`, `app/student/battle/session/page.js`, `lib/pvp/client.js`, `components/battle/PvpNotice.jsx`, `components/battle/BattleSetup.jsx` |
| Dates | Device activity, streak and history use the Nigerian day | `lib/localSessionSync.js`, `lib/dates.js` |

## Behaviour changes (plain words)

- Bottom nav has 5 tabs; "Ranks" is now "Leaderboard". Battle keeps the nav on screen.
- Practice no longer shows the Battle card, the "Edit subjects" / "Goals" chips, or Speed Round on the page
  (Speed Round is still in the "See all" picker).
- Recent Sessions shows 3 sessions and no longer lists battles.
- Week chart and streak can show higher numbers than before for students on more than one device.
- A streak no longer shows 0 in the morning before practising; it drops only after a missed day.
- After one visit online, the app opens without internet: all main tabs work. Questions, battles and
  leaderboards need data and say so clearly.

## Tests

- `next build` (Next 15, React 19) passes.
- Chromium at 390, 1100, 1366 and 1536 px, light and dark, with artwork and with every image blocked:
  Home, Practice, Battle hub.
- Practice flows: Study Practice opens the picker on Custom; Topic card opens it on Topic; Mock card goes to
  the mock exam.
- Offline with the server switched off (real network failure for page and worker): Practice reloads in
  ~1.6 s with its images from the phone; Leaderboard (never visited) and Battle tabs open; launching at "/"
  opens the app home; unsaved and admin pages show the offline page.
- Found and fixed in testing: responses the worker didn't keep (e.g. a missing icon) held connections open
  and stalled its install.

## Not verified

- Signed-in data (activity, sessions endpoint, leaderboard `me` row): tested as a guest only.
- Push notifications with the new worker: the push code is unchanged, but not re-tested end to end.
- iPhone Safari offline behaviour (Safari clears a site's data after ~7 days unused).
- Real artwork: placeholder images were used.

## Found, not changed

- React hydration warning (#418) on Practice and Profile in production builds, present before these changes;
  Battle now shows it too because it's inside the app shell. Likely text read from the device during the
  first render (e.g. the student name in the desktop top bar). Worth its own fix.
