// src/lib/questionImageUpload.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles question diagram image uploads:
//   • Compresses to JPEG under 100KB (tighter than lesson images)
//   • Uploads to the separate `question-images` bucket
//   • Structured filename for traceability
//
// Separate from imageUpload.js (lesson images) intentionally —
// different bucket, different size target, different naming convention.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/client'

const MAX_SIZE_BYTES = 100 * 1024  // 100 KB hard limit
const MAX_WIDTH_PX   = 900         // Narrower than lesson images — exam diagrams are compact

function slugify(str) {
  return (str ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

// ── Compress to JPEG under 100KB ──────────────────────────────────────────────
export async function compressQuestionImage(file) {
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

      // Try progressively lower quality until under 100KB
      const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25]

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

// ── Upload to question-images bucket ─────────────────────────────────────────
// Returns { url, filename, sizeKb } on success, { error } on failure
export async function uploadQuestionImage(file, {
  examType,
  subjectName,
  questionIndex,
} = {}) {
  const supabase = createClient()

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only JPG, PNG, or WebP images are allowed' }
  }

  let blob
  try {
    blob = await compressQuestionImage(file)
  } catch (err) {
    if (err.message === 'TOO_LARGE') {
      return { error: 'Image is too large even after compression. Try a cleaner screenshot.' }
    }
    return { error: 'Could not process image. Try a different file.' }
  }

  // Filename: {exam}_{subject}_{timestamp}_{index}.jpg
  const exam    = slugify(examType ?? 'exam')
  const subject = slugify(subjectName ?? 'subject')
  const ts      = Date.now()
  const idx     = String(questionIndex ?? 0).padStart(3, '0')
  const filename = `${exam}_${subject}_${ts}_q${idx}.jpg`

  const { error } = await supabase.storage
    .from('question-images')
    .upload(filename, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from('question-images')
    .getPublicUrl(filename)

  return {
    url:    publicUrl,
    filename,
    sizeKb: Math.round(blob.size / 1024),
  }
}

// ── Build dynamic AI image-improvement prompt ─────────────────────────────────
// Gives the admin a ready-to-copy prompt tailored to the specific question
// context. Admin pastes this + the image into Gemini or ChatGPT.
export function buildImageImprovementPrompt({ questionText, subjectName, examType }) {
  const subject = subjectName ?? 'a Nigerian secondary school subject'
  const exam    = examType ?? 'WAEC/JAMB'

  return `You are helping prepare an exam question diagram for ${exam} ${subject}.

The question reads:
"${questionText?.slice(0, 300) ?? '(see image)'}"

I am attaching an image that is the diagram for this question. Please do the following:

1. If the image is clear and readable: redraw it as a clean, sharp, black-and-white diagram suitable for a student exam. Remove any scan artefacts, blurriness, or watermarks.

2. If the image is unclear or partially cut off: reconstruct a complete, accurate diagram based on what you can see and what the question is asking. The diagram must correctly represent the concept being tested.

REQUIREMENTS:
- Clean lines, no blurriness
- All labels and annotations clearly readable
- Black-and-white only (no colour fills)
- Sized for mobile viewing (portrait orientation if possible)
- Do not add anything that is not relevant to the question

Return the improved image only. No explanation needed.`
}