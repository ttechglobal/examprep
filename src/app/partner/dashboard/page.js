'use client'
// src/app/partner/dashboard/page.js
// Route: /partner/dashboard
// A Teacher Ambassador's home: generate the referral code once, copy the link,
// share it on WhatsApp, download the QR code, and see every student who signed up
// and paid. Numbers are per year (exams are written yearly); the balance is
// all-time. Students appear as first name + last initial only.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth/client'
import { priceLabel } from '@/lib/plans'
import s from '../partner.module.css'
import { PartnerBrand, PartnerIcon } from '../PartnerUI'
import { partnerReferralBase } from '@/lib/partnerUrl'
import { whatsappLink } from '@/lib/contact'

const VIEWS = [{ id: 'overview', label: 'Overview' }, { id: 'referrals', label: 'Referral link' }, { id: 'students', label: 'Students' }]

const STATUS = {
  subscribed: { label: 'Subscribed', cls: s.statusSubscribed },
  trial:      { label: 'Free trial', cls: s.statusTrial },
  free:       { label: 'Free',       cls: '' },
  expired:    { label: 'Expired',    cls: s.statusExpired },
}

const shortDate = iso => new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })

// One dashboard request. Never throws: returns { data } | { error } | { unauthorised }.
async function fetchDashboard(year) {
  try {
    const res = await fetch(year ? `/api/partner/dashboard?year=${year}` : '/api/partner/dashboard')
    if (res.status === 401 || res.status === 403) return { unauthorised: true }
    const json = await res.json()
    if (!res.ok) return { error: json.error || 'Could not load your dashboard.' }
    return { data: json }
  } catch { return { error: 'Could not load your dashboard. Check your connection and try again.' } }
}

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text) } catch {
      // Older browsers: fall back to selecting a hidden field.
      const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select()
      try { document.execCommand('copy') } catch {}
      el.remove()
    }
    setDone(true); setTimeout(() => setDone(false), 1800)
  }
  return <button type="button" className={`${s.smallBtn} ${done ? s.smallBtnDone : ''}`} onClick={copy}>{done ? 'Copied ✓' : label}</button>
}

// Switching between years you've already opened is instant and free: each year's answer
// is kept for 30 seconds. Making a code clears it, so the new code shows at once.
const YEAR_CACHE_MS = 30_000

export default function PartnerDashboardPage() {
  const router = useRouter()
  const yearCache = useRef(new Map())   // year ('' = this year) → { at, data }
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const [busy, setBusy]       = useState(false)
  const [qr, setQr]           = useState({ small: null, large: null })
  const [view, setView] = useState('overview')
  const [supportMessage, setSupportMessage] = useState('Hi, I need help with my ExamPrep A1 Teacher Ambassador account.')
  const heading = useRef(null)

  function navigate(next) {
    setView(next)
    heading.current?.focus()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Show a fetch result: the dashboard, an error, or back to sign-in.
  const show = useCallback(result => {
    if (result.unauthorised) { router.replace('/partner/login'); return }
    if (result.error) { setError(result.error); return }
    setData(result.data)
    setError(null)
  }, [router])
  const load = useCallback(year => {
    const hit = yearCache.current.get(year ?? '')
    if (hit && Date.now() - hit.at < YEAR_CACHE_MS) { show({ data: hit.data }); return Promise.resolve() }
    return fetchDashboard(year).then(result => {
      if (result.data) yearCache.current.set(year ?? '', { at: Date.now(), data: result.data })
      show(result)
    })
  }, [show])

  useEffect(() => {
    let ignore = false
    fetchDashboard().then(result => { if (!ignore) show(result) })
    return () => { ignore = true }
  }, [show])

  const base = partnerReferralBase(process.env.NEXT_PUBLIC_APP_URL, typeof window !== 'undefined' ? window.location.origin : '')
  const link = data?.code ? `${base}/r/${data.code}` : ''

  // The QR code opens the same link. Made in the browser; nothing is uploaded.
  useEffect(() => {
    if (!link) return
    let cancelled = false
    import('qrcode').then(async ({ default: QRCode }) => {
      const opts = { margin: 2, color: { dark: '#062A78', light: '#ffffff' } }
      const [small, large] = await Promise.all([
        QRCode.toDataURL(link, { ...opts, width: 340 }),
        QRCode.toDataURL(link, { ...opts, width: 900 }),
      ])
      if (!cancelled) setQr({ small, large })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [link])

  async function generate() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/partner/code', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      yearCache.current.clear()
      await load(data?.year === null ? 'all' : data?.year)
    } catch (e) { setError(e.message || 'Could not make your code.') }
    setBusy(false)
  }

  async function logout() { await signOut(); router.push('/partner/login') }

  if (!data) {
    return (
      <div className={s.page}>
        <div className={s.shell}>
          {error ? <div className={s.error} role="alert" style={{ marginTop: 24 }}>{error}</div> : <p className={s.loading}>Loading your dashboard…</p>}
        </div>
      </div>
    )
  }

  const firstName = data.name.split(' ')[0]
  const shareText = `Practise real WAEC and JAMB past questions, battle the computer and climb the leaderboard on ExamPrep A1. Join with my link: ${link}`
  const yearLabel = data.year ?? 'all time'

  return (
    <div className={`${s.page} ${s.dashboardPage}`}>
      <aside className={s.sidebar}>
        <PartnerBrand />
        <span className={s.navLabel}>YOUR WORKSPACE</span>
        <nav className={s.desktopNav} aria-label="Ambassador dashboard">
          {VIEWS.map(item => <button key={item.id} type="button" className={`${s.navItem} ${view === item.id ? s.navActive : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><PartnerIcon name={item.id} />{item.label}</button>)}
        </nav>
        <div className={s.sidebarHelp}><PartnerIcon name="support" /><strong>We’re here to help</strong><p>Questions about referrals or your earnings?</p><button type="button" className={s.supportLink} onClick={() => navigate('support')}>Get help ↗</button></div>
        <div className={s.sidebarAccount}><span className={s.avatar}>{firstName.slice(0, 1)}</span><div><strong>{data.name}</strong><small>Teacher Ambassador</small></div></div>
        <button type="button" className={s.signout} onClick={logout}>Sign out ↗</button>
      </aside>
      <main className={s.shell}>
        <div className={s.mobileBrand}><PartnerBrand /></div>
        <div className={s.top}>
          <div>
            <p className={s.eyebrow}>YOUR AMBASSADOR WORKSPACE</p>
            <h1 ref={heading} tabIndex={-1} className={s.hello}>{view === 'overview' ? `Hi, ${firstName} 👋` : view === 'referrals' ? 'Your referral toolkit' : view === 'support' ? 'How can we help?' : 'Your students'}</h1>
            <p className={s.helloSub}>{view === 'overview' ? 'Small encouragement. Lasting impact. Here’s how you’re doing.' : view === 'referrals' ? 'One link to bring your classroom along.' : view === 'support' ? 'Talk to the ExamPrep A1 team about your ambassador account.' : 'See the students who joined through your referral.'}</p>
          </div>
          <button type="button" className={`${s.ghost} ${s.mobileSignout}`} onClick={logout}>Sign out</button>
        </div>

        {error && <div className={s.error} role="alert">{error}</div>}

        {view === 'support' && <section className={`${s.panel} ${s.supportPanel}`}>
          <span className={s.supportSymbol}><PartnerIcon name="support" /></span>
          <h2 className={s.panelTitle}>Message our team</h2>
          <p className={s.panelSub}>Ask about your referral link, student signups, earnings or payouts. Review your message below before opening WhatsApp.</p>
          <label className={s.label} htmlFor="partner-support-message">Your message</label>
          <textarea id="partner-support-message" className={`${s.input} ${s.supportMessage}`} value={supportMessage} onChange={event => setSupportMessage(event.target.value)} maxLength={2000} />
          <p className={s.fine}>Support: +234 816 652 8437. Nothing has been sent. You’ll review the draft and tap Send in WhatsApp.</p>
          {supportMessage.trim() ? <a className={s.supportContinue} href={whatsappLink(supportMessage.trim())} target="_blank" rel="noopener noreferrer">Continue to WhatsApp ↗</a> : <button className={s.primary} disabled>Write a message to continue</button>}
        </section>}

        {/* Referral code */}
        <section className={s.panel} hidden={view !== 'referrals'}>
          <h2 className={s.panelTitle}>Your referral link</h2>
          {data.status === 'paused' && (
            <div className={s.paused}>Your account is paused, so new students can’t join with your code. Contact ExamPrep A1.</div>
          )}
          {!data.code ? (
            <>
              <p className={s.panelSub}>Make your personal code. Students who sign up with it are linked to you, and you earn when they pay. You make it once and it never changes.</p>
              <button type="button" className={s.generate} onClick={generate} disabled={busy || data.status === 'paused'}>
                {busy ? 'Making your code…' : 'Generate my referral code'}
              </button>
            </>
          ) : (
            <div className={s.codeGrid}>
              <div>
                <p className={s.panelSub} style={{ marginBottom: 12 }}>Share this with your students. They can open the link, scan the QR code, or type your code when they sign up.</p>
                <div className={s.codeBox}>
                  <span className={s.codeText}>{data.code}</span>
                  <CopyButton text={data.code} label="Copy code" />
                </div>
                <div className={s.codeBox}>
                  <span className={s.linkText}>{link}</span>
                  <CopyButton text={link} label="Copy link" />
                </div>
                <div className={s.actions}>
                  <a className={s.whatsapp} href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
                    Share on WhatsApp
                  </a>
                </div>
              </div>
              <div className={s.qrWrap}>
                {qr.small && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={s.qr} src={qr.small} alt={`QR code for your referral link ${link}`} />
                )}
                {qr.large && (
                  <a className={s.ghost} href={qr.large} download={`examprep-referral-${data.code}.png`} style={{ textDecoration: 'none' }}>
                    Download QR code
                  </a>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Year */}
        <div className={s.yearRow} role="group" aria-label="Choose a year" hidden={view === 'referrals' || view === 'support'}>
          {data.years.map(y => (
            <button key={y} type="button" className={`${s.chip} ${data.year === y ? s.chipOn : ''}`} aria-pressed={data.year === y} onClick={() => load(y)}>{y}</button>
          ))}
          <button type="button" className={`${s.chip} ${data.year === null ? s.chipOn : ''}`} aria-pressed={data.year === null} onClick={() => load('all')}>All time</button>
        </div>

        <div className={s.kpis} hidden={view !== 'overview'}>
          <div className={s.kpi}><div className={s.kpiNum}>{data.students}</div><div className={s.kpiLabel}>Students signed up</div></div>
          <div className={s.kpi}><div className={s.kpiNum}>{data.paying}</div><div className={s.kpiLabel}>Students subscribed</div></div>
          <div className={s.kpi}><div className={`${s.kpiNum} ${s.kpiGreen}`}>{priceLabel(data.earned)}</div><div className={s.kpiLabel}>Earned ({yearLabel})</div></div>
          <div className={s.kpi}>
            <div className={s.kpiNum}>{priceLabel(data.balance)}</div>
            <div className={s.kpiLabel}>Balance owed to you</div>
            <div className={s.kpiNote}>{priceLabel(data.paid_out)} paid out so far</div>
          </div>
        </div>

        {view === 'overview' && <section className={s.inviteBanner}>
          <div><span className={s.storyBadge}>YOUR NEXT STEP</span><h2>{data.code ? 'Your classroom is one link away.' : 'Let’s get your first students on board.'}</h2><p>{data.code ? 'Share your link or QR code and help your students start practising.' : 'Create your personal referral code, then share it with your students.'}</p></div>
          <button type="button" className={s.bannerButton} onClick={() => navigate('referrals')}>{data.code ? 'Open referral toolkit' : 'Get my referral link'} <span aria-hidden="true">↗</span></button>
        </section>}

        {/* Students */}
        <section className={s.panel} hidden={view === 'referrals' || view === 'support'}>
          <h2 className={s.panelTitle}>Your students · {yearLabel}</h2>
          {data.list.length === 0 ? (
            <p className={s.empty}>
              {data.code ? 'No students yet. Share your link or QR code and they will appear here.' : 'Open Referral link to generate your code, then share it with your students.'}
            </p>
          ) : (
            <div className={s.rows}>
              {data.list.map((st, i) => {
                const status = STATUS[st.status] ?? STATUS.free
                return (
                  <div key={i} className={s.row}>
                    <span className={s.name}>{st.name}</span>
                    <span className={s.joined}>Joined {shortDate(st.joined)}</span>
                    <span className={`${s.status} ${status.cls}`}>{status.label}</span>
                    <span className={s.earn}>{st.commission ? `+${priceLabel(st.commission)}` : ''}</span>
                  </div>
                )
              })}
            </div>
          )}
          <p className={s.fine}>
            You earn on a student’s first payment. Your balance is what ExamPrep A1 owes you across all years, and it
            doesn’t reset in January. Refunded payments are taken off.
          </p>
        </section>
      </main>
      <nav className={s.bottomNav} aria-label="Ambassador dashboard">
        {VIEWS.map(item => <button key={item.id} type="button" className={`${s.bottomItem} ${view === item.id ? s.bottomActive : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><PartnerIcon name={item.id} /><span>{item.label}</span></button>)}
        <button type="button" className={`${s.bottomItem} ${view === 'support' ? s.bottomActive : ''}`} aria-current={view === 'support' ? 'page' : undefined} onClick={() => navigate('support')}><PartnerIcon name="support" /><span>Help</span></button>
      </nav>
    </div>
  )
}
