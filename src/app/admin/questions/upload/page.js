'use client'
// src/app/admin/questions/upload/page.js

import { useState, useEffect, useCallback, useRef } from 'react'
import { parseQuestions, buildQuestionPrompt, matchTopicSubtopic, questionHasImage } from '@/lib/questionParser'
import { uploadQuestionImage, buildImageImprovementPrompt } from '@/lib/questionImageUpload'
import QuestionStudentPreview from '@/components/admin/QuestionStudentPreview'
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
      display: 'inline-block',
    }}>
      {exam}
    </span>
  )
}

const CONFIDENCE_BADGE = (conf, hasMapping) => {
  if (!hasMapping) return { label: 'Untagged', cls: 'bg-red-100 text-red-700' }
  if (conf >= 0.7)  return { label: `${Math.round(conf * 100)}% match`, cls: 'bg-green-100 text-green-700' }
  return { label: `${Math.round(conf * 100)}% match — review`, cls: 'bg-amber-100 text-amber-700' }
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = ['Context', 'Prompt', 'Paste', 'Tag Review', 'Preview', 'Save']
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
              i + 1 < current  ? 'bg-green-500 text-white'  :
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

// ── Copyable prompt box ───────────────────────────────────────────────────────
function CopyBox({ text, label = 'AI Question Extraction Prompt' }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="border border-indigo-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">{label}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
            copied ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'
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

// ── Image drop zone (inline, per question) ────────────────────────────────────
function ImageDropZone({ question, examType, subjectName, questionIndex, onImageUploaded }) {
  const [dragging,      setDragging]  = useState(false)
  const [uploading,     setUploading] = useState(false)
  const [uploadedImage, setUploaded]  = useState(
    question.image_url ? { url: question.image_url, sizeKb: null } : null
  )
  const [error,       setError]       = useState(null)
  const [showPrompt,  setShowPrompt]  = useState(false)
  const inputRef = useRef()

  const imagePrompt = buildImageImprovementPrompt({
    questionText: question.question_text,
    subjectName,
    examType,
  })

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setError(null)
    setUploading(true)
    const result = await uploadQuestionImage(file, { examType, subjectName, questionIndex })
    setUploading(false)
    if (result.error) { setError(result.error); return }
    setUploaded({ url: result.url, sizeKb: result.sizeKb })
    onImageUploaded(result.url)
  }, [examType, subjectName, questionIndex, onImageUploaded])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-violet-700">🖼 Image required for this question</p>
        <button
          onClick={() => setShowPrompt(p => !p)}
          className="text-xs text-violet-600 underline hover:text-violet-800"
        >
          {showPrompt ? 'Hide prompt' : 'Copy AI image prompt'}
        </button>
      </div>

      {showPrompt && <CopyBox text={imagePrompt} label="AI Image Improvement Prompt" />}

      {uploadedImage ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <img
            src={uploadedImage.url}
            alt="Question diagram"
            className="w-16 h-12 object-cover rounded-lg border border-green-200 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-green-700">Image uploaded ✓</p>
            {uploadedImage.sizeKb && <p className="text-xs text-green-600">{uploadedImage.sizeKb} KB</p>}
          </div>
          <button
            onClick={() => { setUploaded(null); onImageUploaded(null) }}
            className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-colors ${
            dragging ? 'border-violet-400 bg-violet-50' : 'border-gray-300 hover:border-violet-400 hover:bg-violet-50/50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-violet-600 font-medium">Compressing & uploading…</span>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-500">Drop image here</p>
              <p className="text-xs text-gray-400 mt-0.5">or click to browse · JPG, PNG, WebP · compressed to &lt;100KB</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 font-medium">⚠ {error}</p>}
    </div>
  )
}

// ── Question preview card (tag review step 4) ─────────────────────────────────
function QuestionPreviewCard({ question, topics, examType, subjectName, onUpdateMapping, onRemove, onImageUploaded }) {
  const [expanded, setExpanded] = useState(
    !question.subtopic_id || question._needsReview
  )
  const [selectedTopicId,    setTopicId] = useState(question.topic_id    ?? '')
  const [selectedSubtopicId, setSubId]  = useState(question.subtopic_id ?? '')

  const subtopics = topics.find(t => t.id === selectedTopicId)?.subtopics ?? []
  const isImage   = question._hasImage
  const badge     = CONFIDENCE_BADGE(question._matchConfidence ?? 0, !!question.subtopic_id)
  const suggestions = question._suggestions ?? []

  const handleTopicChange = (topicId) => {
    setTopicId(topicId)
    setSubId('')
    onUpdateMapping(question._index, { topic_id: topicId, subtopic_id: null })
  }

  const handleSubtopicChange = (subId) => {
    setSubId(subId)
    onUpdateMapping(question._index, { topic_id: selectedTopicId, subtopic_id: subId })
  }

  const handleSuggestionClick = (suggestion) => {
    setTopicId(suggestion.topic.id)
    setSubId(suggestion.subtopic.id)
    onUpdateMapping(question._index, {
      topic_id:    suggestion.topic.id,
      subtopic_id: suggestion.subtopic.id,
    })
  }

  const currentSubtopicName = topics
    .flatMap(t => t.subtopics ?? [])
    .find(s => s.id === selectedSubtopicId)?.name ?? ''
  const currentTopicName = topics.find(t => t.id === selectedTopicId)?.name ?? ''

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-colors ${
      !question.subtopic_id ? 'border-red-200' : question._needsReview ? 'border-amber-200' : 'border-gray-200'
    }`}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xs font-black text-gray-400 flex-shrink-0 mt-0.5 w-6">
          {question._index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
            {question.question_text}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
            {question.subtopic_id && (
              <span className="text-[10px] text-gray-500 truncate max-w-[200px]">
                {currentTopicName} → {currentSubtopicName}
              </span>
            )}
            {isImage && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                question.image_url ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {question.image_url ? '🖼 Image ✓' : '🖼 Image needed'}
              </span>
            )}
            {question.passage_text && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                📄 Passage
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onRemove(question._index) }}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
          <span className="text-gray-300 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">

          {/* AI suggested label */}
          {(question._aiTopicTitle || question._aiSubtopicTitle) && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold text-indigo-500 uppercase mb-0.5">AI suggested</p>
              <p className="text-xs text-indigo-800 font-medium">
                {question._aiTopicTitle}
                {question._aiTopicTitle && question._aiSubtopicTitle && ' → '}
                {question._aiSubtopicTitle}
              </p>
            </div>
          )}

          {/* One-click suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Top matches — click to apply</p>
              <div className="flex flex-col gap-1.5">
                {suggestions.map((s, i) => {
                  const isSelected = selectedSubtopicId === s.subtopic.id
                  const pct = Math.round(s.score * 100)
                  return (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-colors ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{s.label}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 65 ? 'bg-green-400' : pct >= 35 ? 'bg-amber-400' : 'bg-gray-300'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold ${pct >= 65 ? 'text-green-600' : pct >= 35 ? 'text-amber-600' : 'text-gray-400'}`}>
                            {pct}%
                          </span>
                          {isSelected && <span className="text-indigo-500 text-[10px] font-black">✓</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Manual override dropdowns */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Manual override</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Topic</label>
                <select
                  value={selectedTopicId}
                  onChange={e => handleTopicChange(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">Select topic…</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Subtopic</label>
                <select
                  value={selectedSubtopicId}
                  onChange={e => handleSubtopicChange(e.target.value)}
                  disabled={!selectedTopicId}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-300 bg-white"
                >
                  <option value="">Select subtopic…</option>
                  {subtopics.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isImage && (
            <ImageDropZone
              question={question}
              examType={examType}
              subjectName={subjectName}
              questionIndex={question._index}
              onImageUploaded={(url) => onImageUploaded(question._index, url)}
            />
          )}

          {question.explanation?.correct && (
            <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-0.5">Explanation</p>
              <p className="text-xs text-gray-600 leading-relaxed">{question.explanation.correct}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuestionUploadPage() {
  const [step,             setStep]             = useState(1)
  const [examType,         setExamType]         = useState('')
  const [uploadYear,       setUploadYear]       = useState('')
  const [subjects,         setSubjects]         = useState([])
  const [selectedSubject,  setSelectedSubject]  = useState(null)
  const [rawJson,          setRawJson]          = useState('')
  const [parseResult,      setParseResult]      = useState(null)
  const [taggedQuestions,  setTaggedQuestions]  = useState([])
  const [topics,           setTopics]           = useState([])
  const [loadingTopics,    setLoadingTopics]    = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [saveResult,       setSaveResult]       = useState(null)

  // ── FIX: Reload and filter subjects whenever examType changes ──────────────
  // Previously subjects loaded once on mount with no exam filter, causing
  // WAEC subjects to appear when JAMB was selected (and vice versa).
  useEffect(() => {
    if (!examType) {
      setSubjects([])
      setSelectedSubject(null)
      return
    }
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(data => {
        const filtered = Array.isArray(data)
          ? data.filter(s => s.is_active && s.exam_type === examType)
          : []
        setSubjects(filtered)
        setSelectedSubject(null) // clear stale selection when exam changes
      })
  }, [examType])

  useEffect(() => {
    if (rawJson.trim().length > 10) {
      setParseResult(parseQuestions(rawJson))
    } else {
      setParseResult(null)
    }
  }, [rawJson])

  const loadTopics = async (subjectId) => {
    setLoadingTopics(true)
    const res  = await fetch(`/api/admin/curriculum?subjectId=${subjectId}`)
    const data = await res.json()
    setTopics(Array.isArray(data) ? data : [])
    setLoadingTopics(false)
    return Array.isArray(data) ? data : []
  }

  const handleProceedToTagging = async () => {
    if (!parseResult?.questions?.length) return
    const loadedTopics = topics.length > 0 ? topics : await loadTopics(selectedSubject.id)

    const tagged = parseResult.questions.map((q, i) => {
      const match    = matchTopicSubtopic(q, loadedTopics)
      const hasImage = questionHasImage(q)
      return {
        ...q,
        _index:           i,
        _hasImage:        hasImage,
        passage_text:       q.passage_text      ?? null,
        passage_image_url:  q.passage_image_url ?? null,
        topic_id:           match.topic?.id    ?? null,
        subtopic_id:        match.subtopic?.id ?? null,
        _needsReview:       match.needsReview,
        _matchConfidence:   match.confidence,
        _suggestions:       match.suggestions  ?? [],
        _aiTopicTitle:      match.aiTopicTitle  ?? '',
        _aiSubtopicTitle:   match.aiSubtopicTitle ?? '',
      }
    })

    setTaggedQuestions(tagged)
    setStep(4)
  }

  const handleUpdateMapping = (index, { topic_id, subtopic_id }) => {
    setTaggedQuestions(prev => prev.map(q =>
      q._index === index ? { ...q, topic_id, subtopic_id, _needsReview: false } : q
    ))
  }

  const handleRemoveQuestion = (index) => {
    setTaggedQuestions(prev => prev.filter(q => q._index !== index))
  }

  const handleImageUploaded = (index, url) => {
    setTaggedQuestions(prev => prev.map(q =>
      q._index === index ? { ...q, image_url: url, has_image: !!url } : q
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const batchRes = await fetch('/api/admin/questions/batch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          examType,
          subjectId: selectedSubject.id,
          total:     taggedQuestions.length,
        }),
      })
      const batch = await batchRes.json()

      const res = await fetch('/api/admin/questions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          questions: taggedQuestions.map(q => ({ ...q, year: q.year || uploadYear || null })),
          examType,
          subjectId: selectedSubject.id,
          batchId:   batch.id,
          defaultYear: uploadYear || null,
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
  const missingImages = taggedQuestions.filter(q => q._hasImage && !q.image_url).length
  const canProceed    = untaggedCount === 0 && missingImages === 0

  const prompt = selectedSubject && examType
    ? buildQuestionPrompt(examType, selectedSubject.name)
    : ''

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/questions" className="text-sm text-gray-400 hover:text-gray-600">← Questions</Link>
        <h1 className="text-2xl font-black text-gray-900 mt-2">Upload Questions</h1>
        <p className="text-sm text-gray-500 mt-1">Bulk-upload past paper questions via AI extraction.</p>
      </div>

      <StepIndicator current={step} />

      {/* ── STEP 1: Context ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-lg font-black text-gray-900">Select exam and subject</h2>

          {/* Exam selector */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Exam</label>
            <div className="grid grid-cols-3 gap-3">
              {['WAEC', 'JAMB', 'IGCSE'].map(e => (
                <button
                  key={e}
                  onClick={() => setExamType(e)}
                  className={`py-3 rounded-2xl border-2 text-sm font-black transition-colors ${
                    examType === e
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Subject selector — only shown after exam is picked, filtered to match */}
          {examType && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Subject
                <span className="ml-2 font-normal text-xs text-gray-400">
                  — showing {examType} subjects only
                </span>
              </label>
              {subjects.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl">
                  <p className="text-sm text-gray-500">No {examType} subjects found.</p>
                  <Link href="/admin/subjects-manager" className="text-xs text-indigo-600 hover:underline mt-1 block">
                    Add subjects in Subjects Manager →
                  </Link>
                </div>
              ) : (
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
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${
                          selectedSubject?.id === s.id ? 'text-indigo-700' : 'text-gray-700'
                        }`}>
                          {s.name}
                        </span>
                        <ExamBadge exam={s.exam_type} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{s.question_count ?? 0} questions</span>
                        {selectedSubject?.id === s.id && (
                          <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Year selector */}
          {selectedSubject && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Year <span className="text-gray-400 font-normal text-xs">— which exam year is this batch from?</span>
              </label>
              <select
                value={uploadYear}
                onChange={e => setUploadYear(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="">Mixed / Unknown</option>
                {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!examType || !selectedSubject}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2: Prompt ──────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Copy the AI prompt</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                {selectedSubject?.name} <ExamBadge exam={examType} />
                — paste into Claude or Gemini with your PDF.
              </p>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <CopyBox text={prompt} />

          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <p className="text-sm font-bold text-amber-800 mb-1">Tips for best results</p>
            <ul className="space-y-1">
              {[
                'Copy the full prompt above, then paste your PDF text or screenshot after it.',
                'If questions have diagrams, use the image upload option in Claude/Gemini.',
                'The AI returns a JSON array — copy the entire JSON response.',
                'Questions with diagrams will prompt you to upload images in the next step.',
              ].map((tip, i) => (
                <li key={i} className="text-xs text-amber-700 flex gap-1.5">
                  <span className="flex-shrink-0">·</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors"
          >
            I've got the JSON →
          </button>
        </div>
      )}

      {/* ── STEP 3: Paste JSON ──────────────────────────────────────────────── */}
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
              parseResult.valid
                ? 'bg-green-50 border border-green-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              {parseResult.valid ? (
                <div>
                  <p className="font-bold text-green-800">
                    ✓ {parseResult.stats?.total} questions detected
                    {parseResult.stats?.withWorkings > 0 && ` · ${parseResult.stats.withWorkings} with workings`}
                    {parseResult.stats?.withImages > 0 && ` · ${parseResult.stats.withImages} with images`}
                    {parseResult.stats?.withPassage > 0 && ` · ${parseResult.stats.withPassage} with shared passage`}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-amber-800">{parseResult.errors.length} error(s) found</p>
                  <ul className="mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                    {parseResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="text-xs text-amber-700">· {err}</li>
                    ))}
                    {parseResult.errors.length > 5 && (
                      <li className="text-xs text-amber-600">+{parseResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleProceedToTagging}
            disabled={!parseResult?.valid || parseResult.questions.length === 0}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Review topic tagging ({parseResult?.questions?.length ?? 0} questions) →
          </button>
        </div>
      )}

      {/* ── STEP 4: Tag Review ──────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Review topic tagging</h2>
              <p className="text-sm text-gray-500">
                {taggedQuestions.filter(q => q.subtopic_id && !q._needsReview).length} auto-tagged ·{' '}
                {taggedQuestions.filter(q => q._needsReview).length} need review ·{' '}
                {taggedQuestions.filter(q => !q.subtopic_id).length} untagged
              </p>
            </div>
            <button onClick={() => setStep(3)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          {missingImages > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-violet-800">
                {missingImages} question{missingImages > 1 ? 's' : ''} need images
              </p>
              <p className="text-xs text-violet-600 mt-0.5">Expand each flagged question to upload the diagram.</p>
            </div>
          )}

          {untaggedCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-red-800">
                {untaggedCount} question{untaggedCount > 1 ? 's' : ''} have no topic mapping
              </p>
              <p className="text-xs text-red-600 mt-0.5">All questions must be tagged before saving.</p>
            </div>
          )}

          {loadingTopics ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {taggedQuestions.map(q => (
                <QuestionPreviewCard
                  key={q._index}
                  question={q}
                  topics={topics}
                  examType={examType}
                  subjectName={selectedSubject?.name}
                  onUpdateMapping={handleUpdateMapping}
                  onRemove={handleRemoveQuestion}
                  onImageUploaded={handleImageUploaded}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => setStep(5)}
            disabled={!canProceed || taggedQuestions.length === 0}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Preview {taggedQuestions.length} questions →
          </button>
        </div>
      )}

      {/* ── STEP 5: Preview ─────────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">Preview</h2>
              <p className="text-sm text-gray-500">
                This is exactly what students will see. Check every question before saving.
              </p>
            </div>
            <button onClick={() => setStep(4)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          </div>

          <div className="space-y-8">
            {taggedQuestions.map((q, i) => {
              const topicName    = topics.find(t => t.id === q.topic_id)?.name ?? '—'
              const subtopicName = topics.flatMap(t => t.subtopics ?? []).find(s => s.id === q.subtopic_id)?.name ?? '—'

              return (
                <div key={q._index} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 flex-wrap px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <span className="text-xs font-black text-gray-400">Q{i + 1}</span>
                    <span className="text-xs text-gray-500">{topicName}</span>
                    <span className="text-gray-300 text-xs">→</span>
                    <span className="text-xs text-gray-600 font-medium">{subtopicName}</span>
                    {q.year && <span className="text-xs text-gray-400 ml-auto">{q.year}</span>}
                  </div>
                  <div className="p-4 bg-white">
                    <QuestionStudentPreview question={q} showRawTab={true} />
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-green-600 text-white text-base font-black rounded-2xl disabled:opacity-50 hover:bg-green-500 transition-colors shadow-lg shadow-green-200"
          >
            {saving ? 'Saving…' : `Save ${taggedQuestions.length} questions →`}
          </button>
        </div>
      )}

      {/* ── STEP 6: Done ────────────────────────────────────────────────────── */}
      {step === 6 && saveResult && (
        <div className="text-center space-y-4 py-6">
          <div className="text-5xl">{saveResult.errors?.length > 0 ? '⚠️' : '🎉'}</div>
          <h2 className="text-2xl font-black text-gray-900">
            {saveResult.errors?.length > 0 ? 'Saved with some errors' : 'Questions saved!'}
          </h2>
          <p className="text-gray-500">
            {saveResult.saved} question{saveResult.saved !== 1 ? 's' : ''} added to the question bank for{' '}
            {selectedSubject?.name}.
          </p>

          {saveResult.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-left">
              <p className="text-sm font-bold text-red-800 mb-1">Errors</p>
              <ul className="space-y-0.5">
                {saveResult.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-700">· {err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep(1)
                setExamType('')
                setRawJson('')
                setParseResult(null)
                setTaggedQuestions([])
                setSaveResult(null)
              }}
              className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Upload another batch
            </button>
            <Link
              href="/admin/questions"
              className="flex-1 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors text-center"
            >
              View question bank →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}