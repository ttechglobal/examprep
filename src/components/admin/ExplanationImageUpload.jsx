'use client'
// src/components/admin/ExplanationImageUpload.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Upload component for explanation/solution diagrams on questions.
// Mirrors the existing ImageDropZone pattern in questions/upload/page.js
// but scoped to explanation images only.
//
// Usage (in question edit form or upload review step):
//   <ExplanationImageUpload
//     questionText={question.question_text}
//     examType={examType}
//     subjectName={subjectName}
//     questionId={question.id}          // optional — for existing questions
//     currentImageUrl={question.explanation_image_url}
//     onUploaded={(url) => handleExplanationImage(url)}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react'
import { uploadExplanationImage, buildImageImprovementPrompt } from '@/lib/questionImageUpload'

function CopyBox({ text, label }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-[10px] font-black uppercase tracking-wide text-gray-500">{label}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="text-[11px] text-gray-600 px-3 py-2.5 bg-white whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-36">
        {text}
      </pre>
    </div>
  )
}

export default function ExplanationImageUpload({
  questionText,
  examType,
  subjectName,
  questionId,
  currentImageUrl = null,
  onUploaded,         // (url: string | null) => void
}) {
  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploaded,  setUploaded]  = useState(
    currentImageUrl ? { url: currentImageUrl, sizeKb: null, summary: null } : null
  )
  const [error,      setError]      = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const inputRef = useRef()

  const prompt = buildImageImprovementPrompt({
    questionText,
    subjectName,
    examType,
    isExplanation: true,
  })

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setError(null)
    setUploading(true)

    const result = await uploadExplanationImage(file, {
      examType,
      subjectName,
      questionId,
    })

    setUploading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setUploaded({ url: result.url, sizeKb: result.sizeKb, summary: result.summary })
    onUploaded?.(result.url)
  }, [examType, subjectName, questionId, onUploaded])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleRemove = () => {
    setUploaded(null)
    onUploaded?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2.5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">🖼</span>
          <p className="text-xs font-bold text-gray-700">Explanation diagram</p>
          <span className="text-[10px] text-gray-400 font-medium">optional · max 50KB</span>
        </div>
        <button
          type="button"
          onClick={() => setShowPrompt(p => !p)}
          className="text-[11px] text-indigo-600 font-medium hover:underline"
        >
          {showPrompt ? 'Hide AI prompt' : 'Get AI image prompt'}
        </button>
      </div>

      {/* AI prompt copy box */}
      {showPrompt && (
        <CopyBox text={prompt} label="AI Explanation Image Prompt" />
      )}

      {/* Uploaded state */}
      {uploaded ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <img
            src={uploaded.url}
            alt="Explanation diagram"
            className="w-16 h-12 object-cover rounded-lg border border-green-200 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-green-700">Explanation image uploaded ✓</p>
            {uploaded.summary && (
              <p className="text-[11px] text-green-600 mt-0.5">{uploaded.summary}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0"
          >
            Remove
          </button>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl px-4 py-4 text-center cursor-pointer transition-colors
            ${dragging
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-indigo-600 font-medium">Compressing & uploading…</span>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-500">
                Drop explanation diagram here
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                or click to browse · JPG, PNG, WebP · auto-compressed to &lt;50KB
              </p>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}