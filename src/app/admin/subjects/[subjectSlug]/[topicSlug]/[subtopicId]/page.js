'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { parseLesson } from '@/lib/lessonParser'
import MobilePreview from '@/components/lesson/MobilePreview'
import Link from 'next/link'

export default function LessonEditorPage() {
  const params = useParams()
  const { subjectSlug, topicSlug, subtopicId } = params

  const [subtopic, setSubtopic] = useState(null)
  const [rawContent, setRawContent] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (!subtopicId) return
    fetch(`/api/admin/lessons/${subtopicId}`)
      .then(r => r.json())
      .then(data => {
        setSubtopic(data)
        if (data.lesson_content) {
          setRawContent(JSON.stringify(data.lesson_content, null, 2))
          setParseResult(parseLesson(JSON.stringify(data.lesson_content)))
        }
      })
  }, [subtopicId])

  const handleContentChange = useCallback((value) => {
    setRawContent(value)
    if (value.trim().length > 20) {
      setParseResult(parseLesson(value))
    } else {
      setParseResult(null)
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/lessons/${subtopicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_content: rawContent }),
      })
      const data = await res.json()
      if (data.valid) {
        setMessage({ type: 'success', text: `Saved ✓ — ${data.stats.totalSlides} slides, ${data.stats.questions} questions` })
        setSubtopic(prev => ({ ...prev, lesson_status: 'draft' }))
      } else {
        setMessage({ type: 'error', text: `${data.errors.length} error(s) — check the list below` })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error — try again' })
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (action) => {
    setPublishing(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/lessons/${subtopicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        setSubtopic(prev => ({ ...prev, lesson_status: data.status }))
        const labels = {
          published: 'Published ✓',
          draft: 'Unpublished',
          in_review: 'Sent for review ✓'
        }
        setMessage({ type: 'success', text: labels[data.status] })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error — try again' })
    } finally {
      setPublishing(false)
    }
  }

  if (!subtopic) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800',
    in_review: 'bg-blue-100 text-blue-800',
    published: 'bg-green-100 text-green-800',
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/admin/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <Link href={`/admin/subjects/${subjectSlug}`} className="hover:text-gray-600 capitalize">
          {subjectSlug}
        </Link>
        <span>/</span>
        <span className="capitalize">{topicSlug?.replace(/-/g, ' ')}</span>
        <span>/</span>
        <span className="text-gray-700 font-medium">{subtopic.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{subtopic.name}</h1>
          <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[subtopic.lesson_status]}`}>
            {subtopic.lesson_status}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !parseResult?.valid}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          {subtopic.lesson_status === 'draft' && (
            <button
              onClick={() => handleAction('send_for_review')}
              disabled={publishing || !parseResult?.valid}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-500 transition-colors"
            >
              Send for Review
            </button>
          )}
          {subtopic.lesson_status === 'in_review' && (
            <button
              onClick={() => handleAction('publish')}
              disabled={publishing}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg disabled:opacity-40 hover:bg-green-500 transition-colors"
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          )}
          {subtopic.lesson_status === 'published' && (
            <button
              onClick={() => handleAction('unpublish')}
              disabled={publishing}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg disabled:opacity-40 hover:bg-red-500 transition-colors"
            >
              Unpublish
            </button>
          )}
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Generation prompt */}
      {subtopic.generation_prompt && (
        <div className="mb-5">
          <button
            onClick={() => setShowPrompt(p => !p)}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            {showPrompt ? '↑ Hide generation prompt' : '↓ Show generation prompt'}
          </button>
          {showPrompt && (
            <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Paste into Claude
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(subtopic.generation_prompt)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Copy
                </button>
              </div>
              <pre className="text-sm text-blue-900 whitespace-pre-wrap font-mono leading-relaxed">
                {subtopic.generation_prompt}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Editor + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lesson JSON
          </label>
          <textarea
            value={rawContent}
            onChange={e => handleContentChange(e.target.value)}
            className="w-full h-[600px] font-mono text-sm p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Paste Claude-generated lesson JSON here..."
            spellCheck={false}
          />

          {/* Validation */}
          {parseResult && (
            <div className={`mt-3 p-3 rounded-xl text-sm ${
              parseResult.valid
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {parseResult.valid ? (
                <div className="text-green-800">
                  <span className="font-semibold">Valid ✓</span>
                  <span className="ml-2 text-green-600 text-xs">
                    {parseResult.stats.totalSlides} slides ·{' '}
                    {parseResult.stats.questions} questions ·{' '}
                    {parseResult.stats.imageSlots} image slots ·{' '}
                    {parseResult.stats.hasHookVideo ? 'Hook video ✓' : 'No hook video'}
                  </span>
                </div>
              ) : (
                <div className="text-red-800">
                  <span className="font-semibold">{parseResult.errors.length} error(s)</span>
                  <ul className="mt-1.5 list-disc list-inside space-y-0.5">
                    {parseResult.errors.map((err, i) => (
                      <li key={i} className="text-red-700 text-xs">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Preview
          </label>
          <MobilePreview
            lesson={parseResult?.valid ? parseResult.lesson : null}
            subjectName={subtopic?.topics?.subjects?.name}
          />
        </div>
      </div>
    </div>
  )
}