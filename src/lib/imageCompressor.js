// src/lib/imageCompressor.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all image compression in ExamPrep.
//
// Target sizes (per product spec):
//   QUESTION images       → 50KB  (question diagrams, must work offline)
//   EXPLANATION images    → 50KB  (explanation diagrams, same requirement)
//   LESSON images         → 50KB  (lesson slide images, same requirement)
//   LESSON images legacy  → 500KB (kept for backward compat — don't use for new uploads)
//
// Why 50KB?
//   A student with 4 subjects × ~300 questions × some % with images
//   needs the total image payload to stay small enough to cache offline
//   without eating mobile storage or data.
//
// Strategy:
//   1. Scale down to max width
//   2. Try JPEG quality levels from high to low until under target
//   3. If still over limit at minimum quality, try scaling down further
//   4. Throw TOO_LARGE if nothing works (very rare — only pathological inputs)
// ─────────────────────────────────────────────────────────────────────────────

export const IMAGE_LIMITS = {
  question:    { maxBytes: 50  * 1024, maxWidth: 800,  label: '50KB'  },
  explanation: { maxBytes: 50  * 1024, maxWidth: 800,  label: '50KB'  },
  lesson:      { maxBytes: 50  * 1024, maxWidth: 1000, label: '50KB'  },
}

/**
 * Compress a File or Blob to JPEG under the given byte limit.
 *
 * @param {File|Blob} file
 * @param {'question'|'explanation'|'lesson'} type
 * @returns {Promise<Blob>} compressed JPEG blob
 * @throws {Error} with message 'TOO_LARGE' if it can't compress enough
 * @throws {Error} with message 'LOAD_FAILED' if the image can't be decoded
 */
export function compressImage(file, type = 'question') {
  const { maxBytes, maxWidth } = IMAGE_LIMITS[type] ?? IMAGE_LIMITS.question

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      attemptCompression(img, maxWidth, maxBytes, resolve, reject)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('LOAD_FAILED'))
    }

    img.src = objectUrl
  })
}

function attemptCompression(img, maxWidth, maxBytes, resolve, reject) {
  // Quality sweep — from good to aggressive
  const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15]

  // We try at full maxWidth first, then 75%, then 50% if needed
  const scaleFactors = [1.0, 0.75, 0.50]

  let scaleIdx = 0
  let qualIdx  = 0

  const tryNext = () => {
    if (qualIdx >= qualities.length) {
      // Move to next scale factor
      scaleIdx++
      qualIdx = 0
      if (scaleIdx >= scaleFactors.length) {
        reject(new Error('TOO_LARGE'))
        return
      }
    }

    const scaleFactor = scaleFactors[scaleIdx]
    const targetWidth = Math.round(maxWidth * scaleFactor)

    let width  = img.naturalWidth
    let height = img.naturalHeight

    if (width > targetWidth) {
      height = Math.round((height * targetWidth) / width)
      width  = targetWidth
    }

    const canvas = document.createElement('canvas')
    canvas.width  = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    // White background (prevents transparent PNGs from going black)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('COMPRESSION_FAILED')); return }
        if (blob.size <= maxBytes) {
          resolve(blob)
        } else {
          qualIdx++
          tryNext()
        }
      },
      'image/jpeg',
      qualities[qualIdx]
    )
  }

  tryNext()
}

/**
 * Human-readable result of a compression attempt.
 * Call after compressImage() resolves to show the admin feedback.
 */
export function compressionSummary(originalFile, compressedBlob) {
  const originalKb   = Math.round(originalFile.size / 1024)
  const compressedKb = Math.round(compressedBlob.size / 1024)
  const saved        = originalKb - compressedKb
  const pct          = originalKb > 0 ? Math.round((saved / originalKb) * 100) : 0
  return {
    originalKb,
    compressedKb,
    savedKb: saved,
    savedPct: pct,
    label: `${originalKb}KB → ${compressedKb}KB (${pct}% smaller)`,
  }
}

/**
 * Validate file before attempting compression.
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validateImageFile(file) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!file) return { valid: false, error: 'No file selected' }
  if (!allowed.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG, or WebP images are allowed' }
  }
  // Sanity check — reject suspiciously large files (>10MB) before even trying
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File is too large (max 10MB input). Please use a smaller image.' }
  }
  return { valid: true }
}