'use client'

// NOTE: MergeReviewUI removed — no more merge flow.
// examType is no longer a separate step; it comes from the selected subject's exam_type.

import { useState, useEffect } from 'react'
import { parseCurriculum, buildCurriculumPrompt } from '@/lib/curriculumParser'
import Link from 'next/link'

const EXAM_STYLE = {
  WAEC:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  JAMB:  { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  IGCSE: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

function ExamBadge({ exam }) {
  if (!exam) return null
  const s = EXAM_STYLE[exam] ?? { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {exam}
    </span>
  )
}

// Steps: Subject → Prompt → Paste → Preview → Done  (Exam step removed)
function StepIndicator({ current }) {
  const steps = ['Subject', 'Prompt', 'Paste', 'Preview', 'Done']
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
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

function CopyBox({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="border border-indigo-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
          AI Curriculum Prompt
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
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

function CurriculumPreview({ data }) {
  const [open, setOpen] = useState(new Set([0]))
  const toggle = i => setOpen(prev => {
    const n = new Set(prev)
    n.has(i) ? n.delete(i) : n.add(i)
    return n
  })

  const tagColors = {
    WAEC: 'bg-blue-100 text-blue-700',
    JAMB: 'bg-purple-100 text-purple-700',
    IGCSE: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {data.topics.map((topic, ti) => (
        <div key={ti} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggle(ti)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
          >
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center flex-shrink-0">
              {ti + 1}
            </span>
            <span className="flex-1 text-sm font-bold text-gray-900">{topic.title ?? topic.name}</span>
            {topic.exam_tag && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColors[String(topic.exam_tag).toUpperCase()] ?? 'bg-gray-100 text-gray-500'}`}>
                {String(topic.exam_tag).toUpperCase()}
              </span>
            )}
            <span className="text-xs text-gray-400">{topic.subtopics?.length ?? 0} subtopics</span>
            <span className={`text-gray-300 text-xs transition-transform ${open.has(ti) ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {open.has(ti) && (
            <div className="border-t border-gray-50 divide-y divide-gray-50">
              {(topic.subtopics ?? []).map((sub, si) => (
                <div key={si} className="px-4 py-2.5 flex items-start gap-2">
                  <span className="text-xs text-gray-300 mt-0.5 flex-shrink-0">{si + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-800">{sub.title ?? sub.name}</p>
                    </div>
                    {(sub.objectives ?? []).length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {sub.objectives.map((obj, oi) => (
                          <li key={oi} className="text-xs text-gray-400 flex gap-1.5">
                            <span className="text-indigo-300 flex-shrink-0">·</span>{obj}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CurriculumUploaderPage() {
  const [step, setStep] = useState(1)
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [rawJson, setRawJson] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveResponse, setSaveResponse] = useState(null)
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearPreview, setClearPreview] = useState(null)
  const [clearing, setClearing] = useState(false)

  // examType is derived directly from the selected subject — no separate step
  const examType = selectedSubject?.exam_type ?? ''

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(data => {
        setSubjects(Array.isArray(data) ? data.filter(s => s.is_active) : [])
        setLoadingSubjects(false)
      })
  }, [])

  useEffect(() => {
    if (rawJson.trim().length > 20) setParseResult(parseCurriculum(rawJson))
    else setParseResult(null)
  }, [rawJson])

  const handleLoadClearPreview = async (subject) => {
    const res = await fetch(`/api/admin/curriculum/clear?subjectId=${subject.id}`)
    const data = await res.json()
    setClearPreview(data)
    setShowClearModal(true)
  }

  const handleClear = async () => {
    if (!selectedSubject) return
    setClearing(true)
    await fetch(`/api/admin/curriculum/clear?subjectId=${selectedSubject.id}`, { method: 'DELETE' })
    setClearing(false)
    setShowClearModal(false)
    setClearPreview(null)
    const res = await fetch('/api/admin/subjects')
    const data = await res.json()
    setSubjects(Array.isArray(data) ? data.filter(s => s.is_active) : [])
    const updated = data.find(s => s.id === selectedSubject.id)
    if (updated) setSelectedSubject({ ...updated, subtopic_count: 0 })
  }

  const handleSave = async () => {
    if (!parseResult?.valid || !selectedSubject || !examType) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubject.id,
          examType,
          topics: parseResult.data.topics,
          replaceExisting,
        }),
      })
      const data = await res.json()
      setSaveResponse(data)
      setStep(5)
    } catch {
      setSaveResponse({ status: 'error', message: 'Network error — try again' })
      setStep(5)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setStep(1); setSelectedSubject(null)
    setRawJson(''); setParseResult(null); setSaveResponse(null)
    setReplaceExisting(false)
  }

  const prompt = selectedSubject && examType
    ? buildCurriculumPrompt(selectedSubject.name, examType)
    : ''

  return (
    <div className="max-w-3xl">

      {/* Clear modal */}
      {showClearModal && clearPreview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-black text-gray-900">Clear curriculum?</h3>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
              <p className="text-sm font-bold text-red-800">This will permanently delete:</p>
              <p className="text-sm text-red-700">· {clearPreview.topicCount} topics</p>
              <p className="text-sm text-red-700">· {clearPreview.subtopicCount} subtopics</p>
            </div>
            <p className="text-xs text-gray-500">
              This cannot be undone. The subject record will remain but all curriculum content will be cleared.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowClearModal(false); setClearPreview(null) }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {clearing ? 'Clearing...' : 'Yes, clear everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/curriculum" className="text-gray-400 hover:text-gray-600 text-sm">← Curriculum</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Upload Curriculum</h1>
      </div>

      <StepIndicator current={step} />

      {/* ── STEP 1: Subject ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Select a subject</h2>
            <p className="text-sm text-gray-500">The exam type is set on the subject. Pick a subject to continue.</p>
          </div>

          {loadingSubjects ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {subjects.map(subject => (
                <div
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 cursor-pointer transition-colors ${
                    selectedSubject?.id === subject.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold ${selectedSubject?.id === subject.id ? 'text-indigo-800' : 'text-gray-900'}`}>
                        {subject.name}
                      </p>
                      <ExamBadge exam={subject.exam_type} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {subject.topic_count ?? 0} topics · {subject.subtopic_count ?? 0} subtopics
                    </p>
                  </div>

                  {/* Clear button — only shown when selected and has content */}
                  {(subject.topic_count ?? 0) > 0 && selectedSubject?.id === subject.id && (
                    <button
                      onClick={e => { e.stopPropagation(); handleLoadClearPreview(subject) }}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 font-medium transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Replace existing toggle */}
          <div
            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors cursor-pointer ${
              replaceExisting ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'
            }`}
            onClick={() => setReplaceExisting(r => !r)}
          >
            <div>
              <p className="text-sm font-bold text-gray-800">Replace existing content</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {replaceExisting
                  ? 'Existing topics and subtopics will be overwritten'
                  : 'Existing topics and subtopics will be skipped (default)'}
              </p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
              replaceExisting ? 'bg-amber-500' : 'bg-gray-200'
            }`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                replaceExisting ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Subject not listed?{' '}
            <Link href="/admin/subjects-manager" className="text-indigo-600 hover:underline font-medium">
              Add it in Subjects Manager →
            </Link>
          </p>

          <button
            onClick={() => setStep(2)}
            disabled={!selectedSubject}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Continue with {selectedSubject ? `${selectedSubject.name} (${examType})` : '...'} →
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
                {selectedSubject?.name} <ExamBadge exam={examType} />
              </p>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-600 mb-2">Instructions:</p>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Copy the prompt below</li>
              <li>Open Claude.ai or Gemini</li>
              <li>Paste the prompt and attach the official syllabus PDF</li>
              <li>Copy the returned JSON → paste in the next step</li>
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
              <h2 className="text-lg font-black text-gray-900 mb-1">Paste the curriculum JSON</h2>
              <p className="text-sm text-gray-500">Paste exactly what Claude or Gemini returned.</p>
            </div>
            <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <textarea
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            rows={16}
            className="w-full font-mono text-xs p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder='Paste the JSON here...'
            spellCheck={false}
          />

          {parseResult && (
            <div className={`p-3 rounded-xl text-sm ${
              parseResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {parseResult.valid ? (
                <div className="text-green-800">
                  <p className="font-bold">✓ Valid JSON</p>
                  <p className="text-xs mt-0.5 text-green-600">
                    {parseResult.stats.topicCount} topics · {parseResult.stats.subtopicCount} subtopics
                  </p>
                </div>
              ) : (
                <div className="text-red-800">
                  <p className="font-bold">{parseResult.errors.length} error(s)</p>
                  <ul className="mt-1 space-y-0.5 max-h-28 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-700">· {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setStep(4)}
            disabled={!parseResult?.valid}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Preview ({parseResult?.stats?.topicCount ?? 0} topics) →
          </button>
        </div>
      )}

      {/* ── STEP 4: Preview ── */}
      {step === 4 && parseResult?.valid && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Preview</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                {selectedSubject?.name}
                <ExamBadge exam={examType} />
                · {parseResult.stats.topicCount} topics · {parseResult.stats.subtopicCount} subtopics
              </p>
            </div>
            <button onClick={() => setStep(3)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <CurriculumPreview data={parseResult.data} />

          {replaceExisting && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-amber-800">
                ⚠️ Replace mode is ON — existing topics and subtopics will be overwritten.
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-green-600 text-white text-sm font-black rounded-2xl disabled:opacity-50 hover:bg-green-500 transition-colors"
          >
            {saving ? 'Saving...' : `Save ${parseResult.stats.subtopicCount} subtopics →`}
          </button>
        </div>
      )}

      {/* ── STEP 5: Done ── */}
      {step === 5 && saveResponse && (
        <div className="space-y-4 py-4">
          <div className="text-center">
            <div className="text-5xl mb-3">
              {saveResponse.status === 'error' ? '❌' : saveResponse.hasErrors ? '⚠️' : '✅'}
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-1">
              {saveResponse.status === 'error'
                ? 'Something went wrong'
                : `${selectedSubject?.name} (${examType}) saved!`}
            </h2>
            {saveResponse.status === 'error' && (
              <p className="text-sm text-red-600">{saveResponse.message}</p>
            )}
          </div>

          {saveResponse.status !== 'error' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold text-gray-700">Upload summary</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-green-700">{saveResponse.topics_created ?? 0}</p>
                  <p className="text-green-600">Topics saved</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-indigo-700">{saveResponse.subtopics_created ?? 0}</p>
                  <p className="text-indigo-600">Subtopics saved</p>
                </div>
                {(saveResponse.topics_skipped ?? 0) > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-gray-500">{saveResponse.topics_skipped}</p>
                    <p className="text-gray-400">Topics already existed (skipped)</p>
                  </div>
                )}
                {(saveResponse.subtopics_skipped ?? 0) > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-gray-500">{saveResponse.subtopics_skipped}</p>
                    <p className="text-gray-400">Subtopics already existed (skipped)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Failed topics */}
          {saveResponse.failed_topics?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold text-red-800">
                {saveResponse.failed_topics.length} topic{saveResponse.failed_topics.length > 1 ? 's' : ''} failed:
              </p>
              {saveResponse.failed_topics.map((t, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-gray-800">{t.title}</p>
                    <p className="text-xs text-red-500">{t.reason}</p>
                  </div>
                  <Link
                    href={`/admin/curriculum/${selectedSubject?.slug}`}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Fix →
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Other errors */}
          {saveResponse.errors?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-1">Warnings:</p>
              <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                {saveResponse.errors.map((err, i) => (
                  <li key={i} className="text-xs text-amber-600">· {err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href={`/admin/curriculum/${selectedSubject?.slug}`}
              className="flex-1 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl text-center hover:bg-indigo-500 transition-colors"
            >
              View topic tree →
            </Link>
            <button
              onClick={reset}
              className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Upload another
            </button>
          </div>
        </div>
      )}

    </div>
  )
}