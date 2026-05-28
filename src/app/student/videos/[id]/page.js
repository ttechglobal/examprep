// src/app/student/videos/[id]/page.js
// Full video lesson page — video player + practice questions

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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Back nav */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            href="/student/videos"
            className="text-gray-400 hover:text-gray-600 text-sm font-medium"
          >
            ← Videos
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5">
        <VideoLessonPlayer lesson={lesson} />
      </div>
    </div>
  )
}