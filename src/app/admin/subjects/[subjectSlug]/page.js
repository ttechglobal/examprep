'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { parseLesson } from '@/lib/lessonParser'
import MobilePreview from '@/components/lesson/MobilePreview'
import Link from 'next/link'

export default function LessonEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { subjectSlug, topicSlug, subtopicId } = params

  const [subtopic, setSubtopic] = useState(null)
  const [rawContent, setRawContent] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [saving, setSaving] = useState(false)
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

  // Save = Live. No review step.
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
        setMessage({ type: 'success', text: `Saved & Live ✓ — ${data.stats.totalSections} sections` })
        setSubtopic(prev => ({ ...prev, lesson_status: 'published' }))
      } else {
        setMessage({ type: 'error', text: `${data.errors.length} error(s) — check the list below` })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error — try again' })
    } finally {
      setSaving(false)
    }
  }

  if (!subtopic) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isLive = subtopic.lesson_status === 'published'

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
          <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${
            isLive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isLive ? 'Live ✅' : 'No Lesson Yet'}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !parseResult?.valid}
            className="px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-lg disabled:opacity-40 hover:bg-green-500 transition-colors"
          >
            {saving ? 'Saving…' : isLive ? 'Save Changes' : 'Save — Go Live'}
          </button>
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
                <p className="text-green-800 font-bold">
                  ✓ Valid — {parseResult.stats?.totalSections} sections ready to save
                </p>
              ) : (
                <>
                  <p className="text-red-800 font-bold">{parseResult.errors.length} error(s)</p>
                  <ul className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-700">· {err}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preview
          </label>
          {parseResult?.valid ? (
            <MobilePreview subtopicId={subtopicId} lessonContent={parseResult.lesson} />
          ) : (
            <div className="h-[600px] bg-gray-50 rounded-xl flex items-center justify-center">
              <p className="text-gray-400 text-sm">
                {rawContent.trim().length > 20 ? 'Fix JSON errors to see preview' : 'Paste valid JSON to see preview'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}