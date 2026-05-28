// src/app/admin/video-lessons/[id]/page.js
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import VideoLessonEditorClient from '@/components/admin/VideoLessonEditorClient'

export default async function EditVideoLessonPage({ params }) {
  const { id } = await params

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const [{ data: lesson }, { data: subjects }, { data: topics }] = await Promise.all([
    db.from('video_lessons').select('*').eq('id', id).single(),
    db.from('subjects').select('id, name, slug, exam_type').eq('is_active', true).order('name'),
    db.from('topics').select('id, name, slug, subject_id').order('name'),
  ])

  if (!lesson) notFound()

  return (
    <VideoLessonEditorClient
      mode="edit"
      subjects={subjects ?? []}
      allTopics={topics ?? []}
      existing={lesson}
    />
  )
}