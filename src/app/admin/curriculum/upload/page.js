'use client'

import { useState, useEffect } from 'react'
import { parseCurriculum, buildCurriculumPrompt } from '@/lib/curriculumParser'
import MergeReviewUI from '@/components/admin/MergeReviewUI'
import Link from 'next/link'

const STEP_LABELS = [
  'Select subject',
  'Select exam',
  'Get AI prompt',
  'Paste JSON',
  'Preview & save',
]

function StepIndicator({ current }) {
  return (
    <div className="flex items-center mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
              i + 1 < current ? 'bg-green-500 text-white' :
              i + 1 === current ? 'bg-indigo-600 text-white' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i + 1 < current ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] mt-1 text-center hidden sm:block whitespace-nowrap ${
              i + 1 === current ? 'text-indigo-600 font-bold' : 'text-gray-400'
            }`}>{label}</span>
          </div>
          {i < STEP_LABELS.length - 1 && (
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
      <pre className="text-xs text-gray-700 p-4 bg-white overflow-auto max-h-56 whitespace-pre-wrap font-mono leading-relaxed">
        {text}
      </pre>
    </div>
  )
}

function CurriculumPreview({ data }) {
  const [open, setOpen] = useState(new Set([0]))
  const toggle = i => setOpen(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  const tagColors = {
    WAEC: 'bg-blue-100 text-blue-700', waec: 'bg-blue-100 text-blue-700',
    JAMB: 'bg-purple-100 text-purple-700', jamb: 'bg-purple-100 text-purple-700',
    BOTH: 'bg-indigo-100 text-indigo-700', both: 'bg-indigo-100 text-indigo-700',
  }
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {data.topics.map((topic, ti) => (
        <div key={ti} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggle(ti)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
          >
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center flex-shrink-0">{ti + 1}</span>
            <span className="flex-1 text-sm font-bold text-gray-900">{topic.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColors[topic.exam_tag] ?? 'bg-gray-100 text-gray-500'}`}>
              {String(topic.exam_tag).toUpperCase()}
            </span>
            <span className="text-xs text-gray-400">{topic.subtopics?.length ?? 0} subtopics</span>
            <span className={`text-gray-300 text-xs ${open.has(ti) ? 'rotate-180' : ''} transition-transform`}>▼</span>
          </button>
          {open.has(ti) && (
            <div className="border-t border-gray-50 divide-y divide-gray-50">
              {(topic.subtopics ?? []).map((sub, si) => (
                <div key={si} className="px-4 py-2.5 flex items-start gap-2">
                  <span className="text-xs text-gray-300 mt-0.5 flex-shrink-0">{si + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-800">{sub.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${tagColors[sub.exam_tag] ?? 'bg-gray-100 text-gray-500'}`}>
                        {String(sub.exam_tag).toUpperCase()}
                      </span>
                    </div>
                    {sub.objectives?.length > 0 && (
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
  const [examType, setExamType] = useState('')
  const [rawJson, setRawJson] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveResponse, setSaveResponse] = useState(null)
  const [loadingSubjects, setLoadingSubjects] = useState(true)

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(data => { setSubjects(data); setLoadingSubjects(false) })
  }, [])

  useEffect(() => {
    if (rawJson.trim().length > 20) setParseResult(parseCurriculum(rawJson))
    else setParseResult(null)
  }, [rawJson])

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
        }),
      })
      const data = await res.json()
      setSaveResponse(data)
      setStep(6) // Done / merge review
    } catch {
      setSaveResponse({ status: 'error', message: 'Network error — try again' })
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setStep(1); setSelectedSubject(null); setExamType('')
    setRawJson(''); setParseResult(null); setSaveResponse(null)
  }

  const prompt = selectedSubject && examType
    ? buildCurriculumPrompt(selectedSubject.name, examType)
    : ''

  // ── MERGE REVIEW ──
  if (step === 6 && saveResponse?.status === 'merge_ready') {
    return (
      <MergeReviewUI
        subjectId={selectedSubject.id}
        subjectName={saveResponse.subjectName ?? selectedSubject.name}
        mergeResult={saveResponse.mergeResult}
        affectedLessons={saveResponse.affectedLessons ?? 0}
        onDone={reset}
      />
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Upload Curriculum</h1>
      </div>

      <StepIndicator current={step} />

      {/* ── STEP 1: Select subject ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-1">Select a subject</h2>
            <p className="text-sm text-gray-500">Which subject are you uploading curriculum for?</p>
          </div>

          {loadingSubjects ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {subjects.filter(s => s.is_active).map(subject => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-left transition-colors ${
                    selectedSubject?.id === subject.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-bold ${selectedSubject?.id === subject.id ? 'text-indigo-800' : 'text-gray-900'}`}>
                      {subject.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {subject.waec_uploaded && (
                        <span className="text-xs text-blue-600 font-medium">WAEC ✓</span>
                      )}
                      {subject.jamb_uploaded && (
                        <span className="text-xs text-purple-600 font-medium">JAMB ✓</span>
                      )}
                      {subject.merged && (
                        <span className="text-xs text-green-600 font-medium">Merged ✓</span>
                      )}
                      {!subject.waec_uploaded && !subject.jamb_uploaded && (
                        <span className="text-xs text-gray-400">No curriculum yet</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    subject.exam_type === 'WAEC' ? 'bg-blue-100 text-blue-700' :
                    subject.exam_type === 'JAMB' ? 'bg-purple-100 text-purple-700' :
                    'bg-indigo-100 text-indigo-700'
                  }`}>{subject.exam_type}</span>
                </button>
              ))}
            </div>
          )}

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
            Continue with {selectedSubject?.name ?? '...'} →
          </button>
        </div>
      )}

      {/* ── STEP 2: Select exam ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Which exam syllabus?</h2>
              <p className="text-sm text-gray-500">
                Upload one exam at a time. If both exist, the system will auto-merge them.
              </p>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'WAEC', desc: 'Official WAEC syllabus', uploaded: selectedSubject?.waec_uploaded },
              { value: 'JAMB', desc: 'Official JAMB syllabus', uploaded: selectedSubject?.jamb_uploaded },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setExamType(opt.value)}
                className={`p-4 rounded-2xl border-2 text-left transition-colors ${
                  examType === opt.value
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className={`font-black text-lg ${examType === opt.value ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {opt.value}
                  </p>
                  {opt.uploaded && (
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      Uploaded
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{opt.desc}</p>
                {opt.uploaded && (
                  <p className="text-xs text-amber-600 mt-1">Re-uploading will replace existing content</p>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(3)}
            disabled={!examType}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Continue with {examType || '...'} →
          </button>
        </div>
      )}

      {/* ── STEP 3: Get AI prompt ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Copy the AI prompt</h2>
              <p className="text-sm text-gray-500">
                Paste this into Claude or Gemini alongside the official syllabus PDF.
              </p>
            </div>
            <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <p className="text-sm font-bold text-indigo-800">
                {selectedSubject?.name} — {examType}
              </p>
              <p className="text-xs text-indigo-600">Prompt pre-filled with your selections</p>
            </div>
          </div>

          <CopyBox text={prompt} />

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-600 mb-2">Instructions:</p>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Copy the prompt above</li>
              <li>Open Claude.ai or Gemini</li>
              <li>Paste the prompt and attach the official {examType} syllabus PDF for {selectedSubject?.name}</li>
              <li>Copy the returned JSON and paste it in the next step</li>
            </ol>
          </div>

          <button
            onClick={() => setStep(4)}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors"
          >
            I have the JSON →
          </button>
        </div>
      )}

      {/* ── STEP 4: Paste JSON ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Paste the curriculum JSON</h2>
              <p className="text-sm text-gray-500">Paste exactly what Claude or Gemini returned.</p>
            </div>
            <button onClick={() => setStep(3)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
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
            onClick={() => setStep(5)}
            disabled={!parseResult?.valid}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Preview →
          </button>
        </div>
      )}

      {/* ── STEP 5: Preview & save ── */}
      {step === 5 && parseResult?.valid && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Preview</h2>
              <p className="text-sm text-gray-500">
                {selectedSubject?.name} — {examType} ·{' '}
                {parseResult.stats.topicCount} topics · {parseResult.stats.subtopicCount} subtopics
              </p>
            </div>
            <button onClick={() => setStep(4)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <CurriculumPreview data={parseResult.data} />

          {/* Merge warning */}
          {(selectedSubject?.waec_uploaded || selectedSubject?.jamb_uploaded) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-700">
                <span className="font-bold">
                  {examType === 'WAEC' && selectedSubject?.jamb_uploaded && '⚡ Both WAEC and JAMB will now be merged automatically.'}
                  {examType === 'JAMB' && selectedSubject?.waec_uploaded && '⚡ Both WAEC and JAMB will now be merged automatically.'}
                  {examType === 'WAEC' && !selectedSubject?.jamb_uploaded && 'WAEC curriculum will be saved. Upload JAMB later to trigger auto-merge.'}
                  {examType === 'JAMB' && !selectedSubject?.waec_uploaded && 'JAMB curriculum will be saved. Upload WAEC later to trigger auto-merge.'}
                </span>
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-green-600 text-white text-sm font-black rounded-xl disabled:opacity-50 hover:bg-green-500 transition-colors"
          >
            {saving ? 'Saving...' : `Save ${examType} curriculum →`}
          </button>
        </div>
      )}

      {/* ── STEP 6: Single exam saved ── */}
      {step === 6 && saveResponse?.status === 'saved_single' && (
        <div className="text-center space-y-4 py-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-black text-gray-900">
            {examType} curriculum saved!
          </h2>
          <p className="text-gray-500 text-sm">
            {saveResponse.topics_created} topics and {saveResponse.subtopics_created} subtopics saved.
            {examType === 'WAEC'
              ? ' Upload the JAMB curriculum to trigger auto-merge.'
              : ' Upload the WAEC curriculum to trigger auto-merge.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/admin/curriculum/${selectedSubject?.slug}`}
              className="px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors"
            >
              View curriculum →
            </Link>
            <button
              onClick={reset}
              className="px-6 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Upload another
            </button>
          </div>
        </div>
      )}

    </div>
  )
}