'use client'

import { useState, useEffect } from 'react'
import { parseQuestions, buildQuestionPrompt, matchTopicSubtopic } from '@/lib/questionParser'
import Link from 'next/link'

const DIFFICULTIES = ['easy', 'medium', 'hard']
const DIFFICULTY_COLORS = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
}

function StepIndicator({ current }) {
  const steps = ['Context', 'Prompt', 'Paste', 'Tag Review', 'Preview', 'Save']
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
              i + 1 < current ? 'bg-green-500 text-white' :
              i + 1 === current ? 'bg-indigo-600 text-white' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i + 1 < current ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] mt-1 hidden sm:block whitespace-nowrap ${
              i + 1 === current ? 'text-indigo-600 font-bold' : 'text-gray-400'
            }`}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-4 ${i + 1 < current ? 'bg-green-400' : 'bg-gray-100'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function CopyBox({ text, label = 'AI Question Extraction Prompt' }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="border border-indigo-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">{label}</span>
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

function QuestionPreviewCard({ question, topics, onUpdateMapping }) {
  const [expanded, setExpanded] = useState(false)
  const [selectedTopicId, setSelectedTopicId] = useState(question.topic_id ?? '')
  const [selectedSubtopicId, setSelectedSubtopicId] = useState(question.subtopic_id ?? '')

  const selectedTopic = topics.find(t => t.id === selectedTopicId)
  const subtopics = selectedTopic?.subtopics ?? []

  const handleTopicChange = (topicId) => {
    setSelectedTopicId(topicId)
    setSelectedSubtopicId('')
    onUpdateMapping(question._index, { topic_id: topicId, subtopic_id: null })
  }

  const handleSubtopicChange = (subId) => {
    setSelectedSubtopicId(subId)
    onUpdateMapping(question._index, { topic_id: selectedTopicId, subtopic_id: subId })
  }

  const hasMapping = selectedTopicId && selectedSubtopicId
  const needsReview = question._needsReview || !hasMapping

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${needsReview ? 'border-amber-300' : 'border-gray-200'}`}>
      <div
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5 w-5">{question._index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-snug line-clamp-2">
            {question.question_text}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[question.difficulty]}`}>
              {question.difficulty}
            </span>
            {question.year && (
              <span className="text-xs text-gray-400">{question.year}</span>
            )}
            {hasMapping ? (
              <span className="text-xs text-green-600 font-medium">✓ Tagged</span>
            ) : (
              <span className="text-xs text-amber-600 font-medium">⚠ Needs tagging</span>
            )}
            {question._needsReview && (
              <span className="text-xs text-amber-600">Low confidence match</span>
            )}
          </div>
        </div>
        <span className={`text-gray-300 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          {/* Options */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(question.options ?? {}).map(([key, text]) => (
              <div key={key} className={`px-3 py-2 rounded-xl text-xs border ${
                key === question.correct_answer
                  ? 'border-green-300 bg-green-50 text-green-800 font-medium'
                  : 'border-gray-200 text-gray-600'
              }`}>
                <span className="font-bold">{key}.</span> {text}
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="bg-indigo-50 rounded-xl p-3">
            <p className="text-xs font-bold text-indigo-700 mb-1">Why {question.correct_answer} is correct:</p>
            <p className="text-xs text-gray-700 leading-relaxed">{question.explanation?.correct}</p>
            {question.explanation?.workings?.length > 0 && (
              <div className="mt-2 space-y-1">
                {question.explanation.workings.map((w, i) => (
                  <p key={i} className="text-xs text-gray-600 font-mono">
                    {w.step}. {w.instruction}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Topic mapping */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-600">Topic mapping</p>
            <div className="text-xs text-gray-400 mb-1">
              AI suggested: <span className="font-medium text-gray-600">
                {question.topic_title} → {question.subtopic_title}
              </span>
            </div>
            <select
              value={selectedTopicId}
              onChange={e => handleTopicChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">Select topic...</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selectedTopicId && (
              <select
                value={selectedSubtopicId}
                onChange={e => handleSubtopicChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="">Select subtopic...</option>
                {subtopics.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function QuestionUploadPage() {
  const [step, setStep] = useState(1)
  const [examType, setExamType] = useState('')
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [rawJson, setRawJson] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [taggedQuestions, setTaggedQuestions] = useState([])
  const [topics, setTopics] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(null)

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(data => setSubjects(Array.isArray(data) ? data.filter(s => s.is_active) : []))
  }, [])

  useEffect(() => {
    if (rawJson.trim().length > 10) {
      setParseResult(parseQuestions(rawJson))
    } else {
      setParseResult(null)
    }
  }, [rawJson])

  const loadTopics = async (subjectId) => {
    setLoadingTopics(true)
    const res = await fetch(`/api/admin/curriculum?subjectId=${subjectId}`)
    const data = await res.json()
    setTopics(Array.isArray(data) ? data : [])
    setLoadingTopics(false)
    return Array.isArray(data) ? data : []
  }

  const handleProceedToTagging = async () => {
    if (!parseResult?.valid && parseResult?.questions?.length === 0) return

    const loadedTopics = topics.length > 0 ? topics : await loadTopics(selectedSubject.id)

    // Auto-match topics
    const tagged = parseResult.questions.map((q, i) => {
      const match = matchTopicSubtopic(q, loadedTopics)
      return {
        ...q,
        _index: i,
        topic_id: match.topic?.id ?? null,
        subtopic_id: match.subtopic?.id ?? null,
        _needsReview: match.needsReview,
        _matchConfidence: match.confidence,
      }
    })

    setTaggedQuestions(tagged)
    setStep(4)
  }

  const handleUpdateMapping = (index, { topic_id, subtopic_id }) => {
    setTaggedQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, topic_id, subtopic_id, _needsReview: false } : q
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Create batch record
      const batchRes = await fetch('/api/admin/questions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType,
          subjectId: selectedSubject.id,
          total: taggedQuestions.length,
        }),
      })
      const batch = await batchRes.json()

      // Save questions
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: taggedQuestions,
          examType,
          subjectId: selectedSubject.id,
          batchId: batch.id,
        }),
      })
      const result = await res.json()
      setSaveResult(result)
      setStep(6)
    } catch {
      setSaveResult({ saved: 0, errors: ['Network error — try again'] })
      setStep(6)
    } finally {
      setSaving(false)
    }
  }

  const untaggedCount = taggedQuestions.filter(q => !q.subtopic_id).length
  const flaggedCount = taggedQuestions.filter(q => q._needsReview).length

  const prompt = selectedSubject && examType
    ? buildQuestionPrompt(examType, selectedSubject.name)
    : ''

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/questions" className="text-gray-400 hover:text-gray-600 text-sm">← Questions</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Upload Questions</h1>
      </div>

      <StepIndicator current={step} />

      {/* ── STEP 1: Context ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Select exam and subject</h2>
            <p className="text-sm text-gray-500">This scopes the prompt and topic tagging to the right curriculum.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Exam</label>
            <div className="grid grid-cols-2 gap-3">
              {['WAEC', 'JAMB'].map(e => (
                <button
                  key={e}
                  onClick={() => setExamType(e)}
                  className={`py-3 rounded-2xl border-2 text-sm font-black transition-colors ${
                    examType === e ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
            <div className="space-y-2">
              {subjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubject(s)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-left transition-colors ${
                    selectedSubject?.id === s.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={`text-sm font-bold ${selectedSubject?.id === s.id ? 'text-indigo-800' : 'text-gray-900'}`}>
                    {s.name}
                  </span>
                  <span className="text-xs text-gray-400">{s.subtopic_count} subtopics</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { loadTopics(selectedSubject.id); setStep(2) }}
            disabled={!examType || !selectedSubject}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2: Prompt ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Copy the AI prompt</h2>
              <p className="text-sm text-gray-500">
                {selectedSubject?.name} — {examType}
              </p>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-600 mb-2">Instructions:</p>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Copy the prompt below</li>
              <li>Open Claude.ai or Gemini</li>
              <li>Paste the prompt and attach the past question PDF</li>
              <li>Copy the returned JSON array and paste it in the next step</li>
            </ol>
          </div>

          <CopyBox text={prompt} />

          <button onClick={() => setStep(3)} className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors">
            I have the JSON →
          </button>
        </div>
      )}

      {/* ── STEP 3: Paste ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Paste the questions JSON</h2>
              <p className="text-sm text-gray-500">Paste exactly what Claude or Gemini returned.</p>
            </div>
            <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <textarea
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            rows={16}
            className="w-full font-mono text-xs p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Paste the JSON array here..."
            spellCheck={false}
          />

          {parseResult && (
            <div className={`p-3 rounded-xl text-sm ${
              parseResult.stats?.invalid === 0
                ? 'bg-green-50 border border-green-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <p className={`font-bold ${parseResult.stats?.invalid === 0 ? 'text-green-800' : 'text-amber-800'}`}>
                {parseResult.stats?.total} questions detected ·{' '}
                {parseResult.stats?.valid} valid ·{' '}
                {parseResult.stats?.invalid} with errors
              </p>
              {parseResult.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                  {parseResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i} className="text-xs text-amber-700">· {err}</li>
                  ))}
                  {parseResult.errors.length > 5 && (
                    <li className="text-xs text-amber-600">+{parseResult.errors.length - 5} more errors</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <button
            onClick={handleProceedToTagging}
            disabled={!parseResult || parseResult.questions.length === 0}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Review topic tagging ({parseResult?.questions?.length ?? 0} questions) →
          </button>
        </div>
      )}

      {/* ── STEP 4: Tag Review ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Review topic tagging</h2>
              <p className="text-sm text-gray-500">
                {taggedQuestions.length} questions · {untaggedCount} untagged · {flaggedCount} low-confidence
              </p>
            </div>
            <button onClick={() => setStep(3)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          {flaggedCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-amber-800">
                ⚠ {flaggedCount} question{flaggedCount > 1 ? 's' : ''} have low-confidence topic matches
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Review and correct their topic mappings before saving.
              </p>
            </div>
          )}

          {untaggedCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-red-800">
                {untaggedCount} question{untaggedCount > 1 ? 's' : ''} have no topic mapping
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                All questions must be tagged before saving.
              </p>
            </div>
          )}

          {loadingTopics ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {taggedQuestions.map((q, i) => (
                <QuestionPreviewCard
                  key={i}
                  question={q}
                  topics={topics}
                  onUpdateMapping={handleUpdateMapping}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => setStep(5)}
            disabled={untaggedCount > 0}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Preview questions →
          </button>
        </div>
      )}

      {/* ── STEP 5: Preview ── */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Preview</h2>
              <p className="text-sm text-gray-500">
                {taggedQuestions.length} questions ready to save
              </p>
            </div>
            <button onClick={() => setStep(4)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <div className="space-y-3">
            {taggedQuestions.map((q, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-xs text-gray-400 w-5 flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <p className="text-sm text-gray-800 leading-relaxed flex-1">{q.question_text}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {Object.entries(q.options).map(([key, text]) => (
                    <div key={key} className={`px-3 py-2 rounded-xl text-xs border ${
                      key === q.correct_answer
                        ? 'border-green-300 bg-green-50 text-green-800 font-medium'
                        : 'border-gray-100 text-gray-600'
                    }`}>
                      <span className="font-bold">{key}.</span> {text}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[q.difficulty]}`}>
                    {q.difficulty}
                  </span>
                  {q.year && <span className="text-xs text-gray-400">{q.year}</span>}
                  <span className="text-xs text-indigo-600 font-medium">
                    {topics.find(t => t.id === q.topic_id)?.name}
                  </span>
                  <span className="text-xs text-gray-400">→</span>
                  <span className="text-xs text-gray-600">
                    {topics.flatMap(t => t.subtopics ?? []).find(s => s.id === q.subtopic_id)?.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-green-600 text-white text-base font-black rounded-2xl disabled:opacity-50 hover:bg-green-500 transition-colors shadow-lg shadow-green-200"
          >
            {saving ? 'Saving questions...' : `Save ${taggedQuestions.length} questions to question bank →`}
          </button>
        </div>
      )}

      {/* ── STEP 6: Done ── */}
      {step === 6 && saveResult && (
        <div className="text-center space-y-4 py-6">
          <div className="text-5xl">{saveResult.errors?.length > 0 ? '⚠️' : '🎉'}</div>
          <h2 className="text-2xl font-black text-gray-900">
            {saveResult.errors?.length > 0 ? 'Saved with some errors' : 'Questions saved!'}
          </h2>
          <p className="text-gray-500">
            {saveResult.saved} questions added to the question bank for {selectedSubject?.name}.
          </p>

          {saveResult.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left">
              <p className="text-xs font-bold text-red-700 mb-2">Errors:</p>
              {saveResult.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-red-600">· {e}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-center pt-2">
            <Link
              href="/admin/questions"
              className="px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors"
            >
              View question bank →
            </Link>
            <button
              onClick={() => {
                setStep(1); setExamType(''); setSelectedSubject(null)
                setRawJson(''); setParseResult(null); setTaggedQuestions([])
                setSaveResult(null)
              }}
              className="px-6 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Upload more
            </button>
          </div>
        </div>
      )}
    </div>
  )
}