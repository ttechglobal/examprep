// src/lib/imageUpload.js
// ─────────────────────────────────────────────────────────────────────────────
// Lesson slide image uploads.
// Updated: target size reduced from 500KB → 50KB for offline compatibility.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/client'
import { compressImage, validateImageFile, compressionSummary } from '@/lib/imageCompressor'

function slugify(str) {
  return (str ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Build filename ────────────────────────────────────────────────────────────
// [exam]_[subject]_[topic-slug]_[subtopic-slug]_slide[N]_[intent].jpg
export function buildImageFilename({ examTag, subjectName, topicName, subtopicName, slideIndex, intentType }) {
  const exam    = slugify(examTag      ?? 'both')
  const subject = slugify(subjectName  ?? 'subject')
  const topic   = slugify(topicName    ?? 'topic')
  const sub     = slugify(subtopicName ?? 'subtopic')
  const idx     = String((slideIndex ?? 0) + 1).padStart(2, '0')
  const intent  = slugify(intentType   ?? 'image')
  return `${exam}_${subject}_${topic}_${sub}_slide${idx}_${intent}.jpg`
}

// ── Main upload function ──────────────────────────────────────────────────────

export async function uploadLessonImage(file, {
  subtopicId,
  slideIndex,
  examTag,
  subjectName,
  topicName,
  subtopicName,
  intentType,
} = {}) {
  const validation = validateImageFile(file)
  if (!validation.valid) return { error: validation.error }

  let blob
  try {
    blob = await compressImage(file, 'lesson')
  } catch (err) {
    if (err.message === 'TOO_LARGE') {
      return { error: 'Image too large even after compression. Please use a simpler illustration.' }
    }
    if (err.message === 'LOAD_FAILED') {
      return { error: 'Could not read this image. Try saving it as a JPG first.' }
    }
    return { error: 'Could not process image. Please try a different file.' }
  }

  const filename    = buildImageFilename({ examTag, subjectName, topicName, subtopicName, slideIndex, intentType })
  const storagePath = `${subtopicId}/${filename}`

  const supabase = createClient()
  const { error } = await supabase.storage
    .from('lesson-images')
    .upload(storagePath, blob, {
      contentType:  'image/jpeg',
      cacheControl: '31536000',
      upsert:       true,
    })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from('lesson-images')
    .getPublicUrl(storagePath)

  const summary = compressionSummary(file, blob)

  return {
    url:        publicUrl,
    filename,
    sizeKb:     summary.compressedKb,
    originalKb: summary.originalKb,
    savedPct:   summary.savedPct,
    summary:    summary.label,
  }
}

export async function deleteLessonImage(imageUrl) {
  const supabase = createClient()
  const urlParts = imageUrl.split('/lesson-images/')
  if (urlParts.length < 2) return
  const path = urlParts[1]
  await supabase.storage.from('lesson-images').remove([path])
}