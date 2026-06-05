// src/lib/questionImageUpload.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles question diagram AND explanation diagram uploads.
// Both go to the `question-images` Supabase storage bucket.
// Target: 50KB per image (was 100KB — reduced for offline caching).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/client'
import { compressImage, validateImageFile, compressionSummary } from '@/lib/imageCompressor'

function slugify(str) {
  return (str ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

// ── Core upload function (shared by question + explanation) ───────────────────

async function uploadToQuestionBucket(file, path, type = 'question') {
  const validation = validateImageFile(file)
  if (!validation.valid) return { error: validation.error }

  let blob
  try {
    blob = await compressImage(file, type)
  } catch (err) {
    if (err.message === 'TOO_LARGE') {
      return { error: 'Image is too large even after compression. Try a cleaner screenshot or a simpler diagram.' }
    }
    if (err.message === 'LOAD_FAILED') {
      return { error: 'Could not read this image file. Try saving it as a JPG first.' }
    }
    return { error: 'Could not process image. Try a different file.' }
  }

  const supabase = createClient()
  const { error } = await supabase.storage
    .from('question-images')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: true,   // allow re-upload of same question's image
    })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from('question-images')
    .getPublicUrl(path)

  const summary = compressionSummary(file, blob)

  return {
    url:         publicUrl,
    path,
    sizeKb:      summary.compressedKb,
    originalKb:  summary.originalKb,
    savedPct:    summary.savedPct,
    summary:     summary.label,
  }
}

// ── Question image ─────────────────────────────────────────────────────────────

/**
 * Upload the main diagram for a question.
 * @param {File} file
 * @param {{ examType, subjectName, questionIndex }} opts
 */
export async function uploadQuestionImage(file, { examType, subjectName, questionIndex } = {}) {
  const exam    = slugify(examType    ?? 'exam')
  const subject = slugify(subjectName ?? 'subject')
  const ts      = Date.now()
  const idx     = String(questionIndex ?? 0).padStart(3, '0')
  const path    = `questions/${exam}_${subject}_${ts}_q${idx}.jpg`

  return uploadToQuestionBucket(file, path, 'question')
}

// ── Explanation image ──────────────────────────────────────────────────────────

/**
 * Upload the explanation diagram for a question.
 * Stored alongside question images but with an _exp suffix so it's identifiable.
 * @param {File} file
 * @param {{ examType, subjectName, questionId }} opts
 */
export async function uploadExplanationImage(file, { examType, subjectName, questionId } = {}) {
  const exam    = slugify(examType    ?? 'exam')
  const subject = slugify(subjectName ?? 'subject')
  const ts      = Date.now()
  const qid     = slugify(questionId  ?? 'q')
  const path    = `explanations/${exam}_${subject}_${qid}_${ts}_exp.jpg`

  return uploadToQuestionBucket(file, path, 'explanation')
}

// ── AI image improvement prompt (unchanged) ────────────────────────────────────

export function buildImageImprovementPrompt({ questionText, subjectName, examType, isExplanation = false }) {
  const subject = subjectName ?? 'a Nigerian secondary school subject'
  const exam    = examType    ?? 'WAEC/JAMB'
  const context = isExplanation
    ? 'the explanation/solution diagram for this question'
    : 'the diagram for this question'

  return `You are helping prepare ${context} for ${exam} ${subject}.

The question reads:
"${questionText?.slice(0, 300) ?? '(see image)'}"

I am attaching an image that is ${context}. Please do the following:

1. If the image is clear and readable: redraw it as a clean, sharp, black-and-white diagram suitable for a student exam. Remove any scan artefacts, blurriness, or watermarks.

2. If the image is unclear or partially cut off: reconstruct a complete, accurate diagram based on what you can see and what the question is asking.

REQUIREMENTS:
- Clean lines, no blurriness
- All labels and annotations clearly readable
- Black-and-white only (no colour fills)
- Sized for mobile viewing (portrait orientation if possible)
- Do not add anything not relevant to the question

Return the improved image only. No explanation needed.`
}