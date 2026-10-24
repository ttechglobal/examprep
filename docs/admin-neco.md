NECO content preparation
========================

The admin catalogue supports WAEC, JAMB and NECO. Student exam selection remains
WAEC and JAMB. NECO content is prepared through the existing admin tools:

1. Add an exam-specific NECO subject in `/admin/subjects-manager`.
2. Upload that subject's NECO curriculum in `/admin/curriculum/upload`.
3. Upload genuine NECO questions in `/admin/questions/upload`, or import through
   MyQuest where that provider offers the exam, subject and year.
4. Review the question bank, past questions and coverage under NECO.

Question and curriculum writes must match the owning subject's exam. Uploaded
questions carry both `exam_type` and `exam_types`, with the scalar field remaining
the operational practice filter. No IGCSE records are renamed into NECO records.

Deployment prerequisite
-----------------------

Run `src/supabase/migrations/20261022_admin_neco.sql` before deploying this change.
It normalises legacy shared tags using each content record's owning subject,
preserves record IDs, removes shared-tag predicates from installed practice SQL,
updates content exam constraints and rebuilds cached coverage. It runs in a
transaction and stops if a shared subject or question cannot be assigned safely.
Resolve those editorial ambiguities before rerunning. Existing historical
migrations retain their original definitions; the new migration supersedes them.

The migration has not been executed against the live database as part of this
change. Apply it to a database copy and check counts before production rollout.
It does not create subjects, import questions, or enable NECO student features.

Sdash import has been removed, including its page and external API routes.
Independent question tagging now uses `/api/admin/questions/tag`. MyQuest keeps
the shared enrichment utilities and historical provider ID columns for
deduplication. Existing held Sdash data in IndexedDB is retained to avoid deleting
editorial work.

Validation: focused API, curriculum, enrichment and availability tests pass.
The migration also passes a local PGlite PostgreSQL integration test, including
reruns, array constraints and ambiguous subjects. The full suite has six skipped
tests. Wider UI lint has pre-existing React effect errors. Production build
verification remains incomplete: Turbopack stalled without further output.
