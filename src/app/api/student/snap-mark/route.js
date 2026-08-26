// src/app/api/student/snap-mark/route.js
// POST — receives a base64 image of student's handwritten working
//        or essay, sends to Llama 4 (via Together AI / Groq),
//        returns step-by-step marking feedback.
//
// Body:
//   { image: string (base64 data URL), question: string,
//     type: 'maths' | 'essay', subject: string }
//
// Returns:
//   { steps: [{label, studentText, ok, comment}],
//     overall: { score, pct, summary, tip } }

import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

// ── System prompts ─────────────────────────────────────────────────────────────
const MATHS_SYSTEM = `You are an expert Nigerian secondary school maths examiner (WAEC/JAMB).
A student has sent you a photo of their handwritten working for a maths problem.

Your job:
1. Read the handwritten working carefully — even if messy.
2. Identify each distinct step the student wrote.
3. Mark each step as correct or incorrect.
4. For incorrect steps, explain exactly what went wrong in simple, encouraging language.
5. Never just say "wrong" — always say WHY and what the correct approach is.

Return ONLY valid JSON — no markdown, no preamble:
{
  "steps": [
    { "label": "short step name", "studentText": "what student wrote", "ok": true|false, "comment": "feedback" }
  ],
  "overall": {
    "score": <correct steps count>,
    "total": <total steps count>,
    "pct": <0-100>,
    "summary": "one sentence overall feedback",
    "tip": "one specific improvement tip"
  }
}`

const ESSAY_SYSTEM = `You are an expert Nigerian secondary school English/essay examiner (WAEC/JAMB).
A student has sent you a photo of their handwritten essay response.

Your job:
1. Read the essay carefully.
2. Mark it section by section: Introduction, Main argument(s), Evidence/examples, Counter-argument (if applicable), Conclusion, Language & expression.
3. For each section, say what was good and what was missing.
4. Be specific — reference what the student actually wrote.
5. Use encouraging, teacher-like language.

Return ONLY valid JSON — no markdown, no preamble:
{
  "steps": [
    { "label": "section name", "studentText": "brief quote or summary of what student wrote", "ok": true|false, "comment": "specific feedback" }
  ],
  "overall": {
    "score": <sections done well>,
    "total": <sections assessed>,
    "pct": <0-100>,
    "summary": "one sentence overall feedback",
    "tip": "one specific improvement tip"
  }
}`

export async function POST(request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 })

  const body = await request.json()
  const { image, question, type = 'maths', subject = '' } = body

  if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  if (!question) return NextResponse.json({ error: 'No question provided' }, { status: 400 })

  // Strip data URL prefix if present → get base64 only
  const base64 = image.includes(',') ? image.split(',')[1] : image
  const mediaType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'

  const systemPrompt = type === 'essay' ? ESSAY_SYSTEM : MATHS_SYSTEM

  const userMessage = `Question the student was answering:
"${question}"

Subject: ${subject || 'General'}

Please mark the student's handwritten ${type === 'essay' ? 'essay' : 'working'} shown in the image.`

  // ── Call Llama 4 via Together AI ───────────────────────────────────────────
  // Falls back to a mock response if API key not set (for demo/dev)
  const apiKey = process.env.TOGETHER_API_KEY || process.env.GROQ_API_KEY

  if (!apiKey) {
    // Demo mode — return realistic mock so UI works without API key
    return NextResponse.json(mockResponse(type))
  }

  const isGroq = !!process.env.GROQ_API_KEY && !process.env.TOGETHER_API_KEY

  const endpoint = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.together.xyz/v1/chat/completions'

  const model = isGroq
    ? 'meta-llama/llama-4-scout-17b-16e-instruct'
    : 'meta-llama/Llama-4-Scout-17B-16E-Instruct'

  try {
    const aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userMessage },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      console.error('[snap-mark] AI API error:', err)
      return NextResponse.json({ error: 'AI marking failed. Please try again.' }, { status: 500 })
    }

    const aiData  = await aiRes.json()
    const rawText = aiData.choices?.[0]?.message?.content ?? ''

    // Parse JSON from response
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const result = JSON.parse(cleaned)

    // Save attempt to question_attempts for mastery tracking
    // (best effort — don't fail if this errors)
    try {
      const { createClient: svc } = await import('@supabase/supabase-js')
      const db = svc(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      await db.from('snap_mark_attempts').insert({
        student_id:   user.id,
        question:     question.slice(0, 500),
        type,
        subject,
        score_pct:    result.overall?.pct ?? null,
        step_count:   result.steps?.length ?? 0,
        created_at:   new Date().toISOString(),
      })
    } catch {}

    return NextResponse.json(result)

  } catch (err) {
    console.error('[snap-mark] parse/fetch error:', err)
    return NextResponse.json({ error: 'Could not parse AI response. Please try again.' }, { status: 500 })
  }
}

// ── Mock response for demo / no API key ───────────────────────────────────────
function mockResponse(type) {
  if (type === 'essay') {
    return {
      steps: [
        { label: 'Introduction',       studentText: 'Opening paragraph sets context', ok: true,  comment: 'Clear and relevant introduction. Good.' },
        { label: 'Main argument',       studentText: 'Identified key causes',          ok: true,  comment: 'Strong point. Could add one more supporting detail.' },
        { label: 'Evidence',            studentText: 'One example given',              ok: false, comment: 'Only one example provided. WAEC expects 2–3 specific examples with dates or figures.' },
        { label: 'Counter-argument',    studentText: 'Not included',                   ok: false, comment: 'Missing. A strong essay acknowledges the opposing view then refutes it.' },
        { label: 'Conclusion',          studentText: 'Wraps up the argument',          ok: true,  comment: 'Good conclusion. Links back to the question.' },
        { label: 'Language & structure',studentText: 'Clear sentences',                ok: true,  comment: 'Well-structured paragraphs. Minor spelling errors — check "recieve" and "arguement".' },
      ],
      overall: { score: 4, total: 6, pct: 67, summary: 'A solid attempt with a clear structure. Main weakness is the lack of evidence and no counter-argument.', tip: 'Add 2 specific examples with dates, and include one sentence acknowledging the opposing view.' }
    }
  }
  return {
    steps: [
      { label: 'Formula stated',       studentText: 'Ep = ½kx²',                    ok: true,  comment: '✓ Correct formula. Well done.' },
      { label: 'Values substituted',   studentText: 'Ep = ½ × 200 × (0.15)²',       ok: true,  comment: '✓ Values correctly substituted.' },
      { label: 'Bracket calculated',   studentText: '(0.15)² = 0.0225',              ok: true,  comment: '✓ Correct.' },
      { label: 'Multiplication',       studentText: 'Ep = ½ × 200 × 0.225',          ok: false, comment: '✗ Error here. (0.15)² = 0.0225, not 0.225 — you dropped a zero. This caused all subsequent steps to be wrong.' },
      { label: 'Final answer',         studentText: 'Ep = 22.5 J',                   ok: false, comment: '✗ Follows from the error above. Correct answer: Ep = ½ × 200 × 0.0225 = 2.25 J.' },
    ],
    overall: { score: 3, total: 5, pct: 60, summary: 'Good method — you knew the right formula and substituted correctly. One arithmetic slip in step 4 carried through to the final answer.', tip: 'When squaring decimals like 0.15, write it out: 0.15 × 0.15 = 0.0225. Don\'t do it in your head.' }
  }
}