'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { parseLesson, buildLessonPrompt } from '@/lib/lessonParser'
import SlideRenderer from '@/components/lesson/SlideRenderer'
import { AdminImageSlot } from '@/components/lesson/ImageSlot'
import { getSubjectColor } from '@/lib/theme'

// ─────────────────────────────────────────────────────────────────────────────
// LessonEditorClient.jsx
// Admin lesson editor — updated for the slide-based lesson schema.
// Workflow: Generate prompt → Copy → Paste into AI → Paste JSON back → Preview → Save
// ─────────────────────────────────────────────────────────────────────────────

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
  summary: 'Summary',
}

// ── Copy prompt box ───────────────────────────────────────────────────────────
function CopyBox({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="border border-indigo-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
          AI Lesson Prompt
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
            copied ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy Prompt'}
        </button>
      </div>
      <pre className="text-xs text-gray-700 p-4 bg-white overflow-auto max-h-48 whitespace-pre-wrap font-mono leading-relaxed">
        {text}
      </pre>
    </div>
  )
}

// ── Per-slide editor ──────────────────────────────────────────────────────────
function SlideEditor({ slide, index, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast, subtopicId }) {
  const update = (field, value) => onChange(index, { ...slide, [field]: value })
  const [open, setOpen] = useState(false)

  const typeLabel = SLIDE_TYPE_LABELS[slide.type] ?? slide.type
  const typeColor = {
    hook: 'bg-amber-100 text-amber-700',
    definition: 'bg-blue-100 text-blue-700',
    real_life: 'bg-green-100 text-green-700',
    concept: 'bg-purple-100 text-purple-700',
    formula: 'bg-gray-800 text-white',
    interaction: 'bg-indigo-100 text-indigo-700',
    worked_example: 'bg-gray-100 text-gray-700',
    summary: 'bg-emerald-100 text-emerald-700',
  }[slide.type] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-gray-300 text-sm select-none cursor-grab active:cursor-grabbing">⠿</span>
        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${typeColor}`}>
          {typeLabel}
        </span>
        {/* Preview text */}
        <span className="text-xs text-gray-400 truncate flex-1">
          {slide.body?.slice(0, 60) ||
            slide.heading?.slice(0, 60) ||
            slide.term ||
            slide.problem?.slice(0, 60) ||
            slide.question?.slice(0, 60) ||
            '…'}
        </span>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(index) }}
            disabled={isFirst}
            className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs"
          >
            ↑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(index) }}
            disabled={isLast}
            className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs"
          >
            ↓
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(index) }}
            className="p-1 text-red-300 hover:text-red-500 text-xs"
          >
            ✕
          </button>
          <span className="text-gray-300 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Editor fields — collapsed by default */}
      {open && (
        <div className="p-4 space-y-3">
          {/* HOOK */}
          {slide.type === 'hook' && (
            <textarea
              value={slide.body}
              onChange={(e) => update('body', e.target.value)}
              rows={3}
              placeholder="Opening hook — real-life curiosity, 2–3 lines"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          )}

          {/* REAL LIFE */}
          {slide.type === 'real_life' && (
            <textarea
              value={slide.body}
              onChange={(e) => update('body', e.target.value)}
              rows={4}
              placeholder="Real-life scenario — 3–4 lines, Nigerian student context"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          )}

          {/* DEFINITION */}
          {slide.type === 'definition' && (
            <>
              <input
                value={slide.term}
                onChange={(e) => update('term', e.target.value)}
                placeholder="Term (e.g. Speed)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <textarea
                value={slide.definition}
                onChange={(e) => update('definition', e.target.value)}
                rows={2}
                placeholder="Definition — one conversational sentence"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500">Examples</p>
                {(slide.examples ?? []).map((ex, ei) => (
                  <div key={ei} className="flex gap-2">
                    <input
                      value={ex}
                      onChange={(e) => {
                        const next = [...(slide.examples ?? [])]
                        next[ei] = e.target.value
                        update('examples', next)
                      }}
                      placeholder={`Example ${ei + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => update('examples', (slide.examples ?? []).filter((_, i) => i !== ei))}
                      className="text-red-400 hover:text-red-600 text-xs px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => update('examples', [...(slide.examples ?? []), ''])}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  + Add example
                </button>
              </div>
            </>
          )}

          {/* CONCEPT */}
          {slide.type === 'concept' && (
            <>
              <input
                value={slide.heading}
                onChange={(e) => update('heading', e.target.value)}
                placeholder="Heading (e.g. What is velocity?)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <textarea
                value={slide.body}
                onChange={(e) => update('body', e.target.value)}
                rows={4}
                placeholder="Concept body — one idea, short sentences"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <input
                value={slide.image_prompt ?? ''}
                onChange={(e) => update('image_prompt', e.target.value)}
                placeholder="Image prompt (describe the ideal image)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-500 italic"
              />
            </>
          )}

          {/* FORMULA */}
          {slide.type === 'formula' && (
            <>
              <input
                value={slide.label}
                onChange={(e) => update('label', e.target.value)}
                placeholder="Label (e.g. Speed Formula)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                value={slide.formula}
                onChange={(e) => update('formula', e.target.value)}
                placeholder="Formula (e.g. Speed = Distance ÷ Time)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <textarea
                value={slide.plain_english ?? ''}
                onChange={(e) => update('plain_english', e.target.value)}
                rows={2}
                placeholder="Plain English — what this formula means in everyday language"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500">Variables</p>
                {(slide.variables ?? []).map((v, vi) => (
                  <div key={vi} className="flex gap-2">
                    <input
                      value={v.symbol}
                      onChange={(e) => {
                        const next = [...(slide.variables ?? [])]
                        next[vi] = { ...next[vi], symbol: e.target.value }
                        update('variables', next)
                      }}
                      placeholder="Symbol"
                      className="w-16 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      value={v.meaning}
                      onChange={(e) => {
                        const next = [...(slide.variables ?? [])]
                        next[vi] = { ...next[vi], meaning: e.target.value }
                        update('variables', next)
                      }}
                      placeholder="Meaning"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() =>
                        update('variables', (slide.variables ?? []).filter((_, i) => i !== vi))
                      }
                      className="text-red-400 hover:text-red-600 text-xs px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    update('variables', [...(slide.variables ?? []), { symbol: '', meaning: '' }])
                  }
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  + Add variable
                </button>
              </div>
              <input
                value={slide.image_prompt ?? ''}
                onChange={(e) => update('image_prompt', e.target.value)}
                placeholder="Image prompt"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-500 italic"
              />
            </>
          )}

          {/* INTERACTION */}
          {slide.type === 'interaction' && (
            <>
              <textarea
                value={slide.question}
                onChange={(e) => update('question', e.target.value)}
                rows={2}
                placeholder="Question"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500">Options</p>
                {(slide.options ?? []).map((opt, oi) => {
                  const key = typeof opt === 'string' ? opt.split('.')[0]?.trim() : opt.key
                  const text = typeof opt === 'string' ? opt.split('.').slice(1).join('.').trim() : opt.text
                  return (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-500 w-5">{key}.</span>
                      <input
                        value={text}
                        onChange={(e) => {
                          const next = [...(slide.options ?? [])]
                          next[oi] = { key, text: e.target.value }
                          update('options', next)
                        }}
                        placeholder={`Option ${key}`}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500">Correct:</label>
                <select
                  value={slide.correct}
                  onChange={(e) => update('correct', e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {(slide.options ?? []).map((opt) => {
                    const k = typeof opt === 'string' ? opt.split('.')[0]?.trim() : opt.key
                    return <option key={k} value={k}>{k}</option>
                  })}
                </select>
              </div>
              <textarea
                value={slide.feedback_correct ?? ''}
                onChange={(e) => update('feedback_correct', e.target.value)}
                rows={2}
                placeholder="Feedback if correct — warm celebration"
                className="w-full px-3 py-2.5 border border-green-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none bg-green-50/50"
              />
              <textarea
                value={slide.feedback_wrong ?? ''}
                onChange={(e) => update('feedback_wrong', e.target.value)}
                rows={2}
                placeholder="Feedback if wrong — supportive correction, never just 'Incorrect'"
                className="w-full px-3 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none bg-orange-50/50"
              />
            </>
          )}

          {/* WORKED EXAMPLE */}
          {slide.type === 'worked_example' && (
            <>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-gray-500">Mode:</label>
                <select
                  value={slide.mode}
                  onChange={(e) => update('mode', e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="guided">Guided</option>
                  <option value="student_attempt">Student Attempt</option>
                </select>
                {slide.mode === 'student_attempt' && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-500">Delay:</label>
                    <input
                      type="number"
                      value={slide.reveal_delay_seconds ?? 8}
                      onChange={(e) => update('reveal_delay_seconds', parseInt(e.target.value))}
                      className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-xs text-gray-400">sec</span>
                  </div>
                )}
              </div>
              <textarea
                value={slide.problem}
                onChange={(e) => update('problem', e.target.value)}
                rows={2}
                placeholder="Problem statement"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500">Steps</p>
                {(slide.steps ?? []).map((s, si) => (
                  <div key={si} className="space-y-1.5 p-3 bg-gray-50 rounded-xl">
                    <div className="flex gap-2">
                      <span className="text-xs font-black text-gray-400 mt-2.5 flex-shrink-0">
                        {si + 1}.
                      </span>
                      <textarea
                        value={s.instruction}
                        onChange={(e) => {
                          const next = [...(slide.steps ?? [])]
                          next[si] = { ...next[si], instruction: e.target.value }
                          update('steps', next)
                        }}
                        rows={2}
                        placeholder="Step instruction"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                      />
                      <button
                        onClick={() =>
                          update('steps', (slide.steps ?? []).filter((_, i) => i !== si))
                        }
                        className="text-red-400 hover:text-red-600 text-xs self-start mt-1 px-2"
                      >
                        ✕
                      </button>
                    </div>
                    {slide.mode === 'guided' && (
                      <div className="flex gap-2 pl-5">
                        <input
                          value={s.micro_question ?? ''}
                          onChange={(e) => {
                            const next = [...(slide.steps ?? [])]
                            next[si] = { ...next[si], micro_question: e.target.value }
                            update('steps', next)
                          }}
                          placeholder="Micro-question (optional)"
                          className="flex-1 px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/50"
                        />
                        <input
                          value={s.micro_answer ?? ''}
                          onChange={(e) => {
                            const next = [...(slide.steps ?? [])]
                            next[si] = { ...next[si], micro_answer: e.target.value }
                            update('steps', next)
                          }}
                          placeholder="Answer"
                          className="w-28 px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/50"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() =>
                    update('steps', [
                      ...(slide.steps ?? []),
                      { instruction: '', micro_question: '', micro_answer: '' },
                    ])
                  }
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  + Add step
                </button>
              </div>
              <input
                value={slide.final_answer}
                onChange={(e) => update('final_answer', e.target.value)}
                placeholder="Final answer"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </>
          )}

          {/* SUMMARY */}
          {slide.type === 'summary' && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500">Key points</p>
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
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() =>
                        update('points', (slide.points ?? []).filter((_, i) => i !== pi))
                      }
                      className="text-red-400 hover:text-red-600 text-xs px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => update('points', [...(slide.points ?? []), ''])}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  + Add point
                </button>
              </div>
              <input
                value={slide.closing ?? ''}
                onChange={(e) => update('closing', e.target.value)}
                placeholder="Closing encouragement line"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
  const color = getSubjectColor(subject.name)
  const prompt = buildLessonPrompt({
    subjectName: subject.name,
    topicName: topic.name,
    subtopicName: subtopic.name,
    objectives: subtopic.objectives ?? [],
    examTag: subtopic.exam_type,
  })

  const hasExistingLesson = !!subtopic.lesson_content?.slides?.length

  const [mode, setMode] = useState(hasExistingLesson ? 'preview' : 'prompt')
  const [rawJson, setRawJson] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [slides, setSlides] = useState(subtopic.lesson_content?.slides ?? [])
  const [lessonTitle, setLessonTitle] = useState(subtopic.lesson_content?.title ?? subtopic.name)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const dragOver = useRef(null)

  // ── Auto-parse on paste ─────────────────────────────────────────────────────
  useEffect(() => {
    if (rawJson.trim().length < 20) {
      setParseResult(null)
      return
    }
    const result = parseLesson(rawJson)
    setParseResult(result)
    if (result.valid && result.lesson) {
      setSlides(result.lesson.slides)
      if (result.lesson.title) setLessonTitle(result.lesson.title)
      setMode('preview')
    }
  }, [rawJson])

  // ── Drag & drop reorder ─────────────────────────────────────────────────────
  const handleDragOver = (e, index) => {
    e.preventDefault()
    dragOver.current = index
  }
  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (dragIndex === dropIndex) return
    setSlides((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(dropIndex, 0, moved)
      return next
    })
    dragOver.current = null
  }

  const handleSlideChange = useCallback((index, updated) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? updated : s)))
  }, [])
  const handleDeleteSlide = useCallback((index) => {
    setSlides((prev) => prev.filter((_, i) => i !== index))
  }, [])
  const handleMoveUp = useCallback((index) => {
    if (index === 0) return
    setSlides((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }, [])
  const handleMoveDown = useCallback((index) => {
    setSlides((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }, [])
  const handleImageUpload = useCallback((slideIndex, imgObj) => {
    setSlides((prev) => prev.map((s, i) => {
      if (i !== slideIndex) return s
      // imgObj is the full updated image object from AdminImageSlot
      if (typeof imgObj === 'string') {
        // Legacy: plain URL string
        return { ...s, image: { ...(s.image ?? {}), url: imgObj } }
      }
      return { ...s, image: { ...(s.image ?? {}), ...imgObj } }
    }))
  }, [])
  const handleAddSlide = (type) => {
    setSlides((prev) => [...prev, { ...SLIDE_DEFAULTS[type] }])
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const buildLesson = () => ({
    title: lessonTitle,
    exam_tag: subtopic.exam_type,
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
      router.push(`/admin/curriculum/${subject.slug}/${topic.slug}`)
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error — try again' })
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Subject/topic header */}
      <div className={`flex items-center justify-between ${color.bg} rounded-2xl px-4 py-3`}>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wide ${color.text} opacity-70`}>
            {subject.name} · {topic.name}
          </p>
          <p className={`text-base font-black ${color.text}`}>{subtopic.name}</p>
        </div>
        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
          subtopic.exam_type === 'WAEC'
            ? 'bg-blue-100 text-blue-700'
            : subtopic.exam_type === 'JAMB'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-indigo-100 text-indigo-700'
        }`}>
          {subtopic.exam_type}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'prompt', label: '1. Generate' },
          { id: 'paste', label: '2. Paste JSON' },
          { id: 'preview', label: '3. Preview & Save' },
          { id: 'edit', label: '4. Edit slides' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
              mode === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── GENERATE PROMPT TAB ── */}
      {mode === 'prompt' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Copy this prompt and paste it into Claude or Gemini. Then paste the JSON output back in the <strong>Paste JSON</strong> tab.
          </p>
          <CopyBox text={prompt} />
          <button
            onClick={() => setMode('paste')}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors"
          >
            I've generated the lesson → Paste JSON
          </button>
        </div>
      )}

      {/* ── PASTE JSON TAB ── */}
      {mode === 'paste' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Paste the full JSON output from the AI below. The lesson preview will appear automatically.
          </p>
          <textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            className="w-full h-72 font-mono text-xs p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder='Paste Claude/Gemini JSON output here…&#10;&#10;{&#10;  "title": "...",&#10;  "slides": [...]&#10;}'
            spellCheck={false}
          />

          {parseResult && (
            <div
              className={`p-3 rounded-xl text-sm ${
                parseResult.valid
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {parseResult.valid ? (
                <div className="text-green-800">
                  <p className="font-bold">✓ Valid — switching to preview…</p>
                  <p className="text-xs mt-0.5 text-green-600">
                    {parseResult.stats.totalSlides} slides ·{' '}
                    {parseResult.stats.interactions} interactions ·{' '}
                    {parseResult.stats.workedExamples} worked examples ·{' '}
                    {parseResult.stats.imageSlots} image slots
                  </p>
                </div>
              ) : (
                <div className="text-red-800">
                  <p className="font-bold">⚠ JSON has errors — fix and re-paste</p>
                  <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-700">· {err}</li>
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
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <p className="text-gray-500 text-sm font-medium mb-1">No lesson to preview yet</p>
              <p className="text-xs text-gray-400 mb-4">
                Paste your JSON in the "Paste JSON" tab — the preview appears automatically.
              </p>
              <button
                onClick={() => setMode('paste')}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
              >
                Go to Paste JSON →
              </button>
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="flex gap-3 sticky top-0 bg-white/95 backdrop-blur-sm py-3 z-10 -mx-1 px-1">
                <button
                  onClick={() => setMode('edit')}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Edit slides
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-500 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : '✓ Save Lesson — Go Live'}
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                {slides.length} slides · Saving makes this lesson immediately live for students
              </p>

              {saveMessage && (
                <div
                  className={`p-3 rounded-xl text-sm font-medium ${
                    saveMessage.type === 'error'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-green-50 text-green-800 border border-green-200'
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}

              {/* Full lesson preview — all slides in sequence */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className={`${color.bg} px-4 py-3 border-b ${color.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-black ${color.text}`}>{lessonTitle}</p>
                    <span className={`text-xs ${color.text} opacity-70`}>{slides.length} slides</span>
                  </div>
                  <div className="h-2 bg-white/40 rounded-full">
                    <div className={`h-full ${color.accent} rounded-full w-1/4`} />
                  </div>
                </div>

                <div className="divide-y divide-gray-50">
                  {slides.map((slide, i) => (
                    <div key={i} className="px-4 py-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-black text-gray-300">{i + 1}</span>
                        <span className="text-xs font-black uppercase tracking-wide text-gray-400">
                          {SLIDE_TYPE_LABELS[slide.type] ?? slide.type}
                        </span>
                      </div>
                      <SlideRenderer
                        slide={slide}
                        slideIndex={i}
                        color={color}
                        interactive={false}
                        isAdmin={true}
                        subtopicId={subtopic.id}
                        onImageUpload={handleImageUpload}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Save at bottom too */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setMode('edit')}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Edit slides
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-500 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : '✓ Save — Go Live'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── EDIT SLIDES TAB ── */}
      {mode === 'edit' && (
        <div className="space-y-4">
          {slides.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl">
              <p className="text-gray-400 text-sm mb-2">No slides yet.</p>
              <p className="text-xs text-gray-400 mb-4">Paste JSON first to auto-populate, or add slides manually.</p>
              <button
                onClick={() => setMode('paste')}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
              >
                ← Paste JSON
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Click a slide to expand and edit · Drag ⠿ to reorder
              </p>
              {slides.map((slide, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                >
                  <SlideEditor
                    slide={slide}
                    index={i}
                    onChange={handleSlideChange}
                    onDelete={handleDeleteSlide}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    isFirst={i === 0}
                    isLast={i === slides.length - 1}
                    subtopicId={subtopic.id}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Add slide */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-600 mb-3">Add a slide</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(SLIDE_DEFAULTS).map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddSlide(type)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-colors"
                >
                  + {SLIDE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setMode('preview')}
              disabled={slides.length === 0}
              className="flex-1 py-3 border border-indigo-200 text-indigo-600 text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-indigo-50 transition-colors"
            >
              ← Back to Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving || slides.length === 0}
              className="flex-1 py-3 bg-green-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-green-500 transition-colors"
            >
              {saving ? 'Saving…' : '✓ Save — Go Live'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}