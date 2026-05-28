// src/app/admin/video-lessons/page.js
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'
import VideoLessonsClient from '@/components/admin/VideoLessonsClient'

export default async function AdminVideoLessonsPage() {
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Fetch subjects + topics for filters
  const { data: subjects } = await db
    .from('subjects')
    .select('id, name, slug, exam_type')
    .eq('is_active', true)
    .order('name')

  const { data: topics } = await db
    .from('topics')
    .select('id, name, slug, subject_id')
    .order('name')

  // Summary stats
  const { data: stats } = await db
    .from('video_lessons')
    .select('status', { count: 'exact' })

  const published = stats?.filter(s => s.status === 'published').length ?? 0
  const draft     = stats?.filter(s => s.status === 'draft').length ?? 0

  return (
    <VideoLessonsClient
      subjects={subjects ?? []}
      topics={topics ?? []}
      published={published}
      draft={draft}
    />
  )
}