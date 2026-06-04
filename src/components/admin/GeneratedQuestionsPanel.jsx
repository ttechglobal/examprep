'use client'

// src/components/admin/GeneratedQuestionsPanel.jsx
// FIX: handleSave was calling res.json() without try/catch.
// When the API returned 405 (route missing) or any non-JSON response,
// res.json() threw "Unexpected end of JSON input" and crashed silently.
// Now wrapped in try/catch with a user-visible error state.

import { useState, useCallback, useMemo } from 'react'
import { buildGeneratedQuestionsPrompt, parseGeneratedQuestions } from '@/lib/prerequisitePrompt'

const DIFFICULTY_COLORS = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard:   'bg-red-100 text-red-700',
  mixed:  'bg-purple-100 text-purple-700',
}

const QTYPE_COLORS = {
  recall:      'bg-blue-100 text-blue-700',
  application: 'bg-indigo-100 text-indigo-700',
  reasoning:   'bg-pink-100 text-pink-700',
  objective:   'bg-gray-100 text-gray-600',
}

// ── Single question preview card ──────────────────────────────────────────────
function QuestionCard({ question, index }) {
  const [expanded, setExpanded] = useState(false)
  const wrongKeys = Object.keys(question.options ?? {}).filter(k => k !== question.correct_answer)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xs font-black text-gray-400 flex-shrink-0 mt-0.5">Q{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug">{question.question_text}</p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${DIFFICULTY_COLORS[question.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
              {question.difficulty}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${QTYPE_COLORS[question.question_type ?? 'objective']}`}>
              {question.question_type ?? 'objective'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
              Answer: {question.correct_answer}
            </span>
          </div>
        </div>
        <span className="text-gray-300 text-sm flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
          {/* Options */}
          <div className="space-y-1.5">
            {Object.entries(question.options ?? {}).map(([key, text]) => (
              <div
                key={key}
                className={`text-xs px-3 py-2 rounded-xl flex gap-2 ${
                  key === question.correct_answer
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                <span className="font-black flex-shrink-0">{key}.</span>
                <span>{text}</span>
                {key === question.correct_answer && (
                  <span className="ml-auto font-black flex-shrink-0">✓</span>
                )}
              </div>
            ))}
          </div>

          {/* Correct explanation */}
          {question.correct_explanation && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs font-black text-green-700 mb-1">
                Why {question.correct_answer} is correct
              </p>
              <p className="text-xs text-green-800 leading-relaxed">
                {question.correct_explanation}
              </p>
            </div>
          )}

          {/* Wrong explanations */}
          {wrongKeys.length > 0 && (
            <div className="space-y-1.5">
              {wrongKeys.map(k =>
                question.wrong_explanations?.[k] ? (
                  <div key={k} className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-xs font-black text-red-600 mb-0.5">Why {k} is wrong</p>
                    <p className="text-xs text-red-700 leading-relaxed">
                      {question.wrong_explanations[k]}
                    </p>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function GeneratedQuestionsPanel({ subject, topic, subtopic }) {
  const [showPrompt, setShowPrompt]   = useState(false)
  const [copied, setCopied]           = useState(false)
  const [rawJson, setRawJson]         = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [saveResult, setSaveResult]   = useState(null)

  // FIX: same guard as LessonEditorClient — build prompt only when props are ready
  const prompt = useMemo(() => {
    if (!subject?.name || !topic?.name || !subtopic?.name) return ''
    try {
      return buildGeneratedQuestionsPrompt({
        subjectName:  subject.name,
        topicName:    topic.name,
        subtopicName: subtopic.name,
        examType:     subtopic.exam_type ?? subject.exam_type ?? 'BOTH',
        objectives:   subtopic.objectives ?? [],
      })
    } catch {
      return ''
    }
  }, [subject?.name, topic?.name, subtopic?.name, subtopic?.exam_type, subject?.exam_type, subtopic?.objectives])

  const handleCopy = () => {
    if (!prompt) return
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJsonChange = useCallback((value) => {
    setRawJson(value)
    setSaveResult(null)
    if (value.trim().length > 50) {
      setParseResult(parseGeneratedQuestions(value))
    } else {
      setParseResult(null)
    }
  }, [])

  // ── FIX: hardened handleSave ───────────────────────────────────────────────
  // Previously: const data = await res.json() — no try/catch
  // If the API returns 405, 401, or any non-JSON body, res.json() throws
  // "Unexpected end of JSON input" and the component crashes silently.
  // Now: checks res.ok before parsing, catches JSON errors, surfaces them.
  const handleSave = async () => {
    if (!parseResult?.valid) return
    setSaving(true)
    setSaveResult(null)

    try {
      const res = await fetch('/api/admin/questions/generated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions:  parseResult.questions,
          subtopicId: subtopic.id,
          topicId:    topic.id,
          subjectId:  subject.id,
          examType:   subtopic.exam_type ?? subject.exam_type ?? 'BOTH',
        }),
      })

      // Guard: non-JSON responses (405, 500 HTML error pages, etc.)
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        setSaveResult({
          saved: 0,
          errors: [`Server returned ${res.status} — check the API route exists`],
        })
        setSaving(false)
        return
      }

      let data
      try {
        data = await res.json()
      } catch (jsonErr) {
        setSaveResult({
          saved: 0,
          errors: [`Could not parse server response: ${jsonErr.message}`],
        })
        setSaving(false)
        return
      }

      if (!res.ok) {
        setSaveResult({
          saved: 0,
          errors: [data.error ?? `Server error ${res.status}`],
        })
        setSaving(false)
        return
      }

      setSaveResult(data)
    } catch (networkErr) {
      setSaveResult({
        saved: 0,
        errors: [`Network error — ${networkErr.message}`],
      })
    } finally {
      setSaving(false)
    }
  }

  if (!subject?.name || !topic?.name || !subtopic?.name) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="font-bold text-gray-900 mb-1">AI-Generated Practice Questions</h2>
        <p className="text-sm text-gray-500">
          Generate 10 exam-style questions for <strong>{subtopic.name}</strong>.
          Saved to the question bank for prerequisite quizzes, practice mode, and exam simulation.
        </p>
      </div>

      {/* Prompt section */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-black text-blue-800">Copy this prompt</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Paste into Claude or Gemini → copy the JSON response → paste below
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrompt(p => !p)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {showPrompt ? 'Hide' : 'Preview'}
            </button>
            <button
              onClick={handleCopy}
              disabled={!prompt}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-colors disabled:opacity-40 ${
                copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              {copied ? 'Copied ✓' : 'Copy Prompt'}
            </button>
          </div>
        </div>
        {showPrompt && prompt && (
          <pre className="text-xs text-blue-900 whitespace-pre-wrap font-mono leading-relaxed max-h-[250px] overflow-y-auto bg-white/70 rounded-xl p-3 border border-blue-200">
            {prompt}
          </pre>
        )}
      </div>

      {/* Paste area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paste Claude's JSON response
        </label>
        <textarea
          value={rawJson}
          onChange={e => handleJsonChange(e.target.value)}
          rows={10}
          className="w-full font-mono text-xs p-4 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder={'{\n  "questions": [\n    {\n      "question_text": "...",\n      "options": {"A":"...","B":"...","C":"...","D":"..."},\n      "correct_answer": "A",\n      "difficulty": "medium",\n      "question_type": "application",\n      "correct_explanation": "...",\n      "wrong_explanations": {"B":"...","C":"...","D":"..."}\n    }\n  ]\n}'}
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
                <span className="font-bold">Valid ✓</span>
                <span className="ml-2 text-green-600 text-xs">
                  {parseResult.stats.total} questions ·{' '}
                  {parseResult.stats.easy} easy ·{' '}
                  {parseResult.stats.medium} medium ·{' '}
                  {parseResult.stats.hard} hard
                </span>
              </div>
            ) : (
              <div className="text-red-800">
                <span className="font-bold">{parseResult.errors.length} error(s)</span>
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

      {/* Save result */}
      {saveResult && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          saveResult.errors?.length
            ? 'bg-amber-50 border border-amber-200 text-amber-800'
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          {saveResult.errors?.length && !saveResult.saved ? (
            <>
              <p className="font-bold">Save failed</p>
              <ul className="mt-1 space-y-0.5">
                {saveResult.errors.map((e, i) => (
                  <li key={i} className="text-xs">· {e}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              {saveResult.saved} question{saveResult.saved !== 1 ? 's' : ''} saved to question bank ✓
              {saveResult.errors?.length > 0 && (
                <span className="ml-1">· {saveResult.errors.length} error(s)</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Save button */}
      {parseResult?.valid && !saveResult && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-green-600 text-white text-sm font-black rounded-2xl hover:bg-green-500 disabled:opacity-40 transition-colors"
        >
          {saving
            ? 'Saving to question bank…'
            : `Save ${parseResult.stats.total} questions to question bank →`}
        </button>
      )}

      {/* Retry after error */}
      {saveResult?.errors?.length > 0 && (
        <button
          onClick={() => { setSaveResult(null) }}
          className="w-full py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-2xl hover:bg-gray-50 transition-colors"
        >
          Try again
        </button>
      )}

      {/* Questions preview */}
      {parseResult?.valid && parseResult.questions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-gray-700">
            Preview ({parseResult.questions.length} questions)
          </p>
          {parseResult.questions.map((q, i) => (
            <QuestionCard key={i} question={q} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}