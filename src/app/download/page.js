import Image from 'next/image'
import Link from 'next/link'
import PublicNav from '@/components/landing/PublicNav'
import PublicFooter from '@/components/landing/PublicFooter'
import { publicMetadata } from '@/lib/publicWebsite'
import s from '@/components/landing/publicWebsite.module.css'

export const metadata = publicMetadata({
  title: 'Start practising | ExamPrep A1 for Android & web',
  description: 'Choose how to work towards your JAMB and WAEC goals. Start in your browser now, or check Android app availability.',
  path: '/download',
})

export default function DownloadPage() {
  let apkUrl = null
  try {
    const url = new URL(process.env.NEXT_PUBLIC_MOBILE_APP_DOWNLOAD_URL || '')
    if (url.protocol === 'https:') apkUrl = url.href
  } catch { /* Show coming soon until the APK is published. */ }

  return <div className={s.site}>
    <PublicNav />
    <main id="main-content" className={`${s.wrap} ${s.downloadMain}`}>
      <div className={s.downloadHeading}><p className={s.eyebrow}>YOUR NEXT STEP STARTS HERE</p><h1>One goal. Choose your way to practise.</h1><p>Get better prepared for JAMB and WAEC, wherever you learn best.</p></div>
      <div className={s.downloadChoices}>
        <section aria-labelledby="web-title" className={`${s.downloadCard} ${s.webChoice}`}>
          <span className={s.platformIcon} aria-hidden="true">↗</span><span className={s.available}>Available now</span>
          <h2 id="web-title">Practise on the web</h2><p>Open ExamPrep A1 in your browser and take your next step towards feeling ready. No download needed.</p>
          <Link href="/onboarding?mode=signup" className={s.button}>Continue in browser <span aria-hidden="true">→</span></Link>
          <span className={s.platformHint}>On your phone, tablet or computer.</span>
        </section>
        <section aria-labelledby="android-title" className={s.downloadCard}>
          <span className={s.platformIcon} aria-hidden="true">↓</span><span className={s.available}>{apkUrl ? 'Android APK' : 'Coming soon'}</span>
          <h2 id="android-title">Download for Android</h2><p>Keep your practice close at hand with the Android app. {apkUrl ? 'Download the APK to get started.' : 'We’re getting the APK ready for you.'}</p>
          {apkUrl ? <a href={apkUrl} className={s.button}>Download Android APK <span aria-hidden="true">↓</span></a> : <button className={s.unavailableButton} type="button" disabled>Android APK coming soon</button>}
          <span className={s.platformHint}>Offline practice is being prepared for the app.</span>
        </section>
      </div>
      <div className={s.downloadEncouragement}><Image src="/images/website/zara-portrait.webp" width={411} height={450} alt="" sizes="70px" /><p>Your next session is another chance to learn.<br /><strong>Let’s make it count.</strong></p></div>
      <p className={s.downloadSignin}>Already have an account? <Link href="/onboarding?mode=signin">Sign in</Link></p>
    </main>
    <PublicFooter />
  </div>
}
