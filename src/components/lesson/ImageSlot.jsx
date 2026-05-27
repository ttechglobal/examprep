'use client'

import { useState, useRef, useCallback } from 'react'
import { uploadLessonImage } from '@/lib/imageUpload'

// ── Student view — image or nothing ──────────────────────────
export function StudentImageSlot({ imageUrl }) {
  if (!imageUrl) return null

  return (
    <div className="my-4 rounded-2xl overflow-hidden">
      <img
        src={imageUrl}
        alt=""
        className="w-full object-cover max-h-64"
        loading="lazy"
      />
    </div>
  )
}

// ── Admin view — placeholder + upload ────────────────────────
export function AdminImageSlot({ imageUrl, imagePrompt, subtopicId, sectionIndex, onUpload }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(imageUrl ?? null)
  const inputRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setUploading(true)
    setError(null)

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    const result = await uploadLessonImage(file, subtopicId, sectionIndex)

    if (result.error) {
      setError(result.error)
      setPreview(imageUrl ?? null) // revert
      setUploading(false)
      return
    }

    setPreview(result.url)
    onUpload?.(result.url)
    setUploading(false)
  }, [subtopicId, sectionIndex, imageUrl, onUpload])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleClick = () => inputRef.current?.click()
  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  if (preview) {
    return (
      <div className="my-4 relative group rounded-2xl overflow-hidden">
        <img
          src={preview}
          alt=""
          className="w-full object-cover max-h-64"
        />
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <button
          onClick={handleClick}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
        >
          Replace
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`my-4 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
        dragging
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-indigo-600 font-medium">Uploading...</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto">
            <span className="text-xl">🖼️</span>
          </div>
          <p className="text-xs font-bold text-gray-600">
            Drop image here or click to upload
          </p>
          {imagePrompt && (
            <p className="text-xs text-indigo-600 italic leading-relaxed max-w-xs mx-auto">
              "{imagePrompt}"
            </p>
          )}
          <p className="text-xs text-gray-400">JPG, PNG, WebP · Max 5MB</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2 font-medium">{error}</p>
      )}
    </div>
  )
}