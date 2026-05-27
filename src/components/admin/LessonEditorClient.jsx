'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { parseLesson, buildLessonPrompt } from '@/lib/lessonParser'
import SectionRenderer from '@/components/lesson/SectionRenderer'
import { AdminImageSlot } from '@/components/lesson/ImageSlot'
import { getSubjectColor } from '@/lib/theme'

const SECTION_DEFAULTS = {
  hook:          { type: 'hook', body: '' },
  definition:    { type: 'definition', term: '', definition: '', explanation: '', example: '' },
  explanation:   { type: 'explanation', heading: '', body: '', image_prompt: '', image_url: null },
  formula:       { type: 'formula', label: '', formula: '', variables: [{ symbol: '', meaning: '' }] },
  quick_check:   { type: 'quick_check', question: '', options: ['A. ', 'B. ', 'C. ', 'D. '], correct: 'A', explanation: '' },
  worked_example:{ type: 'worked_example', mode: 'guided', problem: '', image_prompt: '', steps: [{ instruction: '', micro_question: '', micro_answer: '' }], final_answer: '' },
  summary:       { type: 'summary', points: [''], closing_encouragement: '' },
}

function CopyBox({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="border border-indigo-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">AI Lesson Prompt</span>
        <button
          onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
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

// ── Section editor forms ──────────────────────────────────────
function SectionEditor({ section, index, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast, subtopicId }) {
  const update = (field, value) => onChange(index, { ...section, [field]: value })

  const handleImageUpload = (sectionIndex, url) => {
    update('image_url', url)
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
      draggable
      onDragStart={e => e.dataTransfer.setData('text/plain', String(index))}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 cursor-grab active:cursor-grabbing">
        <span className="text-gray-300 text-sm select-none">⠿</span>
        <span className="text-xs font-black text-gray-500 uppercase tracking-wide flex-1">
          {index + 1}. {section.type.replace('_', ' ')}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => onMoveUp(index)} disabled={isFirst} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 p-1 rounded text-xs">↑</button>
          <button onClick={() => onMoveDown(index)} disabled={isLast} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 p-1 rounded text-xs">↓</button>
          <button onClick={() => onDelete(index)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors ml-1">Remove</button>
        </div>
      </div>

      <div className="p-4 space-y-3">

        {section.type === 'hook' && (
          <textarea
            value={section.body ?? ''}
            onChange={e => update('body', e.target.value)}
            placeholder="Opening hook — a punchy real-life scenario (2–3 sentences max)"
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        )}

        {section.type === 'definition' && (
          <>
            <input value={section.term ?? ''} onChange={e => update('term', e.target.value)} placeholder="Term (e.g. Work)" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <textarea value={section.definition ?? ''} onChange={e => update('definition', e.target.value)} placeholder="The definition — clear, standalone statement" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <textarea value={section.explanation ?? ''} onChange={e => update('explanation', e.target.value)} placeholder="Plain-language explanation (1–2 sentences)" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input value={section.example ?? ''} onChange={e => update('example', e.target.value)} placeholder="Real-life example" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </>
        )}

        {section.type === 'explanation' && (
          <>
            <input value={section.heading ?? ''} onChange={e => update('heading', e.target.value)} placeholder="Heading" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <AdminImageSlot
              imageUrl={section.image_url}
              imagePrompt={section.image_prompt}
              subtopicId={subtopicId}
              sectionIndex={index}
              onUpload={(url) => update('image_url', url)}
            />
            <textarea value={section.body ?? ''} onChange={e => update('body', e.target.value)} placeholder="Body text — short paragraphs, max 3 sentences each" rows={4} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input value={section.image_prompt ?? ''} onChange={e => update('image_prompt', e.target.value)} placeholder="Image prompt (describe the ideal illustration)" className="w-full px-3 py-2.5 border border-gray-100 bg-gray-50 rounded-xl text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </>
        )}

        {section.type === 'formula' && (
          <>
            <input value={section.label ?? ''} onChange={e => update('label', e.target.value)} placeholder="Formula name (e.g. Newton's Second Law)" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input value={section.formula ?? ''} onChange={e => update('formula', e.target.value)} placeholder="Formula (e.g. F = m × a)" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Variables</label>
              {(section.variables ?? []).map((v, vi) => (
                <div key={vi} className="flex items-center gap-2 mb-2">
                  <input value={v.symbol} onChange={e => { const vars = [...(section.variables ?? [])]; vars[vi] = { ...vars[vi], symbol: e.target.value }; update('variables', vars) }} placeholder="Symbol" className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input value={v.meaning} onChange={e => { const vars = [...(section.variables ?? [])]; vars[vi] = { ...vars[vi], meaning: e.target.value }; update('variables', vars) }} placeholder="Meaning" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button onClick={() => update('variables', (section.variables ?? []).filter((_, i) => i !== vi))} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              ))}
              <button onClick={() => update('variables', [...(section.variables ?? []), { symbol: '', meaning: '' }])} className="text-xs text-indigo-600 hover:underline font-medium">+ Add variable</button>
            </div>
          </>
        )}

        {section.type === 'quick_check' && (
          <>
            <textarea value={section.question ?? ''} onChange={e => update('question', e.target.value)} placeholder="Question" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Options — select correct answer</label>
              {(section.options ?? []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2 mb-2">
                  <input type="radio" name={`correct-${index}`} checked={section.correct === opt.split('.')[0]?.trim()} onChange={() => update('correct', opt.split('.')[0]?.trim())} className="flex-shrink-0" />
                  <input value={opt} onChange={e => { const opts = [...(section.options ?? [])]; opts[oi] = e.target.value; update('options', opts) }} placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              ))}
            </div>
            <textarea value={section.explanation ?? ''} onChange={e => update('explanation', e.target.value)} placeholder="Explanation of correct answer" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </>
        )}

        {section.type === 'worked_example' && (
          <>
            <div className="flex gap-2">
              {['guided', 'student_attempt'].map(m => (
                <button key={m} onClick={() => update('mode', m)} className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-colors capitalize ${section.mode === m ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
            <textarea value={section.problem ?? ''} onChange={e => update('problem', e.target.value)} placeholder="Problem statement" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            {section.image_prompt !== undefined && (
              <input value={section.image_prompt ?? ''} onChange={e => update('image_prompt', e.target.value)} placeholder="Image prompt for this example (optional)" className="w-full px-3 py-2.5 border border-gray-100 bg-gray-50 rounded-xl text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            )}
            {section.mode === 'student_attempt' && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Reveal delay (seconds):</label>
                <input type="number" min={0} max={30} value={section.reveal_delay_seconds ?? 8} onChange={e => update('reveal_delay_seconds', parseInt(e.target.value))} className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Solution steps</label>
              {(section.steps ?? []).map((step, si) => (
                <div key={si} className="mb-3 p-3 bg-gray-50 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{si + 1}.</span>
                    <input value={step.instruction ?? ''} onChange={e => { const steps = [...(section.steps ?? [])]; steps[si] = { ...steps[si], instruction: e.target.value }; update('steps', steps) }} placeholder="Step instruction" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <button onClick={() => update('steps', (section.steps ?? []).filter((_, i) => i !== si))} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                  {section.mode === 'guided' && (
                    <div className="flex gap-2 pl-7">
                      <input value={step.micro_question ?? ''} onChange={e => { const steps = [...(section.steps ?? [])]; steps[si] = { ...steps[si], micro_question: e.target.value }; update('steps', steps) }} placeholder="Micro-question (optional)" className="flex-1 px-3 py-1.5 border border-amber-200 bg-amber-50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      <input value={step.micro_answer ?? ''} onChange={e => { const steps = [...(section.steps ?? [])]; steps[si] = { ...steps[si], micro_answer: e.target.value }; update('steps', steps) }} placeholder="Answer" className="w-28 px-3 py-1.5 border border-amber-200 bg-amber-50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => update('steps', [...(section.steps ?? []), { instruction: '', micro_question: '', micro_answer: '' }])} className="text-xs text-indigo-600 hover:underline font-medium">+ Add step</button>
            </div>
            <input value={section.final_answer ?? ''} onChange={e => update('final_answer', e.target.value)} placeholder="Final answer" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </>
        )}

        {section.type === 'summary' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Key points</label>
              {(section.points ?? ['']).map((point, pi) => (
                <div key={pi} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400">·</span>
                  <input value={point} onChange={e => { const pts = [...(section.points ?? [])]; pts[pi] = e.target.value; update('points', pts) }} placeholder={`Key point ${pi + 1}`} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button onClick={() => update('points', (section.points ?? []).filter((_, i) => i !== pi))} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              ))}
              <button onClick={() => update('points', [...(section.points ?? []), ''])} className="text-xs text-indigo-600 hover:underline font-medium">+ Add point</button>
            </div>
            <input value={section.closing_encouragement ?? ''} onChange={e => update('closing_encouragement', e.target.value)} placeholder="Closing encouragement (e.g. You've got this! Keep going 🔥)" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </>
        )}

      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function LessonEditorClient({ subject, topic, subtopic }) {
  const color = getSubjectColor(subject.name)
  const prompt = buildLessonPrompt({
    subjectName: subject.name,
    topicName: topic.name,
    subtopicName: subtopic.name,
    objectives: subtopic.objectives ?? [],
    examTag: subtopic.exam_type,
  })

  const [mode, setMode] = useState('prompt')
  const [rawJson, setRawJson] = useState(
    subtopic.lesson_content ? JSON.stringify(subtopic.lesson_content, null, 2) : ''
  )
  const [parseResult, setParseResult] = useState(null)
  const [sections, setSections] = useState(subtopic.lesson_content?.sections ?? [])
  const [lessonTitle, setLessonTitle] = useState(subtopic.lesson_content?.title ?? subtopic.name)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const [lessonStatus, setLessonStatus] = useState(subtopic.lesson_status)
  const dragOver = useRef(null)

  useEffect(() => {
    if (subtopic.lesson_content) setMode('edit')
  }, [])

  useEffect(() => {
    if (rawJson.trim().length > 20) {
      setParseResult(parseLesson(rawJson))
    } else {
      setParseResult(null)
    }
  }, [rawJson])

  // Drag and drop reorder
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    dragOver.current = index
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (dragIndex === dropIndex) return
    setSections(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(dropIndex, 0, moved)
      return next
    })
    dragOver.current = null
  }

  const handleSectionChange = useCallback((index, updated) => {
    setSections(prev => prev.map((s, i) => i === index ? updated : s))
  }, [])

  const handleDeleteSection = useCallback((index) => {
    setSections(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleMoveUp = useCallback((index) => {
    if (index === 0) return
    setSections(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }, [])

  const handleMoveDown = useCallback((index) => {
    setSections(prev => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }, [])

  const handleImageUpload = useCallback((sectionIndex, url) => {
    setSections(prev => prev.map((s, i) =>
      i === sectionIndex ? { ...s, image_url: url } : s
    ))
  }, [])

  const handleAddSection = (type) => {
    setSections(prev => [...prev, { ...SECTION_DEFAULTS[type] }])
  }

  const buildLesson = () => ({
    title: lessonTitle,
    exam_tag: subtopic.exam_type,
    sections,
  })

  const handleSave = async (status = 'draft') => {
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

      if (status !== 'draft') {
        await fetch(`/api/admin/lessons/${subtopic.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: status === 'published' ? 'publish' : 'send_for_review' }),
        })
        setLessonStatus(status === 'published' ? 'published' : 'in_review')
      } else {
        setLessonStatus('draft')
      }

      setSaveMessage({ type: 'success', text: 'Saved ✓' })
      setMode('edit')
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error — try again' })
    } finally {
      setSaving(false)
    }
  }

  const STATUS_COLORS = {
    draft:     'bg-yellow-100 text-yellow-800',
    in_review: 'bg-blue-100 text-blue-800',
    published: 'bg-green-100 text-green-800',
  }

  const SECTION_TYPES = ['hook', 'definition', 'explanation', 'formula', 'quick_check', 'worked_example', 'summary']

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">{subtopic.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lessonStatus]}`}>
              {lessonStatus}
            </span>
            <span className="text-xs text-gray-400">{subject.name} · {topic.name}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              subtopic.exam_type === 'WAEC' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              subtopic.exam_type === 'JAMB' ? 'bg-purple-50 text-purple-700 border-purple-200' :
              'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>{subtopic.exam_type}</span>
          </div>
        </div>

        {sections.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => handleSave('draft')} disabled={saving} className="px-3 py-2 text-xs font-bold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {lessonStatus === 'draft' && (
              <button onClick={() => handleSave('in_review')} disabled={saving} className="px-3 py-2 text-xs font-bold border border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 disabled:opacity-50 transition-colors">
                Send for Review
              </button>
            )}
            {lessonStatus === 'in_review' && (
              <button onClick={() => handleSave('published')} disabled={saving} className="px-3 py-2 text-xs font-bold bg-green-600 text-white rounded-xl hover:bg-green-500 disabled:opacity-50 transition-colors">
                Publish
              </button>
            )}
            {lessonStatus === 'published' && (
              <span className="text-xs font-bold text-green-600 px-3 py-2">✓ Live</span>
            )}
          </div>
        )}
      </div>

      {/* Save message */}
      {saveMessage && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          saveMessage.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* Objectives */}
      {subtopic.objectives?.length > 0 && (
        <div className={`${color.bg} rounded-2xl px-4 py-3`}>
          <p className={`text-xs font-bold uppercase tracking-wide ${color.text} mb-2`}>Learning Objectives</p>
          <ul className="space-y-1">
            {subtopic.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                <span className={`${color.text} flex-shrink-0 mt-0.5`}>·</span>
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {[
          { id: 'prompt',  label: '1. Get Prompt' },
          { id: 'paste',   label: '2. Paste JSON' },
          { id: 'edit',    label: '3. Edit' },
          { id: 'preview', label: '4. Preview' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              mode === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PROMPT TAB ── */}
      {mode === 'prompt' && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-600 mb-2">How to use:</p>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Copy the prompt below</li>
              <li>Open Claude.ai or Gemini</li>
              <li>Paste the prompt (attach reference materials if available)</li>
              <li>Copy the returned JSON → paste in "Paste JSON" tab</li>
            </ol>
          </div>
          <CopyBox text={prompt} />
          <button onClick={() => setMode('paste')} className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors">
            I have the JSON →
          </button>
        </div>
      )}

      {/* ── PASTE TAB ── */}
      {mode === 'paste' && (
        <div className="space-y-4">
          <textarea
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            rows={18}
            className="w-full font-mono text-xs p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Paste JSON here..."
            spellCheck={false}
          />

          {parseResult && (
            <div className={`p-3 rounded-xl text-sm ${parseResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {parseResult.valid ? (
                <div className="text-green-800">
                  <p className="font-bold">✓ Valid lesson JSON</p>
                  <p className="text-xs mt-0.5 text-green-600">
                    {parseResult.stats?.totalSections ?? 0} sections ·{' '}
                    {parseResult.stats?.workedExamples ?? 0} worked examples ·{' '}
                    {parseResult.stats?.quickChecks ?? 0} quick checks ·{' '}
                    {parseResult.stats?.imageSlots ?? 0} image slots
                  </p>
                </div>
              ) : (
                <div className="text-red-800">
                  <p className="font-bold">{parseResult.errors.length} error(s)</p>
                  <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-700">· {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setMode('edit')} disabled={!parseResult?.valid} className="flex-1 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors">
              Edit lesson →
            </button>
            <button onClick={() => setMode('preview')} disabled={!parseResult?.valid} className="flex-1 py-3 border border-indigo-200 text-indigo-600 text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-indigo-50 transition-colors">
              Preview →
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT TAB ── */}
      {mode === 'edit' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lesson title</label>
            <input
              value={lessonTitle}
              onChange={e => setLessonTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {sections.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl">
              <p className="text-gray-400 text-sm mb-2">No sections yet.</p>
              <p className="text-xs text-gray-400">Paste JSON in the previous tab, or add sections manually below.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Drag the ⠿ handle to reorder sections</p>
              {sections.map((section, i) => (
                <div
                  key={i}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={e => handleDrop(e, i)}
                >
                  <SectionEditor
                    section={section}
                    index={i}
                    onChange={handleSectionChange}
                    onDelete={handleDeleteSection}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    isFirst={i === 0}
                    isLast={i === sections.length - 1}
                    subtopicId={subtopic.id}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Add section */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-600 mb-3">Add a section</p>
            <div className="flex flex-wrap gap-2">
              {SECTION_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => handleAddSection(type)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-colors capitalize"
                >
                  + {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => handleSave('draft')} disabled={saving || sections.length === 0} className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-colors">
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button onClick={() => setMode('preview')} disabled={sections.length === 0} className="flex-1 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors">
              Preview →
            </button>
          </div>
        </div>
      )}

      {/* ── PREVIEW TAB ── */}
      {mode === 'preview' && (
        <div className="space-y-4">
          {sections.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No sections to preview yet.</div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className={`${color.bg} px-4 py-3 border-b ${color.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-black ${color.text}`}>{lessonTitle}</p>
                    <span className={`text-xs ${color.text} opacity-70`}>{sections.length} sections</span>
                  </div>
                  <div className="h-2 bg-white/40 rounded-full">
                    <div className={`h-full ${color.accent} rounded-full w-1/4`} />
                  </div>
                </div>

                <div className="divide-y divide-gray-50">
                  {sections.map((section, i) => (
                    <div key={i} className="px-4 py-5">
                      <SectionRenderer
                        section={section}
                        index={i}
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

              <div className="flex gap-3">
                <button onClick={() => setMode('edit')} className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                  ← Back to edit
                </button>
                <button onClick={() => handleSave('draft')} disabled={saving} className="flex-1 py-3 border border-indigo-200 text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-colors">
                  Save Draft
                </button>
                <button onClick={() => handleSave('in_review')} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Send for Review →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}