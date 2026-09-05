// src/app/api/early-access/route.js
// POST — saves a school lead and sends a confirmation email via Resend.
//
// ── Required env vars ────────────────────────────────────────────────────────
//   RESEND_API_KEY     — from resend.com dashboard (get a free key in 2 minutes)
//   EMAIL_FROM         — verified sender address, e.g. hello@examprep.ng
//                        must match a domain you've verified in Resend
//
// ── Supabase table (run once in SQL editor) ──────────────────────────────────
// create table early_access_leads (
//   id                 bigint generated always as identity primary key,
//   full_name          text not null,
//   school_name        text not null,
//   role               text not null,
//   phone              text,
//   email              text not null,
//   uses_digital_tools text,
//   biggest_challenge  text,
//   created_at         timestamptz default now()
// );
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse }                         from 'next/server'

const DELAY_MS = 5 * 60 * 1000 // 5 minutes

export async function POST(request) {
  const body = await request.json()
  const {
    full_name,
    school_name,
    role,
    phone,
    email,
    uses_digital_tools,
    biggest_challenge,
  } = body

  // ── Validation ──────────────────────────────────────────────────────────
  if (!full_name?.trim())   return NextResponse.json({ error: 'Full name is required' },   { status: 400 })
  if (!school_name?.trim()) return NextResponse.json({ error: 'School name is required' }, { status: 400 })
  if (!role?.trim())        return NextResponse.json({ error: 'Role is required' },         { status: 400 })
  if (!email?.trim())       return NextResponse.json({ error: 'Email is required' },        { status: 400 })

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRx.test(email)) return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })

  const cleanEmail  = email.trim().toLowerCase()
  const cleanName   = full_name.trim()
  const cleanSchool = school_name.trim()

  // ── Save lead to Supabase ────────────────────────────────────────────────
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error: insertError } = await service.from('early_access_leads').insert({
    full_name:           cleanName,
    school_name:         cleanSchool,
    role:                role.trim(),
    phone:               phone?.trim() ?? null,
    email:               cleanEmail,
    uses_digital_tools:  uses_digital_tools?.trim() ?? null,
    biggest_challenge:   biggest_challenge?.trim() ?? null,
    created_at:          new Date().toISOString(),
  })

  if (insertError) {
    // Log but don't fail — table may not exist yet during initial deploy
    console.error('[early-access] Supabase insert failed:', insertError.message)
  }

  // ── Fire-and-forget: send confirmation email after 5-minute delay ────────
  scheduleEmail({ email: cleanEmail, full_name: cleanName, school_name: cleanSchool })
    .catch(err => console.error('[early-access] scheduleEmail error:', err?.message))

  return NextResponse.json({ success: true })
}

// ── Delayed email sender ─────────────────────────────────────────────────────

async function scheduleEmail({ email, full_name, school_name }) {
  await new Promise(resolve => setTimeout(resolve, DELAY_MS))
  await sendResendEmail({ email, full_name, school_name })
}

async function sendResendEmail({ email, full_name, school_name }) {
  const apiKey   = process.env.RESEND_API_KEY
  const fromAddr = process.env.EMAIL_FROM ?? 'hello@examprep.ng'

  if (!apiKey) {
    console.warn('[early-access] RESEND_API_KEY not set — skipping email.')
    return
  }

  try {
    const res  = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from:    `ExamPrep <${fromAddr}>`,
        to:      [email],
        subject: 'We got your details — ExamPrep',
        html:    buildEmailHtml({ full_name, school_name }),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[early-access] Resend error:', res.status, JSON.stringify(data))
    } else {
      console.log('[early-access] Email sent to', email, '| id:', data.id)
    }
  } catch (err) {
    console.error('[early-access] Resend fetch error:', err?.message)
  }
}

// ── Email template ───────────────────────────────────────────────────────────

function buildEmailHtml({ full_name, school_name }) {
  const firstName = full_name.split(' ')[0]

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ExamPrep</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(6,42,120,0.08);">

          <tr>
            <td style="background:#062A78;padding:28px 40px;">
              <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.4px;">ExamPrep</span>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 16px;font-size:21px;font-weight:700;color:#0f172a;line-height:1.25;">
                Hi ${firstName} — we'll be in touch soon.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
                Thank you for your interest in ExamPrep on behalf of 
                <strong style="color:#062A78;">${school_name}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
                We are excited to partner with you in helping your students prepare smarter for WAEC and JAMB.
                One of our team members will reach out to walk you through the platform and answer any questions.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  ['📋', 'We\'ll walk you through it', 'Our team will show you how ExamPrep works and how to get your students set up.'],
                  ['🏫', 'School dashboard access', 'See which topics your class is struggling with from the moment students start practising.'],
                  ['🎯', 'Built for WAEC & JAMB', 'Real past questions, official objectives, personalised paths — not a generic quiz app.'],
                ].map(([icon, title, desc]) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;width:32px;font-size:18px;">${icon}</td>
                  <td style="padding:10px 0 10px 12px;border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px;">${title}</div>
                    <div style="font-size:12px;color:#64748b;line-height:1.5;">${desc}</div>
                  </td>
                </tr>`).join('')}
              </table>

              <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
                If you have any questions before we reach out, simply reply to this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f8faff;padding:18px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                ExamPrep · Helping Nigerian students ace WAEC &amp; JAMB
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
