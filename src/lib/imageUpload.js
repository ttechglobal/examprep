import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// imageUpload.js
// Handles lesson image upload with:
//   • Auto-compression to under 500KB
//   • Structured filename convention
//   • JPG enforcement (convert on upload)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 500 * 1024   // 500KB hard limit
const MAX_WIDTH_PX   = 1200         // Mobile-optimised max width

// ── Slugify helper ────────────────────────────────────────────────────────────
function slugify(str) {
  return (str ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Build filename from naming convention ─────────────────────────────────────
// [exam]_[subject]_[topic-slug]_[subtopic-slug]_[slide-index]_[intent-type].jpg
export function buildImageFilename({ examTag, subjectName, topicName, subtopicName, slideIndex, intentType }) {
  const exam    = slugify(examTag ?? 'both')
  const subject = slugify(subjectName ?? 'subject')
  const topic   = slugify(topicName ?? 'topic')
  const sub     = slugify(subtopicName ?? 'subtopic')
  const idx     = String(slideIndex + 1).padStart(2, '0')
  const intent  = slugify(intentType ?? 'image')
  return `${exam}_${subject}_${topic}_${sub}_slide${idx}_${intent}.jpg`
}

// ── Compress image to JPEG under 500KB ────────────────────────────────────────
// Returns a Blob (JPEG) or throws if it can't get under the limit
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let width  = img.naturalWidth
      let height = img.naturalHeight

      // Scale down if wider than max
      if (width > MAX_WIDTH_PX) {
        height = Math.round((height * MAX_WIDTH_PX) / width)
        width  = MAX_WIDTH_PX
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Try progressively lower quality until under 500KB
      const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]

      const tryQuality = (index) => {
        if (index >= qualities.length) {
          reject(new Error('TOO_LARGE'))
          return
        }
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return }
            if (blob.size <= MAX_SIZE_BYTES) {
              resolve(blob)
            } else {
              tryQuality(index + 1)
            }
          },
          'image/jpeg',
          qualities[index]
        )
      }

      tryQuality(0)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load image'))
    }

    img.src = objectUrl
  })
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
  const supabase = createClient()

  // Type check
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only JPG, PNG, WebP, or GIF images are allowed' }
  }

  // Compress to JPEG under 500KB
  let blob
  try {
    blob = await compressImage(file)
  } catch (err) {
    if (err.message === 'TOO_LARGE') {
      return { error: 'Image too large. Please use a simpler illustration or compress before uploading.' }
    }
    return { error: 'Could not process image. Please try a different file.' }
  }

  // Build structured filename
  const filename = buildImageFilename({
    examTag,
    subjectName,
    topicName,
    subtopicName,
    slideIndex: slideIndex ?? 0,
    intentType,
  })

  const storagePath = `${subtopicId}/${filename}`

  // Upload (upsert so re-uploading for same slide replaces the old one)
  const { error } = await supabase.storage
    .from('lesson-images')
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',  // 1 year — images are immutable once published
      upsert: true,
    })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from('lesson-images')
    .getPublicUrl(storagePath)

  return { url: publicUrl, filename, sizeKb: Math.round(blob.size / 1024) }
}

export async function deleteLessonImage(imageUrl) {
  const supabase = createClient()
  const urlParts = imageUrl.split('/lesson-images/')
  if (urlParts.length < 2) return
  const path = urlParts[1]
  await supabase.storage.from('lesson-images').remove([path])
}