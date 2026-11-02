# Public website review — 1 November 2026

## Implemented

The Next.js public homepage is a server-rendered editorial page, not an app welcome carousel. It uses the existing logo, Zara, robot, student and trophy artwork; locally bundled Baloo 800 and Jakarta 400–800 retain their supplied SIL OFL notices. Fonts no longer require Google Fonts at build time.

The primary action opens the existing browser signup journey. Explore the app scrolls to Practice. Navigation anchors target the implemented Practice, Battles and Lessons sections, with the retained `/schools` route for school information. Existing signup/login/register, school portal, ambassador and referral routes remain intact. The dedicated referral mini landing page is unchanged.

The school page now describes the shared-computer desktop experience, local analytics and public-release limits. Existing `/school-login` remains linked as the web school portal. Added real `/privacy` and `/terms` destinations for previously unresolved legal links, with concise notices grounded in current account/referral/storage behaviour and the configured service providers. Review these notices as product policies evolve.

## Availability basis

- Browser practice, computer battles, learning tools and rewards are implemented in this checkout.
- The main browser battle menu does not expose friend battles. Native documents `school-desktop-pvp-20261030.md` and `adoption-and-school-sync.md` distinguish isolated implementation tests from certified live play. Friend battles are therefore visibly marked coming soon; no public match-start link is offered.
- No published native installer URL is configured. Android/desktop downloads and offline packs are described as being prepared, with no fabricated download links.
- Native school documentation and supplied screenshots show reports scoped to a computer, not distinct learner counts or cross-device school totals.
- No pricing, guaranteed scores, invented testimonials, user totals or ratings are added. The example leaderboard is explicitly labelled illustrative.

## SEO

The owner confirmed `https://www.examprepa1.online/` in this chat. Canonical URLs, absolute Open Graph/Twitter URLs and the sitemap use that production origin. `NEXT_PUBLIC_SITE_URL` or a valid HTTPS `NEXT_PUBLIC_APP_URL` can override it; localhost is rejected as a public origin.

Core copy and one H1 are present in rendered HTML. New `robots.txt` allows public content while excluding app/admin/API crawling; authentication, not robots, protects private data. Sitemap includes `/`, `/schools`, `/ambassador`, `/terms` and `/privacy`. No invented structured data, offers, ratings or reviews are emitted. The 1200×630 share image uses the existing logo and Zara. Images have intrinsic dimensions; hero assets are eager and below-fold images use Next Image's lazy loading and responsive sizing.

Primary documentation consulted:

- [Google: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: sitemap generation](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: image SEO](https://developers.google.com/search/docs/appearance/google-images)
- [Google: robots metadata](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)

## Verification

- Targeted ESLint passed; `git diff --check` passed.
- Production build passed with `EXAMPREP_BUILD_DIR=.next-public-build npm run build -- --webpack`, generating the public pages as static HTML. Existing middleware-to-proxy deprecation warning remains.
- Turbopack initially crashed against the existing development cache. An isolated output directory and Webpack resolved it, without deleting another session's cache. `EXAMPREP_BUILD_DIR` in Next config allows independent local preview/build output; those directories are ignored.
- Reviewed 360, 390, 768, 1280 and 1440px browser viewports. No document horizontal overflow; one H1; equal-height battle panels on desktop/tablet and stacked panels on phones.
- Mobile menu: Enter opens, Tab reaches links with visible focus, Escape closes and returns focus to Menu. Explore the app scrolls to Practice with the sticky-header offset.
- Temporarily tested a 32px root font (200% text scaling) at 390px. Fixed header wordmark/menu overlap; no overflowing headings or horizontal document overflow. The temporary stylesheet was removed and default 16px root size rechecked. Page scaling is permitted by removing the previous maximum-scale restriction.
- Computed contrast inspection of 133 rendered text elements found no failures against 4.5:1 normal text / 3:1 large text. Screenshots inspected visually. Static page content has no automatic carousel or continuous animation; reduced-motion CSS suppresses transitions and animations within the public layout.
- HTTP 200 verified for `/`, `/schools`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml` and `/opengraph-image.png`. Final rendered canonical is `https://www.examprepa1.online/`; OG image is on that same origin. No missing loaded images.
- No accounts created, messages sent, payments made or production changes published.

## Screenshots

- `homepage-desktop.jpg` — full page, 1440px.
- `homepage-desktop-hero.jpg` — desktop opening view.
- `homepage-mobile.jpg` — full page, 390px.
- `homepage-mobile-hero.jpg` — mobile opening view.
- `homepage-mobile-text-200.jpg` — enlarged-text QA, before restoring normal scale.

Artwork provenance: `public/images/website` contains optimised copies of existing website artwork and the supplied mobile assets/screenshots under `app/assets` and `app/design/mature-ui`. The lesson and session-type previews are crops of supplied screenshots. They are labelled app previews; school previews contain fixture/example data. No mascot, logo or testimonial was invented.

Final production-build check: the last build passed after all font and responsive changes. The clean desktop/mobile screenshots were captured from that production build, not the development overlay. Rechecked all five widths there: one H1, confirmed production canonical and no horizontal overflow. The primary action was followed into the existing onboarding route without creating an account. Production-build HTTP checks returned 200 for the homepage, schools, privacy, terms, ambassadors, sign-in, robots, sitemap and share image. The sitemap contains only the confirmed HTTPS production origin.
