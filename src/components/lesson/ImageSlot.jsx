'use client'

import { useState, useRef, useCallback } from 'react'
import { uploadLessonImage } from '@/lib/imageUpload'

// ─────────────────────────────────────────────────────────────────────────────
// ImageSlot.jsx
// Two components:
//   StudentImageSlot — clean image display, nothing if no URL
//   AdminImageSlot   — full upload UX with intent badge, objective, prompt copy,
//                      drag-and-drop, auto-compression feedback
// ─────────────────────────────────────────────────────────────────────────────

const INTENT_LABELS = {
  concept_visual:     { label: 'Concept Visual',     color: 'bg-blue-100 text-blue-700' },
  real_life_example:  { label: 'Real-life Example',  color: 'bg-green-100 text-green-700' },
  process_diagram:    { label: 'Process Diagram',    color: 'bg-purple-100 text-purple-700' },
  comparison_visual:  { label: 'Comparison',         color: 'bg-orange-100 text-orange-700' },
  formula_diagram:    { label: 'Formula Diagram',    color: 'bg-gray-800 text-white' },
  intuition_builder:  { label: 'Intuition Builder',  color: 'bg-amber-100 text-amber-700' },
  memory_aid:         { label: 'Memory Aid',         color: 'bg-pink-100 text-pink-700' },
  experiment_visual:  { label: 'Experiment Visual',  color: 'bg-teal-100 text-teal-700' },
}

// ── Student view ──────────────────────────────────────────────────────────────
export function StudentImageSlot({ image }) {
  // Accept either the new image object or a legacy url string
  const url = typeof image === 'string' ? image : image?.url
  if (!url) return null

  return (
    <div className="my-4 rounded-2xl overflow-hidden">
      <img
        src={url}
        alt=""
        className="w-full object-cover max-h-64"
        loading="lazy"
      />
    </div>
  )
}

// ── Copy box ──────────────────────────────────────────────────────────────────
function CopyPromptBox({ prompt }) {
  const [copied, setCopied] = useState(false)
  if (!prompt) return null
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-base border-b border-gray-200">
        <span className="text-[10px] font-black uppercase tracking-wide text-gray-500">
          Image Generation Prompt
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${
            copied ? 'bg-green-100 text-green-700' : 'bg-card border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy prompt'}
        </button>
      </div>
      <p className="text-[11px] text-gray-600 px-3 py-2.5 leading-relaxed font-mono bg-card">
        {prompt}
      </p>
    </div>
  )
}

// ── Admin view ────────────────────────────────────────────────────────────────
export function AdminImageSlot({
  image,           // full image object: { needed, intent_type, learning_objective, prompt, filename, url }
  // Legacy flat props (for backward compat during transition)
  imageUrl,
  imagePrompt,
  // Upload metadata
  subtopicId,
  slideIndex,
  examTag,
  subjectName,
  topicName,
  subtopicName,
  onUpload,        // (imageObj) => void — returns the full updated image object
}) {
  // Resolve from either new image object or legacy flat props
  const resolvedUrl     = image?.url ?? imageUrl ?? null
  const resolvedPrompt  = image?.prompt ?? imagePrompt ?? null
  const intentType      = image?.intent_type ?? null
  const objective       = image?.learning_objective ?? null

  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const [preview, setPreview]     = useState(resolvedUrl)
  const [sizeKb, setSizeKb]       = useState(null)
  const inputRef = useRef(null)

  const intentMeta = INTENT_LABELS[intentType]

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setUploading(true)
    setError(null)
    setSizeKb(null)

    // Immediate local preview
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    const result = await uploadLessonImage(file, {
      subtopicId,
      slideIndex,
      examTag,
      subjectName,
      topicName,
      subtopicName,
      intentType,
    })

    if (result.error) {
      setError(result.error)
      setPreview(resolvedUrl) // revert
      setUploading(false)
      return
    }

    setPreview(result.url)
    setSizeKb(result.sizeKb)
    // Return full updated image object to parent
    onUpload?.({
      ...(image ?? {}),
      url: result.url,
      filename: result.filename,
    })
    // Reset input so the same file can be re-selected if needed
    if (inputRef.current) inputRef.current.value = ''
    setUploading(false)
  }, [subtopicId, slideIndex, examTag, subjectName, topicName, subtopicName, intentType, resolvedUrl, image, onUpload])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleClick = () => inputRef.current?.click()
  const handleInputChange = (e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }

  return (
    <div className="space-y-3 my-2">
      {/* Intent badge + objective */}
      {(intentMeta || objective) && (
        <div className="flex items-start gap-2.5">
          {intentMeta && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${intentMeta.color}`}>
              {intentMeta.label}
            </span>
          )}
          {objective && (
            <p className="text-xs text-gray-500 leading-snug italic">{objective}</p>
          )}
        </div>
      )}

      {/* Single hidden file input — shared by both the Replace button and the drop zone */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Image area */}
      {preview ? (
        <div className="relative group rounded-2xl overflow-hidden">
          <img
            src={preview}
            alt=""
            className="w-full object-cover max-h-64"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-2xl gap-2">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-xs font-bold">Compressing & uploading…</p>
            </div>
          )}
          {sizeKb && !uploading && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {sizeKb}KB
            </div>
          )}
          <button
            type="button"
            onClick={handleClick}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
          >
            Replace
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-200 bg-base hover:border-indigo-300 hover:bg-indigo-50/40'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-indigo-600 font-bold">Compressing & uploading…</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto">
                <span className="text-lg">🖼️</span>
              </div>
              <p className="text-xs font-bold text-gray-600">Drop image here or click to upload</p>
              <p className="text-[10px] text-gray-400">JPG, PNG, WebP · Auto-compressed to under 500KB</p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <p className="text-xs text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Prompt copy box */}
      <CopyPromptBox prompt={resolvedPrompt} />
    </div>
  )
}