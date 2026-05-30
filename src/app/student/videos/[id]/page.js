// src/app/student/videos/[id]/page.js
// Fix: dark mode — header uses bg-card / border-default tokens, not hardcoded white

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import VideoLessonPlayer from '@/components/lesson/VideoLessonPlayer'
import Link from 'next/link'

export default async function VideoLessonPage({ params }) {
  const { id } = await params

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: lesson, error } = await db
    .from('video_lessons')
    .select(`
      id, title, lesson_type, exam_type, tags,
      video_url, practice_questions,
      subject_id, topic_id,
      subjects ( id, name, slug ),
      topics   ( id, name, slug )
    `)
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !lesson) notFound()

  return (
    <div className="min-h-screen bg-base pb-24">
      {/* Back nav — uses CSS tokens for dark mode */}
      <div className="sticky top-14 bg-card border-b border-default z-10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/student/videos"
            className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Videos
          </Link>
          <span className="text-tertiary">·</span>
          <p className="text-sm font-bold text-primary truncate">{lesson.title}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">
        <VideoLessonPlayer lesson={lesson} />
      </div>
    </div>
  )
}