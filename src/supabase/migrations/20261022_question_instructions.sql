-- Apply before deploying the admin content-preservation changes.
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS instruction_text text;
COMMENT ON COLUMN public.questions.instruction_text IS 'Source answer instruction, distinct from passage and question stem. Safe text with u/strong/em/sup/sub inline marks; never executable HTML.';

-- Some installations have not enabled the optional hidden-question queue.
ALTER TABLE IF EXISTS public.hidden_questions ADD COLUMN IF NOT EXISTS passage_text text;
ALTER TABLE IF EXISTS public.hidden_questions ADD COLUMN IF NOT EXISTS passage_image_url text;
ALTER TABLE IF EXISTS public.hidden_questions ADD COLUMN IF NOT EXISTS instruction_text text;
ALTER TABLE IF EXISTS public.hidden_questions ADD COLUMN IF NOT EXISTS content_review_issues jsonb NOT NULL DEFAULT '[]'::jsonb;
