# Outcome-first landing page — 1 November 2026

## Content direction

Lead with the student's desired outcome: **Walk into JAMB better prepared.** A 300+ score is presented as an ambition to work towards, not a promised result. WAEC remains supported, with JAMB first.

The page connects the tools to that preparation:

- Topic practice → work on weaker areas.
- Quick sessions and weekly challenges → a practice routine students can keep.
- Timed mocks → familiarity with pacing and pressure.
- Computer battles → an engaging reason to return and practise focus.
- Learning tools → understanding the idea behind an answer.
- XP, progress and the leaderboard → encouragement to keep practising.
- School practice → shared opportunities to build exam familiarity.

## Design and journey

The new opening uses a goal sticker, real Zara artwork, a readable quiz preview and a Try → Understand → Improve loop. Stronger blue/orange/violet/teal section treatments and a navy school-partnership panel retain the existing brand.

Main student calls to action now open `/download`. This intentionally simple page offers browser practice now and an Android APK coming-soon option. `NEXT_PUBLIC_MOBILE_APP_DOWNLOAD_URL`, when set to a valid HTTPS URL, enables the Android download. It does not claim that offline packs or friend battles are already publicly available.

The browser option continues to `/onboarding?mode=signup`; existing sign-in remains available. The dedicated ambassador referral flow is unchanged.

The homepage and schools page invite selected-school partnerships. Contact the team opens the existing support WhatsApp number with:

> Hi, I would like to explore an ExamPrep A1 partnership to help our students prepare for JAMB and WAEC. How can we get started?

The website does not send the message automatically. Local-computer analytics and desktop-release limitations remain stated. No school activation or cross-device reporting promises have been added.

## Checks

- Targeted ESLint and `git diff --check` passed.
- Homepage and download chooser checked at settled 360, 390, 768, 1280 and 1440px viewports: one H1 and no horizontal overflow.
- Both pages checked at 200% root text size at 390px. Fixed a grid minimum-width issue in the practice section; no horizontal overflow or clipped headings after the fix. Temporary QA styling removed.
- Followed Start practising to `/download` and Continue in browser to the existing signup journey, without creating an account.
- Verified the partnership WhatsApp link and prefilled text without sending a message.
- `/download` has its own canonical metadata and is included in the sitemap.
- Preserved current friend-battle, native-app and offline availability labels.

The full production build uses isolated output:

`EXAMPREP_BUILD_DIR=.next-public-build npm run build -- --webpack`

Screenshots in this folder show the new homepage (desktop/mobile) and basic chooser (desktop/mobile). The chooser layout is intentionally minimal so its release/download details can be refined next.

Nothing has been published.

Final production build passed after the enlarged-text fix (156 generated pages). The existing middleware deprecation warning remains unrelated. No publishing was performed.

Final homepage and chooser screenshots were refreshed from the successful production build, with the development overlay removed. Verified the production-built chooser canonical and disabled Android state. Local preview servers were stopped after review.
