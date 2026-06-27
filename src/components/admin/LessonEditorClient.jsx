'use client'
// src/components/admin/LessonEditorClient.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIX: buildLessonPrompt: subjectName is required
//
// Root cause: buildLessonPrompt() was called at the TOP LEVEL of the component
// body (line 448 in the original), running synchronously on every render.
// SubtopicEditorTabs loads this component via next/dynamic with ssr:false, so
// on the first client-side render the subject/topic/subtopic props can arrive
// as undefined before hydration completes — causing the guard in
// buildLessonPrompt to throw immediately.
//
// Fix: wrap buildLessonPrompt in useMemo with an explicit null-guard so it
// only runs (and only throws) when all three props are fully resolved.
// The rest of the component renders a loading state until data is ready.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { parseLesson, buildLessonPrompt } from '@/lib/lessonParser'
import SlideRenderer from '@/components/lesson/SlideRenderer'
import { AdminImageSlot } from '@/components/lesson/ImageSlot'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

const SLIDE_DEFAULTS = {
  hook: { type: 'hook', body: '' },
  definition: { type: 'definition', term: '', definition: '', examples: [''] },
  real_life: { type: 'real_life', body: '' },
  concept: {
    type: 'concept',
    heading: '',
    body: '',
    examples: ['', ''],
    image: { needed: true, intent_type: 'concept_visual', learning_objective: '', prompt: '', filename: '', url: '' },
  },
  formula: {
    type: 'formula',
    label: '',
    formula: '',
    plain_english: '',
    variables: [{ symbol: '', meaning: '' }],
    image: { needed: true, intent_type: 'formula_diagram', learning_objective: '', prompt: '', filename: '', url: '' },
  },
  interaction: {
    type: 'interaction',
    question: '',
    options: [
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' },
    ],
    correct: 'A',
    feedback_correct: '',
    feedback_wrong: '',
  },
  worked_example: {
    type: 'worked_example',
    mode: 'guided',
    problem: '',
    image_prompt: '',
    steps: [{ instruction: '', micro_question: '', micro_answer: '' }],
    final_answer: '',
  },
  summary: { type: 'summary', points: [''], closing: '' },
}

const SLIDE_TYPE_LABELS = {
  hook: 'Hook',
  definition: 'Definition',
  real_life: 'Real-life Connection',
  concept: 'Concept',
  formula: 'Formula',
  interaction: 'Interaction',
  worked_example: 'Worked Example',
  end_quiz: 'End Quiz',
  summary: 'Summary',
}

// ── Copy prompt box ───────────────────────────────────────────────────────────
function CopyBox({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="border border-indigo-200 dark:border-indigo-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800">
        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
          AI Lesson Prompt
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
            copied
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
              : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-500 dark:hover:bg-indigo-400'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy prompt'}
        </button>
      </div>
      <pre className="text-xs text-secondary p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto bg-card">
        {text}
      </pre>
    </div>
  )
}

// ── Single slide editor ───────────────────────────────────────────────────────
function SlideEditor({ slide, index, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(index === 0)

  const update = (field, value) => {
    onUpdate(index, { ...slide, [field]: value })
  }

  return (
    <div className="border border-default rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-subtle hover:bg-subtle transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-tertiary">{index + 1}</span>
          <span className="text-xs font-black uppercase tracking-wide text-secondary">
            {SLIDE_TYPE_LABELS[slide.type] ?? slide.type}
          </span>
          {slide.heading && (
            <span className="text-xs text-tertiary truncate max-w-48">— {slide.heading}</span>
          )}
          {slide.term && (
            <span className="text-xs text-tertiary truncate max-w-48">— {slide.term}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(index) }}
            className="text-xs text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 px-2 py-0.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            Remove
          </button>
          <span className="text-tertiary text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-3 bg-card">
          {/* HOOK */}
          {slide.type === 'hook' && (
            <textarea
              value={slide.body}
              onChange={(e) => update('body', e.target.value)}
              placeholder="Hook body — 2–3 sentences connecting to Nigerian student life"
              rows={3}
              className="w-full px-3 py-2.5 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          )}

          {/* DEFINITION */}
          {slide.type === 'definition' && (
            <>
              <input
                value={slide.term ?? ''}
                onChange={(e) => update('term', e.target.value)}
                placeholder="Term"
                className="w-full px-3 py-2 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <textarea
                value={slide.definition ?? ''}
                onChange={(e) => update('definition', e.target.value)}
                placeholder="Definition — one conversational sentence"
                rows={2}
                className="w-full px-3 py-2.5 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-tertiary">Examples</p>
                {(slide.examples ?? ['']).map((ex, ei) => (
                  <div key={ei} className="flex gap-2">
                    <input
                      value={ex}
                      onChange={(e) => {
                        const next = [...(slide.examples ?? [])]
                        next[ei] = e.target.value
                        update('examples', next)
                      }}
                      placeholder={`Example ${ei + 1}`}
                      className="flex-1 px-3 py-2 border border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => update('examples', (slide.examples ?? []).filter((_, i) => i !== ei))}
                      className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs px-2"
                    >✕</button>
                  </div>
                ))}
                <button
                  onClick={() => update('examples', [...(slide.examples ?? []), ''])}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >+ Add example</button>
              </div>
            </>
          )}

          {/* CONCEPT */}
          {slide.type === 'concept' && (
            <>
              <input
                value={slide.heading ?? ''}
                onChange={(e) => update('heading', e.target.value)}
                placeholder="Heading"
                className="w-full px-3 py-2 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <textarea
                value={slide.body ?? ''}
                onChange={(e) => update('body', e.target.value)}
                placeholder="Body — one idea, max 20 words"
                rows={2}
                className="w-full px-3 py-2.5 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-tertiary">Examples</p>
                {(slide.examples ?? ['']).map((ex, ei) => (
                  <div key={ei} className="flex gap-2">
                    <input
                      value={ex}
                      onChange={(e) => {
                        const next = [...(slide.examples ?? [])]
                        next[ei] = e.target.value
                        update('examples', next)
                      }}
                      placeholder={`Example ${ei + 1}`}
                      className="flex-1 px-3 py-2 border border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => update('examples', (slide.examples ?? []).filter((_, i) => i !== ei))}
                      className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs px-2"
                    >✕</button>
                  </div>
                ))}
                <button
                  onClick={() => update('examples', [...(slide.examples ?? []), ''])}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >+ Add example</button>
              </div>
              {slide.image && (
                <AdminImageSlot
                  image={slide.image}
                  onUpdate={(imgObj) => update('image', { ...(slide.image ?? {}), ...imgObj })}
                />
              )}
            </>
          )}

          {/* FORMULA */}
          {slide.type === 'formula' && (
            <>
              <input
                value={slide.label ?? ''}
                onChange={(e) => update('label', e.target.value)}
                placeholder="Label (e.g. Speed Formula)"
                className="w-full px-3 py-2 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                value={slide.formula ?? ''}
                onChange={(e) => update('formula', e.target.value)}
                placeholder="Formula (e.g. Speed = Distance ÷ Time)"
                className="w-full px-3 py-2 border border-default rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <textarea
                value={slide.plain_english ?? ''}
                onChange={(e) => update('plain_english', e.target.value)}
                placeholder="Plain English explanation"
                rows={2}
                className="w-full px-3 py-2.5 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-tertiary">Variables</p>
                {(slide.variables ?? []).map((v, vi) => (
                  <div key={vi} className="flex gap-2">
                    <input
                      value={v.symbol ?? ''}
                      onChange={(e) => {
                        const next = [...(slide.variables ?? [])]
                        next[vi] = { ...next[vi], symbol: e.target.value }
                        update('variables', next)
                      }}
                      placeholder="Symbol"
                      className="w-16 px-2 py-2 border border-default rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      value={v.meaning ?? ''}
                      onChange={(e) => {
                        const next = [...(slide.variables ?? [])]
                        next[vi] = { ...next[vi], meaning: e.target.value }
                        update('variables', next)
                      }}
                      placeholder="Meaning"
                      className="flex-1 px-3 py-2 border border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => update('variables', (slide.variables ?? []).filter((_, i) => i !== vi))}
                      className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs px-2"
                    >✕</button>
                  </div>
                ))}
                <button
                  onClick={() => update('variables', [...(slide.variables ?? []), { symbol: '', meaning: '' }])}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >+ Add variable</button>
              </div>
            </>
          )}

          {/* INTERACTION */}
          {slide.type === 'interaction' && (
            <>
              <textarea
                value={slide.question ?? ''}
                onChange={(e) => update('question', e.target.value)}
                placeholder="Question"
                rows={2}
                className="w-full px-3 py-2.5 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <div className="space-y-2">
                {(slide.options ?? []).map((opt, oi) => (
                  <div key={oi} className="flex gap-2 items-center">
                    <span className="text-xs font-black text-tertiary w-4">{opt.key}</span>
                    <input
                      value={opt.text ?? ''}
                      onChange={(e) => {
                        const next = [...(slide.options ?? [])]
                        next[oi] = { ...next[oi], text: e.target.value }
                        update('options', next)
                      }}
                      placeholder={`Option ${opt.key}`}
                      className="flex-1 px-3 py-2 border border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => update('correct', opt.key)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                        slide.correct === opt.key
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                          : 'bg-subtle text-tertiary hover:bg-active'
                      }`}
                    >
                      {slide.correct === opt.key ? '✓ Correct' : 'Set correct'}
                    </button>
                  </div>
                ))}
              </div>
              <input
                value={slide.feedback_correct ?? ''}
                onChange={(e) => update('feedback_correct', e.target.value)}
                placeholder="Feedback — correct"
                className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600"
              />
              <input
                value={slide.feedback_wrong ?? ''}
                onChange={(e) => update('feedback_wrong', e.target.value)}
                placeholder="Feedback — wrong (start with 'Almost. Remember: ...')"
                className="w-full px-3 py-2 border border-red-200 dark:border-red-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600"
              />
            </>
          )}

          {/* WORKED EXAMPLE */}
          {slide.type === 'worked_example' && (
            <>
              <div className="flex gap-2 mb-1">
                {['guided', 'student_attempt'].map(m => (
                  <button
                    key={m}
                    onClick={() => update('mode', m)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      slide.mode === m
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                        : 'bg-subtle text-tertiary hover:bg-active'
                    }`}
                  >
                    {m === 'guided' ? 'Guided' : 'Student Attempt'}
                  </button>
                ))}
              </div>
              <textarea
                value={slide.problem ?? ''}
                onChange={(e) => update('problem', e.target.value)}
                placeholder="Problem statement"
                rows={2}
                className="w-full px-3 py-2.5 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-tertiary">Steps</p>
                {(slide.steps ?? []).map((step, si) => (
                  <div key={si} className="flex gap-2">
                    <span className="text-xs text-tertiary mt-2.5 flex-shrink-0">{si + 1}.</span>
                    <input
                      value={step.instruction ?? ''}
                      onChange={(e) => {
                        const next = [...(slide.steps ?? [])]
                        next[si] = { ...next[si], instruction: e.target.value }
                        update('steps', next)
                      }}
                      placeholder={`Step ${si + 1}`}
                      className="flex-1 px-3 py-2 border border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => update('steps', (slide.steps ?? []).filter((_, i) => i !== si))}
                      className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs px-2"
                    >✕</button>
                  </div>
                ))}
                <button
                  onClick={() => update('steps', [
                    ...(slide.steps ?? []),
                    { instruction: '', micro_question: '', micro_answer: '' },
                  ])}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >+ Add step</button>
              </div>
              <input
                value={slide.final_answer ?? ''}
                onChange={(e) => update('final_answer', e.target.value)}
                placeholder="Final answer"
                className="w-full px-3 py-2.5 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </>
          )}

          {/* SUMMARY */}
          {slide.type === 'summary' && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-bold text-tertiary">Key points</p>
                {(slide.points ?? []).map((pt, pi) => (
                  <div key={pi} className="flex gap-2">
                    <input
                      value={pt}
                      onChange={(e) => {
                        const next = [...(slide.points ?? [])]
                        next[pi] = e.target.value
                        update('points', next)
                      }}
                      placeholder={`Point ${pi + 1}`}
                      className="flex-1 px-3 py-2 border border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => update('points', (slide.points ?? []).filter((_, i) => i !== pi))}
                      className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs px-2"
                    >✕</button>
                  </div>
                ))}
                <button
                  onClick={() => update('points', [...(slide.points ?? []), ''])}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >+ Add point</button>
              </div>
              <input
                value={slide.closing ?? ''}
                onChange={(e) => update('closing', e.target.value)}
                placeholder="Closing encouragement line"
                className="w-full px-3 py-2.5 border border-default rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LessonEditorClient({ subject, topic, subtopic }) {
  const router = useRouter()

  // ── FIX: guard against undefined props before calling buildLessonPrompt ───
  // SubtopicEditorTabs loads this component via next/dynamic({ ssr: false }),
  // meaning on the very first client render the props may not yet be resolved.
  // Moving buildLessonPrompt into useMemo with a null-guard means it only runs
  // once all three values are available — never on a partial/undefined render.
  const prompt = useMemo(() => {
    if (!subject?.name || !topic?.name || !subtopic?.name) return null
    try {
      return buildLessonPrompt({
        subjectName:  subject.name,
        topicName:    topic.name,
        subtopicName: subtopic.name,
        objectives:   subtopic.objectives ?? [],
        examTag:      subtopic.exam_type ?? subject.exam_type ?? 'BOTH',
      })
    } catch (err) {
      console.error('[LessonEditorClient] buildLessonPrompt failed:', err.message)
      return null
    }
  }, [subject?.name, topic?.name, subtopic?.name, subtopic?.objectives, subtopic?.exam_type, subject?.exam_type])

  const isDark = useIsDark()
  const color = subject?.name ? resolveSubjectColors(subject.name, isDark) : resolveSubjectColors('default', isDark)

  const [mode, setMode]               = useState('prompt')
  const [rawJson, setRawJson]         = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [slides, setSlides]           = useState([])
  const [lessonTitle, setLessonTitle] = useState(subtopic?.name ?? '')
  const [saving, setSaving]           = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  // Initialise from existing lesson content
  useEffect(() => {
    if (subtopic?.lesson_content) {
      try {
        const existing = typeof subtopic.lesson_content === 'string'
          ? JSON.parse(subtopic.lesson_content)
          : subtopic.lesson_content
        if (existing?.slides) {
          setSlides(existing.slides)
          setLessonTitle(existing.title ?? subtopic.name ?? '')
          setMode('preview')
        }
      } catch { /* ignore parse errors on existing content */ }
    }
  }, [subtopic?.id])

  // Auto-switch to preview when JSON parses successfully
  useEffect(() => {
    if (parseResult?.valid && parseResult.lesson?.slides) {
      setSlides(parseResult.lesson.slides)
      setLessonTitle(parseResult.lesson.title ?? subtopic?.name ?? '')
      setMode('preview')
    }
  }, [parseResult])

  const handleJsonChange = useCallback((value) => {
    setRawJson(value)
    if (value.trim().length > 20) {
      setParseResult(parseLesson(value))
    } else {
      setParseResult(null)
    }
  }, [])

  const handleSlideUpdate = useCallback((index, updatedSlide) => {
    setSlides(prev => prev.map((s, i) => i === index ? updatedSlide : s))
  }, [])

  const handleSlideDelete = useCallback((index) => {
    setSlides(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleAddSlide = (type) => {
    setSlides(prev => [...prev, { ...SLIDE_DEFAULTS[type] }])
  }

  const handleImageUpdate = useCallback((slideIndex, imgObj) => {
    setSlides(prev => prev.map((s, i) => {
      if (i !== slideIndex) return s
      if (typeof imgObj === 'string') {
        return { ...s, image: { ...(s.image ?? {}), url: imgObj } }
      }
      return { ...s, image: { ...(s.image ?? {}), ...imgObj } }
    }))
  }, [])

  // ── Save ────────────────────────────────────────────────────────────────────
  const buildLesson = () => ({
    title:    lessonTitle || subtopic?.name || '',
    exam_tag: subtopic?.exam_type ?? subject?.exam_type ?? 'BOTH',
    slides,
  })

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const lesson = buildLesson()
      const res = await fetch(`/api/admin/lessons/${subtopic.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_content: JSON.stringify(lesson) }),
      })
      const data = await res.json()
      if (!data.valid && data.errors) {
        setSaveMessage({ type: 'error', text: `${data.errors.length} error(s) — check the lesson structure` })
        setSaving(false)
        return
      }
      await fetch(`/api/admin/lessons/${subtopic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      })
      setSaveMessage({ type: 'success', text: 'Lesson saved and published ✓' })
      setSaving(false)
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error — try again' })
      setSaving(false)
    }
  }

  // ── Guard: show spinner while props resolve ───────────────────────────────
  if (!subject?.name || !topic?.name || !subtopic?.name) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Subject/topic header */}
      <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: color.bg }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70" style={{ color: color.text }}>
            {subject.name} · {topic.name}
          </p>
          <p className="text-base font-black" style={{ color: color.text }}>{subtopic.name}</p>
        </div>
        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
          subtopic.exam_type === 'WAEC'
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            : subtopic.exam_type === 'JAMB'
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
            : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
        }`}>
          {subtopic.exam_type ?? 'BOTH'}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-subtle p-1 rounded-xl">
        {[
          { id: 'prompt',  label: '1. Generate' },
          { id: 'paste',   label: '2. Paste JSON' },
          { id: 'preview', label: '3. Preview & Save' },
          { id: 'edit',    label: '4. Edit slides' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
              mode === tab.id
                ? 'bg-card text-primary shadow-sm'
                : 'text-tertiary hover:text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── GENERATE PROMPT TAB ── */}
      {mode === 'prompt' && (
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Copy this prompt and paste it into Claude or Gemini. Then paste the JSON output back in the <strong>Paste JSON</strong> tab.
          </p>
          {prompt
            ? <CopyBox text={prompt} />
            : (
              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                Prompt unavailable — subject or topic data is missing for this subtopic.
              </div>
            )
          }
          <button
            onClick={() => setMode('paste')}
            className="w-full py-3 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-black rounded-xl hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors"
          >
            I've generated the lesson → Paste JSON
          </button>
        </div>
      )}

      {/* ── PASTE JSON TAB ── */}
      {mode === 'paste' && (
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Paste the full JSON output from the AI below. The lesson preview will appear automatically.
          </p>
          <textarea
            value={rawJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="w-full h-72 font-mono text-xs p-4 border border-default rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={'Paste Claude/Gemini JSON output here…\n\n{\n  "title": "...",\n  "slides": [...]\n}'}
            spellCheck={false}
          />
          {parseResult && (
            <div className={`p-3 rounded-xl text-sm ${
              parseResult.valid
                ? 'bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800'
            }`}>
              {parseResult.valid ? (
                <div className="text-green-800 dark:text-green-300">
                  <p className="font-bold">✓ Valid — switching to preview…</p>
                  <p className="text-xs mt-0.5 text-green-600 dark:text-green-400">
                    {parseResult.stats.totalSlides} slides ·{' '}
                    {parseResult.stats.interactions} interactions ·{' '}
                    {parseResult.stats.workedExamples} worked examples ·{' '}
                    {parseResult.stats.imageSlots} image slots
                  </p>
                </div>
              ) : (
                <div className="text-red-800 dark:text-red-300">
                  <p className="font-bold">⚠ JSON has errors — fix and re-paste</p>
                  <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-700 dark:text-red-400">· {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW & SAVE TAB ── */}
      {mode === 'preview' && (
        <div className="space-y-4">
          {slides.length === 0 ? (
            <div className="text-center py-16 bg-subtle rounded-2xl">
              <p className="text-tertiary text-sm font-medium mb-1">No lesson to preview yet</p>
              <p className="text-xs text-tertiary mb-4">
                Paste your JSON in the "Paste JSON" tab first.
              </p>
              <button
                onClick={() => setMode('paste')}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors"
              >
                Go to Paste JSON →
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-3 sticky top-0 bg-card/95 backdrop-blur-sm py-3 z-10 -mx-1 px-1">
                <button
                  onClick={() => setMode('edit')}
                  className="flex-1 py-3 border border-default text-secondary text-sm font-bold rounded-xl hover:bg-subtle transition-colors"
                >
                  Edit slides
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-green-600 dark:bg-green-500 text-white text-sm font-black rounded-xl hover:bg-green-500 dark:hover:bg-green-400 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : '✓ Save Lesson — Go Live'}
                </button>
              </div>

              <p className="text-xs text-tertiary text-center">
                {slides.length} slides · Saving makes this lesson immediately live for students
              </p>

              {saveMessage && (
                <div className={`p-3 rounded-xl text-sm font-medium ${
                  saveMessage.type === 'error'
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                }`}>
                  {saveMessage.text}
                </div>
              )}

              <div className="bg-card rounded-2xl border border-default overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ background: color.bg, borderColor: color.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-black" style={{ color: color.text }}>{lessonTitle}</p>
                    <span className="text-xs opacity-70" style={{ color: color.text }}>{slides.length} slides</span>
                  </div>
                  <div className="h-2 bg-white/40 rounded-full">
                    <div className="h-full rounded-full w-1/4" style={{ background: color.solid }} />
                  </div>
                </div>
                <div className="divide-y divide-default">
                  {slides.map((slide, i) => (
                    <div key={i} className="px-4 py-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-black text-tertiary">{i + 1}</span>
                        <span className="text-xs font-black uppercase tracking-wide text-tertiary">
                          {SLIDE_TYPE_LABELS[slide.type] ?? slide.type}
                        </span>
                      </div>
                      <SlideRenderer slide={slide} onImageUpdate={(img) => handleImageUpdate(i, img)} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── EDIT SLIDES TAB ── */}
      {mode === 'edit' && (
        <div className="space-y-3">
          {slides.length === 0 ? (
            <p className="text-sm text-tertiary text-center py-8">No slides yet — paste JSON first or add slides manually.</p>
          ) : (
            slides.map((slide, i) => (
              <SlideEditor
                key={i}
                slide={slide}
                index={i}
                onUpdate={handleSlideUpdate}
                onDelete={handleSlideDelete}
              />
            ))
          )}

          {/* Add slide */}
          <div className="border-2 border-dashed border-default rounded-2xl p-4">
            <p className="text-xs font-bold text-tertiary mb-2">Add slide</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(SLIDE_DEFAULTS).map(type => (
                <button
                  key={type}
                  onClick={() => handleAddSlide(type)}
                  className="text-xs px-3 py-1.5 bg-subtle text-secondary rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  + {SLIDE_TYPE_LABELS[type] ?? type}
                </button>
              ))}
            </div>
          </div>

          {slides.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 bg-green-600 dark:bg-green-500 text-white text-sm font-black rounded-2xl hover:bg-green-500 dark:hover:bg-green-400 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : '✓ Save Lesson — Go Live'}
            </button>
          )}

          {saveMessage && (
            <div className={`p-3 rounded-xl text-sm font-medium ${
              saveMessage.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
            }`}>
              {saveMessage.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}