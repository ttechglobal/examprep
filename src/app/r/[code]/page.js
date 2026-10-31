// src/app/r/[code]/page.js
// An ambassador's referral link: /r/K7MQ4XZ2 (also what their QR code opens).
//
// Valid code → "Adeola invited you", APK download, copyable code and browser signup. The code is
// remembered on the device (RememberReferral) and also carried in the URL (?ref=),
// in case storage is blocked. Unknown or paused code → straight to normal sign-up,
// so a bad link never dead-ends a student.
//
// Server component: the invite text and link preview (WhatsApp, etc.) come from
// the server. Only the first name of the ambassador is ever shown.

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { memo } from '@/lib/server/memo'
import { cleanCode, REFERRAL_CODE_RE } from '@/lib/referral'
import { TRIAL_DAYS } from '@/lib/plans'
import RememberReferral from './RememberReferral'
import StudentLanding from '@/components/landing/StudentLanding'

// One lookup per request (React cache: the page and its metadata share it) and one
// per minute per code (memo: chat apps fetch the link for a preview as well as
// every student who opens it). A failed lookup isn't remembered.
const lookup = cache(async rawCode => {
  const code = cleanCode(rawCode)
  if (!REFERRAL_CODE_RE.test(code)) return null
  try {
    return await memo(`referral-code:${code}`, 60_000, async () => {
      const { data, error } = await supabaseAdmin().rpc('referral_code_info', { p_code: code })
      if (error) throw error
      return data?.[0] ? { valid: true, firstName: data[0].first_name } : { valid: false }
    }).then(r => (r.valid ? { code, firstName: r.firstName } : null))
  } catch (error) {
    console.error('[r/code]', error?.message ?? error)
    return null
  }
})

export async function generateMetadata({ params }) {
  const { code } = await params
  const info = await lookup(code)
  const title = info ? `${info.firstName} invited you to ExamPrep A1` : 'ExamPrep A1: Practice that feels like a game'
  const description = `Battle the computer on real JAMB and WAEC past questions. Start with ${TRIAL_DAYS} days of Pro, free.`
  return {
    title, description,
    openGraph: { title, description, images: ['/images/examprep_logo.png'], type: 'website' },
  }
}

export default async function ReferralPage({ params }) {
  const { code: rawCode } = await params
  const info = await lookup(rawCode)
  if (!info) redirect('/onboarding?mode=signup')

  return (
    <>
      <RememberReferral code={info.code} />
      <StudentLanding invitation={info} />
    </>
  )
}
