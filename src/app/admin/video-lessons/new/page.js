// src/app/admin/video-lessons/new/page.js
import { createClient as createServiceClient } from '@supabase/supabase-js'
import VideoLessonEditorClient from '@/components/admin/VideoLessonEditorClient'

export default async function NewVideoLessonPage() {
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: subjects } = await db
    .from('subjects')
    .select('id, name, slug, exam_type')
    .eq('is_active', true)
    .order('name')

  const { data: topics } = await db
    .from('topics')
    .select('id, name, slug, subject_id')
    .order('name')

  return (
    <VideoLessonEditorClient
      mode="new"
      subjects={subjects ?? []}
      allTopics={topics ?? []}
      existing={null}
    />
  )
}