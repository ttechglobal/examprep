# Scalable V1 architecture proposal

Status: implementation guidance for discussion; package choices and contracts are not finalized.

## Intent

The owner explicitly expects the mobile product to grow substantially and the school edition to be easy to distribute. Scalability means extending features without rewriting persistence or mixing shared-school data with personal accounts, handling larger content libraries efficiently, and safely evolving installed apps. V1 should remain a single Flutter application and reuse the existing backend where suitable.

## Boundaries

Suggested code organization:

```text
lib/
  app/                       startup, routing, dependency composition
  design_system/             extracted theme tokens and faithful shared widgets
  core/                      database, network adapter, clock, secure credentials
  features/
    identity/                auth, profile, installation mode
    content_library/         catalog, packs, assets, downloads, updates
    practice/                setup, session engine, marking, review
    learning/                flashcards and formulas
    battle/                  local computer play and online 1v1 adapters
    progress/                history, mastery, streaks, XP projections
    leaderboards/            persisted remote snapshots
    school/                  shared launch flow and local result board
    entitlements/            personal access rules and local usage
    sync/                    durable outbox and reconciliation
```

Within substantial features, separate presentation, domain rules, and data adapters. Small features need not duplicate layers mechanically. Choose one consistent state-management approach after toolchain review. Avoid direct network/database calls in widgets and circular feature dependencies.

## Local-first storage

- Recommend SQLite or an equivalent transactional, migration-capable local database, plus files for content/media. Verify Android and Windows support before selecting packages.
- Partition personal records by account ID and school records by school/installation context. A name is a label, never a student identity.
- Define tables/entities for installed packs and versions, asset references, active personal sessions, completed sessions, answers, progress projections, usage counters, sync outbox, remote leaderboard snapshots, and separate school result entries.
- Persist a completed session and its outbox entry in one transaction. Rebuild derived progress from durable events if necessary.
- Store schema version and execute tested incremental migrations. An app update must retain downloads and pending results. Test migrations from previously shipped versions.
- Store auth tokens through platform credential storage; never in logs or the source snapshot. Exact offline unlock/logout policy remains a product decision.

## Content packs at larger scale

- Partition catalog by content kind, exam, subject, and year/coverage; download only selected packs. Avoid loading the whole bank into memory.
- Proposed manifest: schema version, immutable pack ID, content version, coverage, minimum supported client/schema, total bytes, file checksums, dependencies, question count, and publication time. Define the actual schema before coding.
- Download to staging; validate content and all required media; atomically promote a complete unit to ready. Keep old versions until no active session needs them.
- Index exam/subject/year/topic filters. Select questions locally through the same repository interface regardless of connection.
- Use resumable transfers if the server supports them, bounded concurrency, retries with backoff, and disk-space preflight. Do not promise background execution after app closure without platform verification.
- A backend-generated catalog and immutable files served through object storage/CDN are preferable to exporting the entire question bank per device. Validate authorization and paid-content distribution policy first. Delta updates are a future optimization, not a V1 prerequisite.

## Sync and backend scale

- Define explicit native-client authentication and versioned request/response contracts. Do not assume browser cookie routes work unchanged from Flutter.
- Give sessions/events stable IDs and send selected answers and content versions. Server validates answers and derives accepted XP; do not trust client-reported scores for published rankings.
- Outbox entries need account scope, payload version, retry state, acknowledgement, and diagnostic status. Use bounded upload batches with safe retries; never truncate unacknowledged activity to a fixed recent-history limit.
- Keep local projections and published standings distinct. Reconcile acknowledgements without awarding XP twice. Define multi-device and edited-question conflict behavior.
- Retain existing backend transactions and unique session constraints where valid. Add endpoints/indexes only when evidence requires them. Monitor database cost, query latency, download failures, and sync backlog rather than introducing speculative services.

## School extensibility without extra V1 scope

- Put school mode behind an explicit application context and capability policy, not scattered `isSchool` checks or fake Premium student accounts.
- Use a stable local result ID per saved session. Repeated names create separate rows. Skipped results create no board entry.
- Keep school-local result storage independent of personal progress and national ranking.
- Reserve identifiers/schema migration paths for future school capabilities, but do not build rosters, student identity, LAN servers, cloud boards, or reporting now.
- School setup/downloads and local practice must work without repeatedly depending on online school authentication.
- Prepare a repeatable Windows installation and update process; offline transfer of question packs to other computers is not a confirmed feature.

## Reliability and releases

- Inject clocks and network adapters so offline state, daily rules, timers, and retry behavior can be tested deterministically.
- Test XP/marking parity using vectors from original rules, crash-safe persistence, idempotent sync, interrupted pack promotion, migrations, and school isolation.
- Bundle necessary fonts/assets; inventory missing remotely loaded content and licenses.
- Keep logs free of credentials and student answers/names unless specifically needed and appropriately handled. Operational diagnostics must not block offline work.
- Build reproducible Android and Windows artifacts with documented signing/release inputs. Establish minimum supported OS/toolchain versions and upgrade compatibility before release.

## Delivery sequence

1. Resolve blocking policies, toolchain/auth feasibility, and visual reference gaps. Record a PWA baseline version.
2. Bootstrap Flutter theme, navigation, reusable PWA widgets, and local database migrations; compare one representative Android and Windows screen.
3. Deliver one complete vertical slice: account/profile → catalog → one validated pack → offline practice → results → durable sync acknowledgement.
4. Extend the existing practice modes, media rendering, mocks, and progress using the same engine; verify plan boundaries.
5. Add optional learning downloads, cached leaderboards, local battle, challenge provisioning, and live 1v1 under agreed contracts.
6. Add Windows school setup, unrestricted capability policy, separate optional result entries, and the home-practice invitation.
7. Complete screen-by-screen visual comparison, offline failure testing, migration/release checks, and target-device acceptance.

No slice replaces the full agreed scope. Each step should leave a reviewable working build without prematurely committing unresolved policy.
