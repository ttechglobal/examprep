// src/app/r/[code]/page.js
// An ambassador's referral link: /r/K7MQ4XZ2 (also what their QR code opens).
//
// Valid code → "Adeola invited you" with a Start button into onboarding. The code is
// remembered on the device (RememberReferral) and also carried in the URL (?ref=),
// in case storage is blocked. Unknown or paused code → straight to normal sign-up,
// so a bad link never dead-ends a student.
//
// Server component: the invite text and link preview (WhatsApp, etc.) come from
// the server. Only the first name of the ambassador is ever shown.

import { cache } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { cleanCode, REFERRAL_CODE_RE } from '@/lib/referral'
import { TRIAL_DAYS } from '@/lib/plans'
import Zara from '@/components/onboarding/Zara'
import RememberReferral from './RememberReferral'
import s from '@/components/onboarding/onboarding.module.css'

const lookup = cache(async rawCode => {
  const code = cleanCode(rawCode)
  if (!REFERRAL_CODE_RE.test(code)) return null
  const { data, error } = await supabaseAdmin().rpc('referral_code_info', { p_code: code })
  if (error) { console.error('[r/code]', error.message); return null }
  return data?.[0] ? { code, firstName: data[0].first_name } : null
})

export async function generateMetadata({ params }) {
  const { code } = await params
  const info = await lookup(code)
  const title = info ? `${info.firstName} invited you to ExamPrep A1` : 'ExamPrep A1: Practice that feels like a game'
  const description = `Battle the computer on real WAEC and JAMB past questions. Start with ${TRIAL_DAYS} days of Pro, free.`
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
    <main className={s.screen}>
      <div className={s.bg} aria-hidden="true" />
      <div className={s.column}>
        <RememberReferral code={info.code} />
        <div className={s.top}>
          <div className={s.brand}>
            <div className={s.brandMark}>EX</div>
            <span className={s.brandName}>ExamPrep A1</span>
          </div>
        </div>

        <div className={s.authBody} style={{ textAlign: 'center', alignItems: 'center' }}>
          <Zara size={150} />
          <h1 className={s.hello} style={{ marginTop: 16 }}>{info.firstName} invited you 🎉</h1>
          <p className={s.helloSub} style={{ maxWidth: 320, margin: '8px auto 24px' }}>
            Practise real WAEC and JAMB past questions, battle the computer and climb the leaderboard.
            Your first {TRIAL_DAYS} days of Pro are free.
          </p>
          <Link
            href={`/onboarding?mode=signup&ref=${encodeURIComponent(info.code)}`}
            className={s.cta}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Start practising
          </Link>
          <p className={s.switch} style={{ marginTop: 16 }}>
            Already have an account?
            <Link href="/onboarding?mode=signin" className={s.link} style={{ textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
