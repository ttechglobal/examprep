# Analytics and scale review — 22 October 2026

## Verified behavior

Personal analytics makes one HTTP request per uncached filter selection and one aggregate RPC on a server cache miss. View switches do not fetch, and there is no polling. Five-minute caching, shared in-flight requests and a 30-second forced-refresh floor reduce duplicate aggregates. Authorization still runs on requests, including cache hits. Browser caching lasts for the current mounted page; returning later may make an HTTP request that the warm server cache answers.

Schools management makes one HTTP request containing a registry result and a usage summary: two RPCs on a cold cache, not one. Registry reads cache for 60 seconds, summaries for five minutes per filter. Changing views is local. Mutations clear this server instance's school cache. Usage averages and mode counts are included in the existing summary RPC, not separate requests. The latest-practice lookup now uses a partial device/time index instead of aggregating the lifetime telemetry table.

## Capacity assessment

These changes reduce dashboard pressure. They do not establish whole-application readiness for thousands of daily users or thousands online simultaneously. The SQL fixture covers a cohort of 1,000 students and bounded output; it is not a concurrent production load test. Native practice is offline, so uploads may arrive in bursts after reconnection.

Remaining limits to validate before a large launch:

- Caches and rate limits are local to each warm server instance. Cold instances can independently repeat queries. If deployment concurrency makes this material, add shared cache/rate limiting or precomputed daily rollups based on measured query plans and latency.
- Personal analytics can aggregate up to 180 days of facts for a 90-day comparison. Indexed, filtered queries still do work proportional to recorded answers. Monitor database CPU, query latency, pool waits and timeouts; introduce daily aggregate tables before these approach the request budget.
- The desktop backend registry is capped at 200 schools / 1,000 joined computer records. This bounds reads but requires pagination and aggregate count cards before the registry exceeds those caps. Current list lengths must not be interpreted as fleet totals above those limits. The usage summary still returns all registered device summaries, so it also needs pagination at larger fleets.
- School usage reporting currently limits 1,200 requests per hour per IP per server instance. Challenge and upload each consume a request. Shared school networks need realistic device-count/upload-cadence testing so legitimate lab activity is not throttled.
- Existing practice question selection can make one pool RPC per selected topic (up to 12); answering-session save and online PvP also write data. Admin analytics tests do not validate these student paths, real-time connections, infrastructure quotas or database connection capacity.
- The application source mentions Supabase's free plan; actual project tier, connection limits and production traffic capacity were not verified. Select infrastructure from measured peak concurrency and upload/write volume, not daily account count alone.

A meaningful launch rehearsal should use staging data and representative concurrent practice, session saves, PvP and offline-sync bursts while a small number of admins browse dashboards. Record p50/p95/p99 response times, errors, CPU and connection usage; increase concurrency until a bottleneck is measured, then choose capacity and an alert threshold. No production traffic flood was performed.

## Reporting coverage

Online PvP answers already exist in question attempts. The new snapshot derives one completed session per registered participant with recorded answers and exposes Battle (vs Friends) without counting its answers twice. School friend-battle ingestion is supported, but desktop clients must emit the new event. Learn and flashcards need dedicated engagement reporting when launched; missing instrumentation is not shown as zero usage.

## Live verification after migration

On 22 October 2026, the owner confirmed the refinement migration ran successfully. Read-only production RPC checks then confirmed:

- The last-24-hours range spans exactly 24 hours; it returned no recorded practice, versus 40 answers and nine sessions in the preceding 24 hours.
- The 30-day snapshot returned 427 answers: 351 Web and 76 native app, with zero unknown answers. Daily and subject totals both reconcile to 427.
- Completed sessions now total 67, including three registered-player 1v1 sessions. Native sessions remain 19.
- School usage returns the new 90-day averages contract. No devices are registered in the connected school registry, so usage figures are zero; this does not validate desktop client reporting.
- Public anonymous access to the personal analytics snapshot is denied (42501).

The web source still needs deployment to publish the updated controls and indicators.
