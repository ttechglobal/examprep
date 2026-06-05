// src/app/api/admin/images/validate/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Server-side image size guard.
// Called before images are committed to the questions or subtopics tables.
//
// The client-side compressor handles most cases, but this adds a server
// backstop so oversized images can't enter the DB via API calls or
// browser devtools overrides.
//
// Usage (call before saving a question with an image):
//   POST /api/admin/images/validate
//   Body: { url: "https://..." }
//   Response: { valid: true, sizeKb: 45 }
//          or { valid: false, error: "Image too large: 120KB (max 50KB)" }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_KB = 50

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url) return NextResponse.json({ valid: true })  // No image — nothing to validate

  // Only validate images in our own Supabase storage buckets
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!url.startsWith(supabaseUrl)) {
    // External URL — skip validation, let it through
    return NextResponse.json({ valid: true })
  }

  try {
    // HEAD request to get Content-Length without downloading the full image
    const res = await fetch(url, { method: 'HEAD' })

    if (!res.ok) {
      return NextResponse.json({ valid: false, error: 'Image URL is not accessible' }, { status: 400 })
    }

    const contentLength = res.headers.get('content-length')
    if (!contentLength) {
      // Can't determine size — let it through (we did our best)
      return NextResponse.json({ valid: true, sizeKb: null })
    }

    const sizeKb = Math.round(parseInt(contentLength) / 1024)

    if (sizeKb > MAX_KB) {
      return NextResponse.json({
        valid: false,
        error: `Image too large: ${sizeKb}KB (max ${MAX_KB}KB). Please re-upload with compression.`,
        sizeKb,
      }, { status: 400 })
    }

    return NextResponse.json({ valid: true, sizeKb })

  } catch {
    // Network error checking the image — let it through rather than blocking
    return NextResponse.json({ valid: true })
  }
}