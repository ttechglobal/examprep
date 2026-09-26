// src/app/b/[code]/page.js
// Battle invite link: https://<site>/b/K7Q2 — the target of the WhatsApp
// message and the QR code. Rendered on the server so WhatsApp shows a proper
// link preview ("Tobi challenged you!"). Works in any browser, with or
// without the app; the interactive part is ChallengeClient.
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import ChallengeClient from '@/components/battle/ChallengeClient'
import { PVP_CODE_RE } from '@/lib/pvp/constants'

async function loadPreview(rawCode) {
  const code = String(rawCode ?? '').toUpperCase()
  if (!PVP_CODE_RE.test(code)) return { code, preview: { ok: false, error: 'PVP_CODE_NOT_FOUND' } }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('pvp_preview', { p_code: code })
    if (error) throw error
    return { code, preview: data }
  } catch (err) {
    console.error('[b/code] preview failed:', err?.message ?? err)
    return { code, preview: { ok: false, error: 'PVP_SERVER' } }
  }
}

export async function generateMetadata({ params }) {
  const { code: raw } = await params
  const { code, preview } = await loadPreview(raw)
  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`

  const open = preview?.ok && preview.status === 'waiting'
  const title = open ? `${preview.host_name ?? 'A friend'} challenged you! ⚔️` : 'ExamPrep battle'
  const description = open
    ? `${preview.exam} ${preview.subject_name} · ${preview.question_count} questions · ${preview.timer_secs}s each. Tap to accept (code ${code}).`
    : 'Battle your friends on ExamPrep — WAEC and JAMB practice, head to head.'

  return {
    metadataBase: new URL(origin),
    title,
    description,
    openGraph: { title, description, images: ['/images/battle/battle-icon.png'], type: 'website' },
    twitter: { card: 'summary', title, description },
    robots: { index: false },
  }
}

export default async function BattleInvitePage({ params }) {
  const { code: raw } = await params
  const { code, preview } = await loadPreview(raw)
  return <ChallengeClient code={code} preview={preview}/>
}
