'use client'

// src/components/admin/VideoLessonEditorClient.jsx
// Full admin editor for creating and editing video lesson packages.
// Workflow: set metadata → generate prompt → copy to Claude → paste JSON back → add video URL → publish

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { buildVideoLessonPrompt, parseVideoLesson } from '@/lib/videoLessonParser'
import Link from 'next/link'

const LESSON_TYPES = [
  {
    id: 'calculation',
    label: '🧮 Calculation',
    desc: 'Maths, Physics — step-by-step worked examples',
  },
  {
    id: 'concept',
    label: '📘 Concept',
    desc: 'Biology, Chemistry theory — plain-English explanations',
  },
  {
    id: 'mixed',
    label: '🧠 Mixed',
    desc: 'Both concept and calculation together',
  },
]

const DIFFICULTY_COLORS = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard:   'bg-red-100 text-red-700',
  mixed:  'bg-purple-100 text-purple-700',
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'setup',     label: '1. Setup' },
  { id: 'generate',  label: '2. Generate' },
  { id: 'paste',     label: '3. Paste & Validate' },
  { id: 'video',     label: '4. Video URL' },
  { id: 'preview',   label: '5. Preview & Publish' },
]

// ── Video URL helpers ─────────────────────────────────────────────────────────
function isYouTubeUrl(url) {
  return /youtube\.com|youtu\.be/.test(url)
}

function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  return match ? match[1] : null
}

function VideoPlayer({ url }) {
  if (!url) return null
  if (isYouTubeUrl(url)) {
    const vid = getYouTubeId(url)
    if (!vid) return <p className="text-xs text-red-500">Could not extract YouTube video ID</p>
    return (
      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-gray-900">
        <iframe
          src={`https://www.youtube.com/embed/${vid}`}
          className="w-full h-full"
          allow="encrypted-media"
          allowFullScreen
        />
      </div>
    )
  }
  // Direct video URL
  return (
    <video
      src={url}
      controls
      className="w-full rounded-2xl bg-gray-900"
    />
  )
}

// ── Practice question preview ─────────────────────────────────────────────────
function QuestionPreview({ question, index }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const correct = question.correct_answer
  const wrongKeys = Object.keys(question.options).filter(k => k !== correct)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-400">Q{index + 1}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${DIFFICULTY_COLORS[question.difficulty]}`}>
          {question.difficulty}
        </span>
      </div>

      <p className="text-sm font-medium text-gray-900">{question.question}</p>

      <div className="space-y-2">
        {Object.entries(question.options).map(([key, text]) => {
          let style = 'border-gray-200 text-gray-700'
          if (revealed) {
            if (key === correct) style = 'border-green-400 bg-green-50 text-green-800'
            else if (key === selected) style = 'border-red-300 bg-red-50 text-red-700'
          } else if (key === selected) {
            style = 'border-indigo-400 bg-indigo-50 text-indigo-800'
          }
          return (
            <button
              key={key}
              onClick={() => { setSelected(key); setRevealed(true) }}
              className={`w-full text-left text-xs px-3 py-2.5 rounded-xl border-2 transition-colors ${style}`}
            >
              <span className="font-bold mr-2">{key}.</span> {text}
            </button>
          )
        })}
      </div>

      {revealed && (
        <div className="space-y-2">
          {/* Correct explanation */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs font-bold text-green-700 mb-1">✓ Why {correct} is correct</p>
            <p className="text-xs text-green-800">{question.correct_explanation}</p>
          </div>

          {/* Wrong explanations */}
          {selected && selected !== correct && question.wrong_explanations?.[selected] && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 mb-1">✗ Why {selected} is wrong</p>
              <p className="text-xs text-red-800">{question.wrong_explanations[selected]}</p>
            </div>
          )}

          {/* Show all wrong explanations in admin */}
          <details className="text-xs">
            <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
              Show all wrong-answer explanations
            </summary>
            <div className="mt-2 space-y-1.5">
              {wrongKeys.map(k => (
                <div key={k} className="bg-gray-50 rounded-lg p-2.5">
                  <p className="font-bold text-gray-600">{k}: <span className="font-normal text-gray-500">{question.wrong_explanations?.[k] ?? '—'}</span></p>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────
export default function VideoLessonEditorClient({ mode, subjects, allTopics, existing }) {
  const router = useRouter()

  // Step 1 — Setup
  const [title, setTitle]           = useState(existing?.title ?? '')
  const [lessonType, setLessonType] = useState(existing?.lesson_type ?? '')
  const [examType, setExamType]     = useState(existing?.exam_type ?? 'WAEC')
  const [subjectId, setSubjectId]   = useState(existing?.subject_id ?? '')
  const [topicId, setTopicId]       = useState(existing?.topic_id ?? '')
  const [extraTags, setExtraTags]   = useState((existing?.tags ?? []).join(', '))

  // Step 2 — Generated prompt (shown for copy)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [promptCopied, setPromptCopied]       = useState(false)

  // Step 3 — Paste JSON
  const [rawJson, setRawJson]       = useState(existing ? JSON.stringify(existing, null, 2) : '')
  const [parseResult, setParseResult] = useState(null)

  // Step 4 — Video URL
  const [videoUrl, setVideoUrl]     = useState(existing?.video_url ?? '')

  // UI
  const [activeTab, setActiveTab]   = useState(mode === 'edit' ? 'paste' : 'setup')
  const [saving, setSaving]         = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  const filteredTopics = subjectId
    ? allTopics.filter(t => t.subject_id === subjectId)
    : allTopics

  // Re-validate when raw JSON changes
  const handleJsonChange = useCallback((value) => {
    setRawJson(value)
    if (value.trim().length > 50) {
      setParseResult(parseVideoLesson(value))
    } else {
      setParseResult(null)
    }
  }, [])

  // Load existing JSON on mount (edit mode)
  useEffect(() => {
    if (existing && rawJson) {
      setParseResult(parseVideoLesson(rawJson))
    }
  }, [])

  // Build the AI prompt
  const handleGeneratePrompt = () => {
    if (!title.trim() || !lessonType || !examType) {
      setSaveMessage({ type: 'error', text: 'Fill in title, lesson type, and exam type before generating' })
      return
    }
    const subjectName = subjects.find(s => s.id === subjectId)?.name ?? subjectId ?? 'the subject'
    const topicName   = allTopics.find(t => t.id === topicId)?.name ?? topicId ?? 'the topic'
    const prompt = buildVideoLessonPrompt({ subjectName, topicName, title, lessonType, examType })
    setGeneratedPrompt(prompt)
    setActiveTab('generate')
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  // Save (draft or publish)
  const handleSave = async (publish = false) => {
    if (!parseResult?.valid) {
      setSaveMessage({ type: 'error', text: 'Fix validation errors before saving' })
      return
    }
    setSaving(true)
    setSaveMessage(null)

    const lesson = parseResult.lesson
    const tagList = [
      ...(lesson.tags ?? []),
      ...extraTags.split(',').map(t => t.trim()).filter(Boolean),
    ]

    const body = {
      title:              lesson.lesson_title ?? title,
      lesson_type:        lessonType || lesson.lesson_type,
      exam_type:          examType || lesson.exam_type,
      subject_id:         subjectId || null,
      topic_id:           topicId || null,
      tags:               [...new Set(tagList)],
      video_url:          videoUrl || null,
      video_script:       lesson.video_script,
      visual_directions:  lesson.visual_directions,
      practice_questions: lesson.practice_questions,
      status:             publish ? 'published' : 'draft',
    }

    try {
      let res
      if (mode === 'edit' && existing?.id) {
        res = await fetch(`/api/admin/video-lessons/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/admin/video-lessons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const data = await res.json()
      if (data.success || data.id) {
        setSaveMessage({
          type: 'success',
          text: publish ? 'Published ✓ — students can now see this video' : 'Saved as draft ✓',
        })
        if (mode === 'new' && data.id) {
          router.push(`/admin/video-lessons/${data.id}`)
        }
      } else {
        setSaveMessage({ type: 'error', text: data.error ?? 'Save failed — try again' })
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error — try again' })
    } finally {
      setSaving(false)
    }
  }

  const isPublished = existing?.status === 'published'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin/video-lessons" className="hover:text-gray-600">Video Lessons</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">
          {mode === 'new' ? 'New Video Lesson' : existing?.title ?? 'Edit'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {mode === 'new' ? 'New Video Lesson' : 'Edit Video Lesson'}
          </h1>
          {existing && (
            <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${
              isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {isPublished ? 'Published ✅' : 'Draft'}
            </span>
          )}
        </div>

        {/* Save buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !parseResult?.valid}
            className="px-4 py-2 text-sm font-bold border border-gray-300 text-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !parseResult?.valid}
            className="px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-xl disabled:opacity-40 hover:bg-green-500 transition-colors"
          >
            {saving ? 'Publishing…' : isPublished ? 'Update & Publish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Status message */}
      {saveMessage && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          saveMessage.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Setup ── */}
      {activeTab === 'setup' && (
        <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900">Lesson Details</h2>

          {/* Lesson title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Lesson Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Solving simultaneous equations using substitution"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Lesson type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Lesson Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LESSON_TYPES.map(lt => (
                <button
                  key={lt.id}
                  onClick={() => setLessonType(lt.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    lessonType === lt.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-bold text-gray-900">{lt.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{lt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Exam type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Exam Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {['WAEC', 'JAMB', 'BOTH'].map(ex => (
                <button
                  key={ex}
                  onClick={() => setExamType(ex)}
                  className={`px-5 py-2.5 text-sm font-bold rounded-xl border-2 transition-colors ${
                    examType === ex
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <select
                value={subjectId}
                onChange={e => { setSubjectId(e.target.value); setTopicId('') }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic</label>
              <select
                value={topicId}
                onChange={e => setTopicId(e.target.value)}
                disabled={!subjectId}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
              >
                <option value="">Select topic</option>
                {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Extra tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Extra Tags
              <span className="text-gray-400 font-normal ml-1">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              value={extraTags}
              onChange={e => setExtraTags(e.target.value)}
              placeholder="e.g. velocity, motion, kinematics"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <button
            onClick={handleGeneratePrompt}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
          >
            Generate AI Prompt →
          </button>
        </div>
      )}

      {/* ── TAB 2: Generate (copy prompt) ── */}
      {activeTab === 'generate' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black text-blue-800">Copy this prompt</p>
                <p className="text-xs text-blue-600 mt-0.5">Paste into Claude or Gemini → copy the JSON response</p>
              </div>
              <button
                onClick={handleCopyPrompt}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-colors ${
                  promptCopied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                {promptCopied ? 'Copied ✓' : 'Copy Prompt'}
              </button>
            </div>

            {generatedPrompt ? (
              <pre className="text-xs text-blue-900 whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-y-auto bg-white/60 rounded-xl p-4 border border-blue-200">
                {generatedPrompt}
              </pre>
            ) : (
              <div className="text-center py-8">
                <p className="text-blue-600 text-sm">Complete the Setup tab first to generate your prompt.</p>
                <button
                  onClick={() => setActiveTab('setup')}
                  className="mt-3 text-xs text-blue-700 underline"
                >
                  ← Go to Setup
                </button>
              </div>
            )}
          </div>

          {generatedPrompt && (
            <button
              onClick={() => setActiveTab('paste')}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
            >
              I've got the JSON — go to Paste & Validate →
            </button>
          )}
        </div>
      )}

      {/* ── TAB 3: Paste & Validate ── */}
      {activeTab === 'paste' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: JSON input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste Claude/Gemini JSON here
              </label>
              <textarea
                value={rawJson}
                onChange={e => handleJsonChange(e.target.value)}
                className="w-full h-[520px] font-mono text-xs p-4 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder={`{\n  "lesson_title": "...",\n  "video_script": { ... },\n  "visual_directions": [ ... ],\n  "practice_questions": [ ... ]\n}`}
                spellCheck={false}
              />

              {/* Validation result */}
              {parseResult && (
                <div className={`mt-3 p-3 rounded-xl text-sm ${
                  parseResult.valid
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {parseResult.valid ? (
                    <div className="text-green-800">
                      <p className="font-bold">Valid ✓</p>
                      <p className="text-xs text-green-700 mt-1">
                        {parseResult.stats.total} questions ·
                        {parseResult.stats.easy} easy ·
                        {parseResult.stats.medium} medium ·
                        {parseResult.stats.hard} hard ·
                        {parseResult.stats.mixed} mixed ·
                        {parseResult.stats.visualDirections} visual directions
                      </p>
                    </div>
                  ) : (
                    <div className="text-red-800">
                      <p className="font-bold">{parseResult.errors.length} error(s)</p>
                      <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
                        {parseResult.errors.map((err, i) => (
                          <li key={i} className="text-red-700 text-xs">{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: parsed preview */}
            <div className="space-y-3">
              {parseResult?.valid && (
                <>
                  {/* Video script preview */}
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Video Script</p>
                    {['hook', 'step_by_step_explanation', 'worked_example', 'summary'].map(key => (
                      parseResult.lesson.video_script?.[key] ? (
                        <div key={key}>
                          <p className="text-xs font-bold text-gray-400 capitalize mb-0.5">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {parseResult.lesson.video_script[key].slice(0, 150)}
                            {parseResult.lesson.video_script[key].length > 150 ? '…' : ''}
                          </p>
                        </div>
                      ) : null
                    ))}
                  </div>

                  {/* Visual directions preview */}
                  {parseResult.lesson.visual_directions?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                      <p className="text-xs font-black text-amber-700 uppercase tracking-wide mb-2">
                        Visual Directions ({parseResult.lesson.visual_directions.length})
                      </p>
                      <ol className="space-y-1.5">
                        {parseResult.lesson.visual_directions.map((dir, i) => (
                          <li key={i} className="text-xs text-amber-800 flex gap-2">
                            <span className="font-bold flex-shrink-0">{i + 1}.</span>
                            <span>{dir}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              )}

              {!parseResult?.valid && (
                <div className="flex items-center justify-center h-48 bg-gray-50 rounded-2xl text-gray-400 text-sm">
                  Paste valid JSON to see preview
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Video URL ── */}
      {activeTab === 'video' && (
        <div className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
          <div>
            <h2 className="font-bold text-gray-900 mb-1">Video URL</h2>
            <p className="text-sm text-gray-500">
              Paste a YouTube URL or a direct video file URL. The video doesn't need to be added before publishing — you can update it later.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://storage.example.com/video.mp4"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {videoUrl && isYouTubeUrl(videoUrl) && !getYouTubeId(videoUrl) && (
              <p className="text-xs text-red-500 mt-1">Could not extract YouTube video ID — check the URL</p>
            )}
          </div>

          {videoUrl && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Preview</p>
              <VideoPlayer url={videoUrl} />
            </div>
          )}

          {!videoUrl && (
            <div className="bg-gray-50 rounded-2xl p-6 text-center text-gray-400">
              <p className="text-2xl mb-2">🎬</p>
              <p className="text-sm">No video URL yet</p>
              <p className="text-xs mt-1">You can publish without a video and add it later</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: Preview & Publish ── */}
      {activeTab === 'preview' && (
        <div className="space-y-5">
          {!parseResult?.valid ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
              <p className="font-bold text-yellow-800">No valid lesson content yet</p>
              <p className="text-sm text-yellow-700 mt-1">Go to the Paste & Validate tab first.</p>
              <button
                onClick={() => setActiveTab('paste')}
                className="mt-3 text-sm text-yellow-800 underline"
              >
                ← Go to Paste & Validate
              </button>
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <h2 className="font-bold text-gray-900">{parseResult.lesson.lesson_title}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                    {parseResult.lesson.exam_type ?? examType}
                  </span>
                  <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {LESSON_TYPES.find(l => l.id === lessonType)?.label ?? lessonType}
                  </span>
                  {videoUrl
                    ? <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full">Video ✓</span>
                    : <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">No video yet</span>
                  }
                  <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {parseResult.stats.total} practice questions
                  </span>
                </div>
              </div>

              {/* Video preview */}
              {videoUrl && (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">Video</p>
                  <VideoPlayer url={videoUrl} />
                </div>
              )}

              {/* Questions preview */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Practice Questions ({parseResult.stats.total})
                </p>
                <div className="space-y-3">
                  {parseResult.lesson.practice_questions.map((q, i) => (
                    <QuestionPreview key={i} question={q} index={i} />
                  ))}
                </div>
              </div>

              {/* Publish CTA */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-center space-y-3">
                <p className="font-bold text-indigo-900">Ready to publish?</p>
                <p className="text-sm text-indigo-700">
                  Students will see this video lesson in the Videos section.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="px-5 py-2.5 text-sm font-bold border border-indigo-300 text-indigo-700 rounded-xl hover:bg-white transition-colors disabled:opacity-40"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="px-5 py-2.5 text-sm font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-40"
                  >
                    {saving ? 'Publishing…' : isPublished ? 'Update & Publish ✓' : 'Publish →'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}