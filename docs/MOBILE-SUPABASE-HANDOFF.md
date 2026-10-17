# ExamPrep A1 — mobile Supabase connection handoff

Prepared 16 October 2026 from repository inspection and read-only queries to the Supabase project configured by the web app. No implementation, database, policy, or data changes were made during discovery.

## Instruction for the mobile chat

Read this document before connecting the Flutter app. Reuse the existing Supabase project and user identities. Preserve the existing installer, version-pinned sessions, SQLite persistence, and sequential subject download queue. Distinguish verified capabilities from proposed backend additions below. Do not assume that a proposed endpoint exists. Do not put service-role keys in Flutter. First report the smallest integration plan and missing backend contracts before implementing dependent work.

## Mobile context

- Flutter targets Android and Windows.
- SQLite stores local activity and installed content metadata.
- Practice already reads installed versioned question packs.
- The fixture installer stages files, checks byte sizes/SHA-256, and validates questions before installation.
- Sessions pin question IDs and content versions.
- Current installed content is synthetic; production transport is not connected.
- Download one subject at a time, in small sequential batches; queue additional subjects.
- Bundle a subject catalogue, with optional online updates.
- Downloaded questions, explanations, and required media must work offline for weeks/months.
- Generate weekly personal challenges locally from installed content; no weekly server schedule dependency.
- Premium is manually activated by an admin for an existing account; no payment integration is requested.
- Keep downloaded files after Premium expires. Apply entitlement restrictions when practising, independently of download volume.

## Evidence and access limits

Verified live: configured project OpenAPI metadata, public content samples, anonymous content reads, selected exact counts, bucket metadata, and server-side topic-frequency output.

Verified in repository: authentication implementation, plan calculations, web read paths, migrations, and admin activation flow. Source files do not establish that every migration is deployed.

Unverified: exact deployed RLS expressions/grants/triggers/indexes, normal signed-in-user table permissions, and production web deployment configuration. No private student account rows were queried, and no sign-in credentials are included.

## 1. Connection configuration and identity

Obtain these values from the existing web project's environment or the same Supabase project's settings:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Actual values are intentionally not included. The mobile developer needs the project URL and a client-safe anon/publishable key supplied separately. Never use the service-role key, database password, admin password, or server secrets.

The web's client uses those variables in `src/lib/supabase/client.js`.

### Existing sign-in

Email: trim and lowercase the email, then call Supabase password sign-in.

Phone: this product does NOT use Supabase phone OTP or its native phone-password provider. It normalizes a Nigerian mobile number into a synthetic email, then uses email/password authentication:

```text
08012345678 -> 2348012345678@phone.examprep.ng
```

Port `src/lib/auth/phone.js` exactly:

1. Remove non-digits.
2. Remove leading `234`, otherwise remove leading `0`.
3. Validate the remaining national number with `^[789][01]\\d{8}$` (the regex itself uses one backslash before d).
4. Login email is `234` + national number + `@phone.examprep.ng`.
5. Stored contact number is `+234` + national number.

After sign-in, `session.user.id` is the same UUID as `public.profiles.id`. Use that UUID to read access and associate future activity. Do not create a new account merely because the learner moved from web to mobile. Adding a phone contact to an email account does not automatically create the synthetic-email login identity.

### Existing registration

```http
POST https://www.examprepa1.online/api/auth/signup
Content-Type: application/json

{"method":"email","email":"<student-email>","password":"<entered-password>"}
```

Or send `method: "phone"`, `phone`, and `password`.

Response shape:

```json
{"ok":true,"loginEmail":"<normalized-or-derived-login-email>","referral":null}
```

Then sign in to Supabase with `loginEmail` and the entered password. This preserves confirmed-account creation and duplicate-phone checks. Direct client sign-up is not an equivalent replacement without reviewing these behaviors.

Sources: `src/lib/auth/client.js`, `src/lib/auth/phone.js`, `src/app/api/auth/signup/route.js`.

### Web API authentication gap

`src/lib/supabase/server.js` obtains authentication through Next.js cookies. Existing user-aware routes do not automatically consume a native bearer token.

Proposed smallest addition: make mobile-facing account reads validate the Supabase bearer access token and derive the user UUID from it. Do not accept an arbitrary student UUID as authorization. Do not assume calling `/api/student/plan` with only a bearer token already works.

## 2. Current anonymous permissions

Live probes:

| Operation | Observed result |
| --- | --- |
| Anonymous subject read | HTTP 200 |
| Anonymous topic sample | HTTP 200 |
| Anonymous full active question, including answer/explanation | HTTP 200 |
| Anonymous get_practice_questions RPC | HTTP 401 / PostgreSQL 42501 |
| Anonymous topic_question_counts RPC | HTTP 401 / PostgreSQL 42501 |
| Anonymous topic_frequency RPC | HTTP 401 / PostgreSQL 42501 |

Checked-in migrations restrict these RPCs to the server role, also revoking normal authenticated execution. Exact live table policies were not available for inspection. Anonymous readability is an observed capability, not approval for unrestricted paid-content distribution.

## 3. Content tables and identifiers

```text
public.subjects.id <- public.topics.subject_id
public.topics.id   <- public.subtopics.topic_id

public.questions.subject_id  -> subjects.id
public.questions.topic_id    -> topics.id
public.questions.subtopic_id -> subtopics.id
```

Use UUIDs as canonical identifiers. Names/slugs can change. WAEC and JAMB subjects have separate UUIDs. A question UUID identifies a mutable record, not an immutable revision; mobile sessions need both question ID and content version.

Relevant live fields:

- `subjects`: `id uuid`, `name text`, `slug text`, `exam_type text`, `order_index integer`, `is_active boolean`.
- `topics`: `id uuid`, `subject_id uuid`, `name text`, `slug text`, `order_index integer`, `exam_type text`.
- `subtopics`: `id uuid`, `topic_id uuid`, `name text`, `slug text`, `order_index integer`, `exam_type text`, plus lesson-specific fields.
- `questions`: `id uuid`, `subject_id uuid`, nullable `topic_id uuid`, nullable `subtopic_id uuid`, `exam_type text`, nullable `exam_types text[]`, `year text`, `source text`, `question_text text`, `options jsonb`, `correct_answer text`, `explanation jsonb`, `difficulty text`, `has_image boolean`, `image_url text`, `image_description text`, `passage_text text`, `passage_image_url text`, `hint text`, `instruction_text text`, `is_active boolean`, `is_flagged boolean`, `created_at timestamptz`, `upload_batch_id uuid`.

Verified absent: `questions.updated_at`, top-level `questions.svg_diagram`, immutable content revision, deletion timestamp, and pack/download metadata tables exposed through the API.

The actual practice SQL filters `is_active=true` and `exam_type IN (requested_exam,'BOTH')`. It has no separate question approved/published status check. Flagged questions are not automatically excluded. Hidden editorial questions are held in `hidden_questions`, a separate table.

Do not base filtering on the constants-file comment about replacing BOTH with `exam_types[]`: operational SQL still uses `exam_type`, and all 239 inspected WAEC Mathematics rows had `exam_types=null`.

## 4. Subject catalogue

Existing public web endpoint:

```http
GET https://www.examprepa1.online/api/student/subjects?exam=WAEC&catalog=1
```

Equivalent direct Supabase REST read:

```http
GET {SUPABASE_URL}/rest/v1/subjects?select=id,name,slug,exam_type,order_index&is_active=eq.true&exam_type=eq.WAEC&order=name.asc,id.asc
apikey: {CLIENT_SAFE_KEY}
```

Use a user access token as `Authorization: Bearer {ACCESS_TOKEN}` for authenticated requests. The anon key is not a user session token.

Catalogue response example:

```json
{
  "id":"00000000-0000-0000-0000-000000000001",
  "name":"Mathematics",
  "slug":"mathematics",
  "exam_type":"WAEC",
  "order_index":1
}
```

The live catalogue returned 31 active subjects: 15 WAEC, 16 JAMB. No IGCSE rows were returned. Subject presence does not guarantee question availability.

| Subject | WAEC UUID | JAMB UUID |
| --- | --- | --- |
| Accounting | `23c95b95-95b0-4b37-8ca9-84360803ea7c` | `3816ac20-d73f-4361-8ee3-d24d0f3676cb` |
| Agricultural Science | `00000000-0000-0000-0000-000000000010` | `9bad035c-9d9b-44da-b8c5-6bcaa3a46068` |
| Biology | `00000000-0000-0000-0000-000000000005` | `21f1d3b3-5809-4247-95a9-dfe58aaebb73` |
| Chemistry | `00000000-0000-0000-0000-000000000004` | `eb1793b1-917b-4737-bb61-834be91f4a80` |
| Commerce | `0cc3efb2-19e5-4565-a34f-74db15dcc067` | `0805f8af-22a1-448c-87fa-5b9ca29f9356` |
| CRK | `d1082c42-7b93-4477-b35b-488e83ff97de` | `73d9d998-f030-435e-875c-b5549bbf035d` |
| Economics | `00000000-0000-0000-0000-000000000006` | `41bdaf76-b3b2-4e4a-b4ba-943c22e779bd` |
| English Language | `00000000-0000-0000-0000-000000000002` | `3845b046-382c-4597-a500-a160f66a61b7` |
| Further Mathematics | `38457e82-b216-4ae0-a158-ed69c3814e8b` | `66604f1b-26d3-44d0-bd9c-2d2d77059379` |
| Geography | `00000000-0000-0000-0000-000000000009` | `abc34126-40e2-45c5-89e9-3d5cf7e35f8b` |
| Government | `00000000-0000-0000-0000-000000000007` | `865ac378-d3c6-4a0a-ae63-24419bfffc38` |
| History | `52d48b70-0ab4-4b1a-bf8f-ce7efdb93f4d` | `2342dcb5-ef88-4d4c-aeba-1b579f2cdb25` |
| Literature in English | `00000000-0000-0000-0000-000000000008` | `16247a6e-bfc0-41eb-8aab-069cee3aba9d` |
| Mathematics | `00000000-0000-0000-0000-000000000001` | `26af50c2-a273-4761-99ca-9e913524660f` |
| Physics | `00000000-0000-0000-0000-000000000003` | `f2cba9f2-788b-40a8-9ac1-0d0728b91d3b` |
| The Lekki Headmaster | — | `fa959e04-edc7-4b7e-8a99-ecdf4fdc5771` |

JAMB English is stored as English Language; the UI displays Use of English. Bundle canonical IDs/exams and keep aliases/display labels separately. Do not regenerate IDs from names or slugs. Optional catalogue updates should retain old IDs needed by installed packs/history.

Sources: `src/app/api/student/subjects/route.js`, `src/hooks/useExamSubjects.js`, `src/lib/subjectSlug.js`.

## 5. Question downloads and taxonomy

Use this field selection in the batched query below:

```text
id,subject_id,topic_id,subtopic_id,exam_type,year,source,question_text,options,correct_answer,explanation,difficulty,has_image,image_url,image_description,passage_text,passage_image_url,hint,instruction_text
```

First page (replace `{QUESTION_FIELDS}` with the comma-separated selection):

```http
GET {SUPABASE_URL}/rest/v1/questions?select={QUESTION_FIELDS}&subject_id=eq.00000000-0000-0000-0000-000000000001&exam_type=in.(WAEC,BOTH)&is_active=eq.true&order=id.asc&limit=50
```

Optional filters: `&year=eq.2025`, `&source=eq.past_paper`.

Next page uses the identical query plus:

```text
&id=gt.{LAST_SUCCESSFULLY_STORED_UUID}
```

Supabase supports these ordered/keyset reads; this is not an existing versioned download API. The underlying dataset can change between requests.

Topics:

```http
GET {SUPABASE_URL}/rest/v1/topics?select=id,subject_id,name,slug,order_index,exam_type&subject_id=eq.{SUBJECT_UUID}&order=order_index.asc,id.asc
```

Subtopics can be fetched by included topic IDs:

```http
GET {SUPABASE_URL}/rest/v1/subtopics?select=id,topic_id,name,slug,order_index,exam_type&topic_id=in.({TOPIC_UUID_1},{TOPIC_UUID_2})&order=order_index.asc,id.asc
```

Existing public playable-topic endpoint:

```http
GET https://www.examprepa1.online/api/student/topics?subject_id={SUBJECT_UUID}&exam=WAEC
```

It returns topics with `question_count` and `free`. Free eligibility is based on the first five playable topics in curriculum order, not merely the first five topics in a limited installed subset.

### Complete representative live question

```json
{
  "id":"011b61d2-a1dd-4d5e-a861-819274735a18",
  "subject_id":"00000000-0000-0000-0000-000000000001",
  "topic_id":"e5a59a01-0884-4818-bb3e-356bd1e1b48e",
  "subtopic_id":"81dcc424-59fa-4a47-be8f-6369fd15831b",
  "exam_type":"WAEC",
  "year":"2025",
  "source":"past_paper",
  "question_text":"What is the gradient of the line 7x - 5y + 3 = 0",
  "options":{"A":"7/5","B":"5/7","C":"-5/7","D":"-7/5"},
  "correct_answer":"A",
  "explanation":{
    "hint":"Rearrange the equation so y is on its own on one side, then look at the coefficient of x.",
    "intro":"Let's work through this step by step.",
    "steps":[
      {"lines":["$7x - 5y + 3 = 0$","$5y = 7x + 3$"],"title":"Rearrange to make y the subject"},
      {"lines":["$y = \\frac{7}{5}x + \\frac{3}{5}$"],"title":"Divide through by 5"},
      {"lines":["$m = \\frac{7}{5}$"],"title":"Read off the gradient"}
    ],
    "concept":"Rearranging a line equation into y = mx + c form to find the gradient",
    "correct":"The correct answer is **A — 7/5**. Rearranging into y = mx + c form shows the gradient is 7/5.",
    "workings":[],
    "study_tip":"Once an equation is in the form y = mx + c, the gradient is always the number multiplying x.",
    "answer_note":"The correct answer is **A — 7/5**. Rearranging the equation into y = mx + c form shows the gradient is the coefficient of x, which is 7/5.",
    "formula_box":"$y = mx + c$",
    "variables_key":["$m$ = gradient of the line","$c$ = y-intercept"],
    "wrong_options":{
      "B":"B — 5/7 is the reciprocal of the correct gradient, which happens if x and y coefficients get swapped.",
      "C":"C — -5/7 has both the wrong value and the wrong sign compared with the correct gradient.",
      "D":"D — -7/5 has the correct size but the wrong sign — check the sign carefully when moving terms across the equals sign."
    },
    "wrong_option_note":"",
    "illustration_title":"",
    "illustration_prompt":""
  },
  "difficulty":"medium",
  "has_image":false,
  "image_url":null,
  "image_description":"",
  "passage_text":null,
  "passage_image_url":null,
  "hint":null,
  "instruction_text":null
}
```

Options are JSONB objects (or arrays accepted by web normalization). Preserve A–E order; do not rely on JSON property ordering or shuffle choices. Web marking supports matching letters/text/numeric indices, but the database correct-answer field is text: normalize to exactly one explicit correct option and reject ambiguous values.

Question/option text supports LaTeX `$...$`/`$$...$$`. Explanation prose supports a limited bold/italic syntax. Include structured steps, variables, wrong-option notes, and inline explanation SVG where present. The web loads KaTeX through a CDN; mobile must bundle its renderer/fonts/resources.

Install main images, passage images, and any embedded explanation dependencies as local assets. Existing buckets `lesson-images` and `question-images` are public. Image uploads permit `upsert`, so remote URLs alone do not guarantee immutable bytes. No active question image URLs were found in the inspected live counts, and no real media download/Range behavior was verified.

Sources: `src/lib/answers.js`, `src/lib/mathRenderer.js`, `src/components/session/ExplanationBlock.jsx`, `src/components/ui/QuestionFigure.jsx`, `src/lib/questionImageUpload.js`.

### Do not use session sampling as export

`GET /api/student/questions` uses server-only `get_practice_questions`, random sampling/year spread, exclusions, and plan gates. It caps a request at 100 questions. It is not stable complete-export pagination. It also nulls `hint`/`instruction_text` rather than returning those database fields.

Sources: `src/app/api/student/questions/route.js`, `src/lib/battleQuestionPool.js`, `src/supabase/migrations/20261003_question_illustrations.sql`.

## 6. Resume and update limitations; smallest proposed addition

For a direct-read prototype, store each page and its last UUID in one SQLite transaction. A retry can upsert that page without duplicates. This does NOT guarantee a coherent snapshot: newly inserted IDs may precede the cursor; previously downloaded records may be edited/removed.

Current backend lacks verified content revision IDs, question updated timestamps, deletion feed, and versioned export endpoints. Admin edit/archive code attempts to write `questions.updated_at`, but live queries report that the column does not exist. Do not rely on that code as proof of update support.

Proposed smallest reliable production addition:

1. Export one subject from a consistent database snapshot.
2. Normalize and validate questions/taxonomy/media.
3. Publish immutable small batch files plus a manifest with exam, subject UUID, coverage, immutable version, question count, byte sizes, SHA-256, schema/minimum-client compatibility, media dependencies, and topic frequency.
4. Publish the manifest/catalogue pointer only after every file exists.
5. Mobile resumes only the same immutable version, validates/stages all files, then atomically activates the replacement.
6. Compare full ID inventories between releases to detect removals; retain old versions for pinned sessions. Full replacement avoids building deltas/tombstones in V1.

Actual HTTP byte-range resume support must be checked on the chosen host. Public or refreshed signed URLs may transport the files; URL expiry must not expire already installed bytes. Remote withdrawal cannot instantly revoke an installation that stays offline.

This pipeline is a proposal, not an implemented endpoint. It can reuse Supabase Storage and the current bank without changing existing practice responses. A dedicated content bucket or static-host path needs to be selected. The existing question-images bucket only accepts image MIME types and is unsuitable for JSON pack files.

Verified pilot content: WAEC Mathematics has 239 active questions across 2020–2025; the raw all-column JSON response measured 503,518 bytes. Year counts: 2020=40, 2021=40, 2022=39, 2023=40, 2024=40, 2025=40. This is imported coverage, not proof of complete original papers. No HTTP links occurred in that subject snapshot. Start with an explicitly approved public 2025 pack of 40 questions, then extend to the full subject.

## 7. Topic frequency snapshot

Existing calculation:

```javascript
// SERVER ONLY; do not ship its credentials in Flutter.
db.rpc('topic_frequency', {
  p_subject_id: '00000000-0000-0000-0000-000000000001',
  p_exam: 'WAEC'
})
```

Existing HTTP wrapper is admin-only:

```http
GET /api/admin/frequency?subjectId={UUID}&examType=WAEC
```

Normal mobile clients must not use admin credentials. Proposed: expose a read-only mobile wrapper or include the existing helper output with each published subject snapshot.

Verified live row:

```json
{
  "topic_id":"c31af8c0-7c25-4602-8f68-5d7089bcc13a",
  "topic_name":"Mensuration: Surface Areas, Volumes, and Earth Geometry",
  "order_index":22,
  "past_count":27,
  "years_appeared":6,
  "total_years":6,
  "share_pct":13.1,
  "bank_count":27,
  "rank":1
}
```

- `past_count`: active past-paper questions tagged to this topic.
- `years_appeared`: distinct years containing those questions.
- `total_years`: distinct years in the subject's tagged past-paper pool.
- `share_pct`: percentage of that pool's questions belonging to this topic, NOT percentage of years.
- `bank_count`: all active questions on the topic, regardless of source.
- `rank`: descending years appeared, then past-question count.

These describe imported bank coverage, not the entire official examination archive. Map rows to the requested subject UUID/exam and their topic UUIDs. Retain and refresh the snapshot alongside content. Local challenges must filter it to installed playable coverage.

Reuse pure selection/rotation ideas from `src/lib/missions.js`, dates from `src/lib/dates.js`, and local attempt evidence. Persist each week's selection/rule version so opening the screen does not reroll it. Do not depend on web weekly challenge endpoints: their GET handlers can create sets or award server XP. Local personal rewards are not automatically competitive/server-verified rewards.

Sources: `src/lib/server/topicFrequency.js`, `src/app/api/admin/frequency/route.js`, `src/supabase/migrations/20261009_frequency_and_missions.sql`.

## 8. Account access and manual Premium

Read the signed-in user's `public.profiles` fields:

| Field | Meaning |
| --- | --- |
| `id uuid` | Same identity as Supabase Auth user |
| `created_at timestamptz` | Profile creation, not a reliable exact trial-start record |
| `plan text` | Stored free/premium value |
| `plan_expires_at timestamptz` | Premium expiry; null means no end when plan is premium |
| `trial_ends_at timestamptz` | Trial expiry |

Verified live: default trial end is now + 14 days; `trial_started_at` and `trial_starts_at` are absent. A migration resets existing trials, so do not reconstruct trial start from profile creation or assume every trial end is exactly creation + 14 days.

Candidate own-profile query, subject to verifying signed-in SELECT permission:

```http
GET {SUPABASE_URL}/rest/v1/profiles?select=id,created_at,plan,plan_expires_at,trial_ends_at&id=eq.{SIGNED_IN_USER_UUID}
apikey: {CLIENT_SAFE_KEY}
Authorization: Bearer {USER_ACCESS_TOKEN}
```

Existing authoritative web endpoint:

```http
GET https://www.examprepa1.online/api/student/plan
```

Illustrative response shape (not a real student record):

```json
{
  "status":{
    "premium":true,
    "source":"paid",
    "until":"<premium-expiry-timestamp>",
    "daysLeft":30,
    "trialEnded":false,
    "paidEnded":null
  },
  "usage":{"custom":0,"battle":1}
}
```

Current endpoint requires web cookies. Proposed minimal mobile adaptation: validate bearer tokens, return computed status plus raw `plan`, `plan_expires_at`, `trial_ends_at`, and server time for offline recalculation. These additional response fields are NOT currently provided by that route.

Exact existing status logic (`src/lib/plans.js`):

1. `plan == premium` and no expiry -> Premium.
2. `plan == premium` and future expiry -> Premium.
3. Otherwise future `trial_ends_at` -> Premium.
4. Otherwise -> Free.

Do not rely on `plan == premium` alone: it can remain stored after expiry.

Manual activation is already implemented:

```text
Admin locates student's existing account UUID by contact
POST /api/admin/students/{id}/subscriptions
  -> activate_subscription(...)
  -> subscriptions ledger
  -> sync_profile_plan(...)
  -> profiles.plan / plan_expires_at
```

Mobile reads the resulting profile/status, not admin endpoints or activation RPCs. Ledger fields include `student_id`, `plan_id`, `starts_at`, `ends_at`, `status`, and `source`; mobile need not query admin payment notes/history to enforce practice access. No payment integration is requested.

Plan fields are protected from normal client updates in checked-in trigger definitions. Exact deployed trigger and account RLS behavior remain unverified.

Sources: `src/app/api/student/plan/route.js`, `src/lib/server/entitlements.js`, `src/lib/plans.js`, `src/app/api/admin/students/[id]/subscriptions/route.js`, `src/supabase/migrations/20261005_plans.sql`, `20261006_subscriptions.sql`, `20261011_trial_and_admin_speed.sql`, `20261012_trial_for_everyone.sql`.

### Existing Free limits

| Feature | Free access |
| --- | --- |
| Quick 5 | Available |
| Topic practice | First five playable topics per subject in curriculum order |
| Custom, Study, Speed Round | One shared session per day |
| Mock | Premium only |
| Computer battle | Two per day |
| Live friend battle | Premium only; internet required |
| Flashcards, explanations, progress, leaderboards, daily challenge | No plan gate in current configuration |

Definitions: `TRIAL_DAYS`, `FREE_TOPICS_PER_SUBJECT`, `FEATURES`, `planStatus`, `featureAccess`, `practiceFeature` in `src/lib/plans.js`. Topic eligibility is `src/lib/server/subjectTopics.js`.

Daily boundaries use Africa/Lagos. Server daily usage is `public.feature_usage(student_id,feature,ref,day,created_at)`; `use_feature` is the server-only atomic check/count operation. `ref` identifies a session so retries do not count twice. Mobile must keep local offline start counters and later reconcile; strict multi-device offline limits are not solved by current backend contracts.

Keep downloaded files when access expires. Recompute access from cached dates at practice start, apply Free limits, and refresh on reconnection to detect admin activation. Offline entitlement authenticity, clock tampering, revocation timing, and cross-device reconciliation need explicit policy. Do not silently introduce an always-online requirement.

## 9. Minimum integration plan and blocking backend gaps

Existing and reusable:

- Same-project password authentication and stable account UUIDs.
- Public subject catalogue and active-question REST reads.
- Topic/subject UUID relationships and complete explanation data.
- Server frequency calculation and manual Premium activation.
- Product access rules in source.

Proposed additions, not currently implemented:

1. Bearer-authenticated account-access read endpoint (or verified own-profile SELECT), with expiry dates and server time.
2. Immutable subject snapshot publication with small batch files/manifests, hashes, complete taxonomy/media, and resumable version identity.
3. Read-only topic-frequency delivery, preferably included in that snapshot.
4. Future entitlement/usage reconciliation policy; not a prerequisite to displaying an approved pilot content pack.

Do not globally loosen RPC grants or alter web practice responses just to connect mobile. Confirm account-free content-distribution scope before public publication. Backend additions should be additive and preserve web compatibility.

The original web repository was at `C:/Users/user/Documents/_projects_/examprep_v2/examprep`. Source paths above are relative to that repository; if the mobile workspace has the previous handoff, they are under `reference/pwa-source/`. This document is self-contained for planning but contains no actual connection key, live service token, deployed mobile endpoint, or production pack file.
