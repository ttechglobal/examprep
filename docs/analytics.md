# Admin analytics

The page has three views sharing one dataset: Summary, Student activity and Learning. Plans and payments link to Students; school computer usage remains on Schools (Desktop).

## Setup

Run `src/supabase/migrations/20261022_shared_analytics.sql` in the shared Supabase project after the desktop account progress tables exist. The owner reported success on 22 October 2026; the live service-role snapshot and browser were subsequently verified. Deploy the web changes to publish the new page and web session attribution.

## Definitions and coverage

- Active student: a registered student account with at least one recorded answer during the period. Overall totals count each account once.
- Questions and accuracy combine web question attempts and native topic summaries. Native summaries are excluded when question attempts already represent the same student/session. Correct answers are weighted by answer count.
- Completed sessions come from saved practice sessions plus one session per registered participant with recorded answers in a completed online PvP battle. Answers without a completed session can therefore exist.
- Web includes phone browsers. Mobile / installed app identifies native sync, which also includes the personal Windows app. It is not an operating-system breakdown.
- The owner confirmed pre-mobile history was web usage. The refinement migration treats unattributed activity before 22 October 2026 (Lagos midnight) as Web, while preserving native evidence. New activity without trustworthy attribution remains Unknown. Platform student counts overlap when an account uses more than one source.
- Offline practice uses its original occurrence date once uploaded. Unsynced activity is not visible yet.
- Anonymous accounts, nonstudent roles and the two explicitly confirmed native integration test accounts are excluded. No broad email-pattern exclusion is used.
- First-practice follow-up means recent accounts older than 24 hours without a completed session. Return follow-up means accounts with answers in the selected period but none in the last seven days. These are bounded review lists, not inactivity notifications.
- Older native sessions do not preserve detailed practice modes. Lesson views and flashcard opens are not inferred from question sessions.
- Difficult topics require at least 20 answers from three students. This describes recorded practice, not a population-wide learning assessment.

## Requests and scale

Filters are rolling 24 hours, or 7, 30 or 90 Lagos calendar days and optional WAEC/JAMB. Changing views uses the same response without another request. Each cache miss makes one service-only `admin_analytics_snapshot` RPC; no raw event history is downloaded.

The browser caches each filter for five minutes. The server coalesces concurrent loads and caches bounded entries for five minutes per warm instance. Explicit refresh has a 30-second server cooldown. There is no polling. Admin authorization runs before cache access, HTTP responses are private/no-store, and errors remain errors rather than becoming zero figures.

SQL bounds date windows, indexes principal lookup paths, materializes shared filtered facts and limits student/topic lists. The API aborts after 12 seconds. These measures reduce work; production query plans and load should still be monitored as data grows.

Schools (Desktop) registry reads cache for 60 seconds per warm instance; usage summaries cache for five minutes per period. Successful administration actions invalidate that instance's school cache. Other instances can retain registry data for up to 60 seconds.

## Validation

Eleven focused Node/SQL tests pass, covering reconciliation, deduplication, platform capture, historical dates, exclusions, permissions, bounded payloads, cache coalescing, failure handling and school usage boundaries. Focused lint and browser verification cover the changed page and routes.

A live 30-day snapshot on 22 October returned 427 answers; daily, platform and subject totals reconciled. The response was approximately 8.3 KB and took 736 ms including network in one sample. This is a correctness check, not a load benchmark.

## 24-hour and usage refinement

Run `src/supabase/migrations/20261022_analytics_usage_refinements.sql` after the original shared analytics migration and existing desktop activation backend. It includes school usage tables if the earlier school usage migration was not applied. This follow-up is not deployed by editing the source.

Last 24 hours is a rolling timestamp window, compared with the preceding 24 hours, not today since midnight. Green upward arrows mark positive changes; zero baselines show an absolute increase rather than an invented percentage.

School averages use a fixed rolling 90-day denominator including quiet days: sessions, questions and minutes per day; weekly is seven times that daily average, monthly is thirty times it. They cover the whole school fleet, independent of the selected reporting filter. They are observed rates, not forecasts. Newly installed schools do not yet have a full reporting history.

School reports can now accept signed `friend_battle` events alongside `practice`, `computer_battle` and `feedback`. The desktop producer must enqueue that event at completion, with the same idempotent event ID on retries. Backend acceptance alone does not make missing client reports appear. Learn/flashcard events should be designed at feature launch (lesson/deck identity, start/completion, duration, original occurrence time, idempotent reference) and reported in batches, without a request per card or click. They should have separate engagement metrics rather than counting as question sessions.
