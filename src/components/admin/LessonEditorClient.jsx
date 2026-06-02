'use client'
// src/components/admin/LessonEditorClient.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES IN THIS VERSION:
//   Added Tab 5: "Questions" — optional question upload per subtopic
//   Workflow after saving a lesson:
//     Tab 1: Generate prompt → Copy → paste into AI
//     Tab 2: Paste lesson JSON back
//     Tab 3: Preview & Save
//     Tab 4: Edit slides (manual tweaks)
//     Tab 5: Questions (NEW — optional)
//             Admin picks exam style (WAEC / JAMB), question count,
//             copies the AI prompt, pastes the JSON back,
//             previews, and saves directly to the question bank for this subtopic.
//             End-of-lesson questions (end_quiz slides) are separate — this
//             adds standalone practice questions for the topic practice pool.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { parseLesson, buildLessonPrompt } from '@/lib/lessonParser'
import { parseQuestions } from '@/lib/questionParser'
import SlideRenderer from '@/components/lesson/SlideRenderer'
import { getSubjectColor } from '@/lib/theme'

// ── Copy prompt box ───────────────────────────────────────────────────────────
function CopyBox({ text, label = 'AI Prompt' }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="border border-indigo-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-indigo-600 text-white hover:bg-indigo-500'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="text-xs text-gray-700 p-4 bg-white overflow-auto max-h-40 whitespace-pre-wrap font-mono leading-relaxed">
        {text}
      </pre>
    </div>
  )
}

// ── Build the question generation prompt ──────────────────────────────────────
function buildSubtopicQuestionPrompt({ examType, subjectName, topicName, subtopicName, count }) {
  return `You are an expert Nigerian secondary school teacher creating ${examType} exam-style practice questions.

Subject: ${subjectName}
Topic: ${topicName}
Subtopic: ${subtopicName}
Exam style: ${examType}
Number of questions: ${count}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate exactly ${count} multiple-choice questions covering "${subtopicName}".

Questions should:
- Match the difficulty and style of real ${examType} past papers
- Cover different aspects of the subtopic — not all the same angle
- Mix difficulty: roughly 30% easy (recall), 50% medium (application), 20% hard (reasoning)
- Use clear, unambiguous language appropriate for SS2/SS3 students
- For calculation questions: show full step-by-step workings in the explanation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATTING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ NO LaTeX — no $$, no \\frac, no \\sqrt, no \\times
✓ Use × for multiplication, ÷ for division
✓ Exponents: x^2, x^n, x^{-1}
✓ Square roots: sqrt(x)
✓ Fractions: numerator/denominator or (expr)/(expr)
✓ Log bases: log_2(8), log_10(x)
✓ Chemistry: H_2O, CO_2, H_2SO_4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKINGS FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"workings" MUST be a JSON array of strings — one mathematical step per string.
NEVER write workings as a prose paragraph.

Example for a calculation:
  "workings": [
    "Given: u = 0 m/s, a = 10 m/s^2, t = 5s",
    "Formula: v = u + at",
    "v = 0 + (10 × 5)",
    "v = 50 m/s"
  ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETURN FORMAT — JSON ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY a valid JSON array. No markdown, no preamble.

[
  {
    "question_text": "",
    "options": { "A": "", "B": "", "C": "", "D": "" },
    "correct_answer": "A",
    "difficulty": "medium",
    "question_type": "application",
    "explanation": {
      "correct": "",
      "workings": ["step 1", "step 2", "answer"],
      "wrong_options": {
        "B": "",
        "C": "",
        "D": ""
      }
    }
  }
]`
}

// ── Question preview row ──────────────────────────────────────────────────────
function QuestionPreviewRow({ q, index }) {
  const [open, setOpen] = useState(false)
  const diffColor = q.difficulty === 'easy'
    ? 'bg-green-100 text-green-700'
    : q.difficulty === 'hard'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700'

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-black text-gray-400 flex-shrink-0 w-5 mt-0.5">{index + 1}.</span>
        <p className="text-sm text-gray-800 leading-snug flex-1 line-clamp-2">{q.question_text}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffColor}`}>
            {q.difficulty}
          </span>
          <span className="text-gray-300 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50 space-y-2">
          {Object.entries(q.options ?? {}).map(([key, text]) => (
            <div
              key={key}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                key === q.correct_answer
                  ? 'bg-green-50 border border-green-300 text-green-800 font-bold'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              <span className="font-black flex-shrink-0">{key}.</span>
              <span>{text}</span>
              {key === q.correct_answer && <span className="ml-auto text-green-600">✓</span>}
            </div>
          ))}
          {q.explanation?.correct && (
            <div className="mt-2 px-3 py-2.5 bg-indigo-50 rounded-lg">
              <p className="text-xs font-bold text-indigo-700 mb-1">Explanation</p>
              <p className="text-xs text-indigo-800 leading-relaxed">{q.explanation.correct}</p>
            </div>
          )}
          {q.explanation?.workings?.length > 0 && (
            <div className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs font-bold text-gray-600 mb-1">Workings</p>
              <ol className="space-y-1">
                {q.explanation.workings.map((step, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-2">
                    <span className="text-indigo-500 font-bold flex-shrink-0">{i + 1}.</span>
                    <span className="font-mono">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Questions tab (Tab 5) ─────────────────────────────────────────────────────
function QuestionsTab({ subtopic, subject, topic }) {
  const [step,          setStep]          = useState('setup') // setup | generate | paste | preview | done
  const [examType,      setExamType]      = useState(subtopic.exam_type ?? 'WAEC')
  const [count,         setCount]         = useState(10)
  const [rawJson,       setRawJson]       = useState('')
  const [parseResult,   setParseResult]   = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [savedCount,    setSavedCount]    = useState(0)
  const [existingCount, setExistingCount] = useState(null)

  // Fetch how many questions already exist for this subtopic
  useEffect(() => {
    fetch(`/api/admin/questions?subtopicId=${subtopic.id}&countOnly=true`)
      .then(r => r.json())
      .then(d => setExistingCount(d.count ?? 0))
      .catch(() => setExistingCount(0))
  }, [subtopic.id])

  const prompt = buildSubtopicQuestionPrompt({
    examType,
    subjectName:  subject.name,
    topicName:    topic.name,
    subtopicName: subtopic.name,
    count,
  })

  useEffect(() => {
    if (rawJson.trim().length > 10) {
      setParseResult(parseQuestions(rawJson))
    } else {
      setParseResult(null)
    }
  }, [rawJson])

  async function handleSave() {
    if (!parseResult?.valid) return
    setSaving(true)
    try {
      const questions = parseResult.questions.map(q => ({
        ...q,
        exam_type:    examType,
        subject_id:   subject.id,
        topic_id:     topic.id,
        subtopic_id:  subtopic.id,
        source:       'ai_generated',
        is_active:    true,
      }))

      const res = await fetch('/api/admin/questions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ questions, examType, subjectId: subject.id }),
      })
      const data = await res.json()
      setSavedCount(data.saved ?? questions.length)
      setStep('done')
    } catch {
      // silent fail — admin can retry
    } finally {
      setSaving(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">🎉</div>
        <p className="text-lg font-black text-gray-900">{savedCount} questions saved!</p>
        <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
          These are now available for students practising "{subtopic.name}".
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setStep('setup'); setRawJson(''); setParseResult(null) }}
            className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Add more questions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-gray-900">Practice Questions</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {existingCount !== null
              ? `${existingCount} question${existingCount !== 1 ? 's' : ''} already in bank for this subtopic`
              : 'Loading existing count…'}
          </p>
        </div>
        <span className="text-xs text-gray-400">Optional</span>
      </div>

      {/* Step 1: Setup */}
      {(step === 'setup' || step === 'generate') && (
        <div className="space-y-4 bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Step 1 — Configure</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Exam type */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Exam style</label>
              <div className="flex gap-2">
                {['WAEC', 'JAMB'].map(et => (
                  <button
                    key={et}
                    onClick={() => setExamType(et)}
                    className={`flex-1 py-2.5 text-xs font-black rounded-xl border-2 transition-all ${
                      examType === et
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {et}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Number of questions
              </label>
              <select
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {[5, 10, 15, 20, 25, 30].map(n => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => setStep('generate')}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors"
          >
            Generate AI prompt →
          </button>
        </div>
      )}

      {/* Step 2: Copy prompt */}
      {step === 'generate' && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Step 2 — Copy prompt & paste into Claude/Gemini</p>
          <CopyBox text={prompt} label={`${examType} Question Prompt (${count} questions)`} />
          <button
            onClick={() => setStep('paste')}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors"
          >
            I've got the JSON →
          </button>
        </div>
      )}

      {/* Step 3: Paste JSON */}
      {step === 'paste' && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Step 3 — Paste the JSON</p>
          <textarea
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            rows={14}
            className="w-full font-mono text-xs p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Paste the JSON array from Claude/Gemini here…"
            spellCheck={false}
          />

          {parseResult && (
            <div className={`p-3 rounded-xl text-sm ${
              parseResult.valid
                ? 'bg-green-50 border border-green-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              {parseResult.valid ? (
                <div>
                  <p className="font-bold text-green-800">
                    ✓ {parseResult.stats?.total} questions detected
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {parseResult.stats?.easy} easy · {parseResult.stats?.medium} medium · {parseResult.stats?.hard} hard
                    {parseResult.stats?.withWorkings > 0 && ` · ${parseResult.stats.withWorkings} with workings`}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-amber-800">{parseResult.errors.length} error(s)</p>
                  <ul className="mt-1 space-y-0.5">
                    {parseResult.errors.slice(0, 5).map((e, i) => (
                      <li key={i} className="text-xs text-amber-700">· {e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => parseResult?.valid && setStep('preview')}
            disabled={!parseResult?.valid}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Preview {parseResult?.questions?.length ?? ''} questions →
          </button>
        </div>
      )}

      {/* Step 4: Preview + Save */}
      {step === 'preview' && parseResult?.valid && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Step 4 — Preview & save</p>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {parseResult.questions.map((q, i) => (
              <QuestionPreviewRow key={i} q={q} index={i} />
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-green-600 text-white text-sm font-black rounded-2xl disabled:opacity-50 hover:bg-green-500 transition-colors"
          >
            {saving ? 'Saving…' : `Save ${parseResult.questions.length} questions to bank →`}
          </button>

          <button
            onClick={() => setStep('paste')}
            className="w-full py-2.5 text-xs text-gray-400 hover:text-gray-600"
          >
            ← Back to paste
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main LessonEditorClient
// ─────────────────────────────────────────────────────────────────────────────
export default function LessonEditorClient({ subtopic, subject, topic }) {
  const router     = useRouter()
  const color      = getSubjectColor(subject.name)
  const prompt     = buildLessonPrompt(subtopic.name, topic.name, subject.name, subtopic.exam_type)

  const [mode,        setMode]        = useState('prompt')
  const [rawJson,     setRawJson]     = useState(() => {
    const content = subtopic.lesson_content
    if (!content) return ''
    return typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  })
  const [parseResult, setParseResult] = useState(null)
  const [slides,      setSlides]      = useState(subtopic.lesson_content?.slides ?? [])
  const [lessonTitle, setLessonTitle] = useState(subtopic.lesson_content?.title ?? subtopic.name)
  const [saving,      setSaving]      = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  // Reparse when rawJson changes
  useEffect(() => {
    if (rawJson.trim().length > 20) {
      const result = parseLesson(rawJson)
      setParseResult(result)
      if (result.valid) {
        setSlides(result.slides)
        setLessonTitle(result.title ?? subtopic.name)
        setMode('preview')
      }
    } else {
      setParseResult(null)
    }
  }, [rawJson, subtopic.name])

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const lesson = { title: lessonTitle, exam_tag: subtopic.exam_type, slides }
      const res = await fetch(`/api/admin/lessons/${subtopic.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ raw_content: JSON.stringify(lesson) }),
      })
      const data = await res.json()
      if (!data.valid && data.errors) {
        setSaveMessage({ type: 'error', text: `${data.errors.length} error(s) — check the lesson structure` })
        setSaving(false)
        return
      }
      const patchRes = await fetch(`/api/admin/lessons/${subtopic.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'publish' }),
      })
      const patchData = await patchRes.json()
      setSaveMessage({
        type: 'success',
        text: patchData.questionsScheduled
          ? '✓ Published — generating background questions…'
          : '✓ Lesson published',
      })
      // Stay on page so admin can add questions in Tab 5
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error — try again' })
    } finally {
      setSaving(false)
    }
  }

  const TABS = [
    { id: 'prompt',    label: '1. Generate' },
    { id: 'paste',     label: '2. Paste JSON' },
    { id: 'preview',   label: '3. Preview & Save' },
    { id: 'edit',      label: '4. Edit slides' },
    { id: 'questions', label: '5. Questions' },
  ]

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Header */}
      <div className={`flex items-center justify-between ${color.bg} rounded-2xl px-4 py-3`}>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wide ${color.text} opacity-70`}>
            {subject.name} · {topic.name}
          </p>
          <p className={`text-base font-black ${color.text}`}>{subtopic.name}</p>
        </div>
        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
          subtopic.exam_type === 'WAEC' ? 'bg-blue-100 text-blue-700'
          : subtopic.exam_type === 'JAMB' ? 'bg-purple-100 text-purple-700'
          : 'bg-indigo-100 text-indigo-700'
        }`}>
          {subtopic.exam_type}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-shrink-0 flex-1 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              mode === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Save message */}
      {saveMessage && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          saveMessage.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* ── TAB 1: Generate prompt ─────────────────────────────────────────── */}
      {mode === 'prompt' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Copy this prompt and paste it into Claude or Gemini along with any relevant content.
            Then paste the JSON output back in the <strong>Paste JSON</strong> tab.
          </p>
          <CopyBox text={prompt} label="AI Lesson Prompt" />
          <button
            onClick={() => setMode('paste')}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors"
          >
            I've generated the lesson → Paste JSON
          </button>
        </div>
      )}

      {/* ── TAB 2: Paste JSON ──────────────────────────────────────────────── */}
      {mode === 'paste' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Paste the full JSON output from the AI below.
          </p>
          <textarea
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            className="w-full h-72 font-mono text-xs p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder='Paste Claude/Gemini JSON output here…'
            spellCheck={false}
          />
          {parseResult && (
            <div className={`p-3 rounded-xl text-sm ${
              parseResult.valid
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {parseResult.valid ? (
                <p className="font-bold text-green-800">
                  ✓ Valid — {parseResult.stats?.totalSlides} slides · {parseResult.stats?.workedExamples} worked examples
                </p>
              ) : (
                <div className="text-red-800">
                  <p className="font-bold">⚠ JSON has errors</p>
                  <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                    {(parseResult.errors ?? []).map((err, i) => (
                      <li key={i} className="text-xs">· {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Preview & Save ──────────────────────────────────────────── */}
      {mode === 'preview' && (
        <div className="space-y-4">
          {slides.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <p className="text-gray-500 text-sm font-medium mb-3">No lesson to preview yet</p>
              <button onClick={() => setMode('paste')} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl">
                Go to Paste JSON →
              </button>
            </div>
          ) : (
            <>
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
                  {saving ? 'Saving…' : `Publish lesson →`}
                </button>
              </div>

              {/* Slide previews */}
              <div className="space-y-4">
                {slides.map((slide, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-gray-400 uppercase">{slide.type}</span>
                      <span className="text-xs text-gray-300">{i + 1}/{slides.length}</span>
                    </div>
                    <SlideRenderer slide={slide} color={color} interactive={false} isAdmin />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB 4: Edit slides ─────────────────────────────────────────────── */}
      {mode === 'edit' && (
        <div className="space-y-4">
          <div className="text-center py-8 bg-gray-50 rounded-2xl">
            <p className="text-sm text-gray-500">
              Slide editing coming soon — use Paste JSON to update the lesson content for now.
            </p>
            <button
              onClick={() => setMode('paste')}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
            >
              Go to Paste JSON →
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 5: Questions ───────────────────────────────────────────────── */}
      {mode === 'questions' && (
        <QuestionsTab subtopic={subtopic} subject={subject} topic={topic} />
      )}
    </div>
  )
}