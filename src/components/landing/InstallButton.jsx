'use client'
// src/components/landing/InstallButton.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Install button + bottom sheet for every situation:
//   • Chrome/Edge with a ready prompt → native dialog, then an "Installing…"
//     sheet until the browser confirms (`appinstalled`), then "Installed ✓"
//   • iPhone / iPad                   → Share → Add to Home Screen steps
//   • WhatsApp / Instagram / Facebook → "open in your browser" + copy link
//   • anything else                   → manual steps, or continue in browser
// It never silently redirects. Hidden when already running as the app.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePWAInstall, promptInstall } from '@/lib/pwaInstall'
import s from './landing.module.css'

const CHECK_AFTER_MS = 60_000   // Android can take a while to finish in the background

export default function InstallButton({
  label = 'Install ExamPrep A1',
  variant = 'gold',          // 'gold' | 'blue' | 'ghost'
  size,                      // 'sm' | 'lg'
  className = '',
}) {
  const pwa = usePWAInstall()
  const [sheet, setSheet] = useState(null)   // null | 'installing' | 'done' | 'check' | 'ios' | 'inapp' | 'manual'

  // Move from "Installing…" to "Installed" when the browser confirms
  useEffect(() => {
    if (pwa.installed && (sheet === 'installing' || sheet === 'check')) setSheet('done')
  }, [pwa.installed, sheet])

  // If the browser never confirms, stop spinning and tell them where to look
  useEffect(() => {
    if (sheet !== 'installing') return
    const t = setTimeout(() => setSheet(cur => (cur === 'installing' ? 'check' : cur)), CHECK_AFTER_MS)
    return () => clearTimeout(t)
  }, [sheet])

  if (pwa.standalone) return null

  const variantClass = variant === 'blue' ? s.btnBlue : variant === 'ghost' ? s.btnGhost : s.btnGold
  const sizeClass = size === 'sm' ? s.btnSm : size === 'lg' ? s.btnLg : ''

  async function onClick() {
    if (pwa.installed) { setSheet('done'); return }
    if (pwa.env === 'inapp') { setSheet('inapp'); return }
    if (pwa.env === 'ios')   { setSheet('ios');   return }
    if (pwa.canPrompt) {
      const outcome = await promptInstall()
      if (outcome === 'accepted') setSheet('installing')
      if (outcome === 'unavailable') setSheet('manual')
      return
    }
    setSheet('manual')
  }

  return (
    <>
      <button type="button" onClick={onClick} className={`${s.btn} ${variantClass} ${sizeClass} ${className}`}>
        {pwa.installed ? '✓ Installed' : <>📲 {label}</>}
      </button>
      {sheet && <InstallSheet mode={sheet} env={pwa.env} onClose={() => setSheet(null)} />}
    </>
  )
}

function InstallSheet({ mode, env, onClose }) {
  const closeRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape' && mode !== 'installing') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [mode, onClose])

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.origin); setCopied(true) } catch {}
  }

  const head = (title, sub) => (
    <div className={s.sheetHead}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/examprep_logo.png" alt="" width={52} height={52} />
      <div>
        <p className={s.sheetTitle} id="install-sheet-title">{title}</p>
        {sub && <p className={s.sheetSub}>{sub}</p>}
      </div>
    </div>
  )

  let body
  if (mode === 'installing') {
    body = (
      <>
        {head('Installing ExamPrep A1…', 'Your browser is adding the app to your device.')}
        <div className={s.progress} role="progressbar" aria-label="Installing" aria-busy="true"><span /></div>
        <p className={s.sheetNote}>
          {env === 'android'
            ? 'On Android this can take up to a minute. You can keep browsing; the app will appear on your home screen when it’s ready.'
            : 'This usually takes a few seconds.'}
        </p>
        <div className={s.sheetActions}>
          <button ref={closeRef} type="button" className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>Keep browsing</button>
        </div>
      </>
    )
  } else if (mode === 'done') {
    body = (
      <>
        <div className={s.doneBadge} aria-hidden="true">✓</div>
        <div className={s.center}>
          <p className={s.sheetTitle} id="install-sheet-title">ExamPrep A1 is installed</p>
          <p className={s.sheetSub} style={{ margin: '6px 0 18px' }}>Open it from your home screen or app list, or start right here.</p>
        </div>
        <div className={s.sheetActions}>
          <Link href="/onboarding?mode=signup" className={`${s.btn} ${s.btnBlue}`}>Start practising</Link>
          <button ref={closeRef} type="button" className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>Close</button>
        </div>
      </>
    )
  } else if (mode === 'check') {
    body = (
      <>
        {head('Almost there', 'The install is still finishing in the background.')}
        <p className={s.sheetNote}>Check your home screen or app list for ExamPrep A1. If it isn’t there, tap Install again.</p>
        <div className={s.sheetActions}>
          <Link href="/onboarding?mode=signup" className={`${s.btn} ${s.btnBlue}`}>Start in the browser</Link>
          <button ref={closeRef} type="button" className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>Close</button>
        </div>
      </>
    )
  } else if (mode === 'ios') {
    body = (
      <>
        {head('Add to your Home Screen', 'Takes about 10 seconds. No App Store needed.')}
        <ol className={s.sheetSteps}>
          <li><span>Tap the <strong>Share</strong> button (the square with an arrow) in Safari</span></li>
          <li><span>Scroll down and tap <strong>Add to Home Screen</strong></span></li>
          <li><span>Tap <strong>Add</strong>. ExamPrep A1 now opens like an app</span></li>
        </ol>
        <div className={s.sheetActions}>
          <button ref={closeRef} type="button" className={`${s.btn} ${s.btnBlue}`} onClick={onClose}>Got it</button>
          <Link href="/onboarding?mode=signup" className={`${s.btn} ${s.btnGhost}`}>Start in the browser instead</Link>
        </div>
      </>
    )
  } else if (mode === 'inapp') {
    body = (
      <>
        {head('Open in your browser to install', 'Apps like WhatsApp and Instagram open links in a mini browser that can’t install apps.')}
        <ol className={s.sheetSteps}>
          <li><span>Tap the <strong>⋮</strong> or <strong>•••</strong> menu at the top of this screen</span></li>
          <li><span>Choose <strong>Open in Chrome</strong>, <strong>Open in browser</strong> or <strong>Open in Safari</strong></span></li>
          <li><span>Tap <strong>Install</strong> again on that page</span></li>
        </ol>
        <div className={s.sheetActions}>
          <button type="button" className={`${s.btn} ${s.btnBlue}`} onClick={copyLink}>{copied ? '✓ Link copied' : 'Copy link'}</button>
          <button ref={closeRef} type="button" className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>Close</button>
        </div>
      </>
    )
  } else {
    body = (
      <>
        {head('Install from your browser menu', 'Your browser didn’t offer one-tap install here.')}
        <ol className={s.sheetSteps}>
          {env === 'desktop'
            ? <>
                <li><span>In Chrome or Edge, click the <strong>install icon</strong> at the right end of the address bar</span></li>
                <li><span>Or open the <strong>⋮</strong> menu and choose <strong>Install ExamPrep A1</strong></span></li>
              </>
            : <>
                <li><span>Open this page in <strong>Chrome</strong></span></li>
                <li><span>Tap the <strong>⋮</strong> menu, then <strong>Install app</strong> or <strong>Add to Home screen</strong></span></li>
              </>}
        </ol>
        <p className={s.sheetNote}>Already installed? Open ExamPrep A1 from your home screen or app list.</p>
        <div className={s.sheetActions}>
          <Link href="/onboarding?mode=signup" className={`${s.btn} ${s.btnBlue}`}>Start in the browser</Link>
          <button ref={closeRef} type="button" className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>Close</button>
        </div>
      </>
    )
  }

  // Portal to <body> so the sticky nav's backdrop-filter can't trap the
  // fixed-position sheet; .tokens carries the theme colours with it.
  return createPortal(
    <div className={s.tokens}>
      <div className={s.sheetBackdrop} onClick={mode === 'installing' ? undefined : onClose}>
        <div className={s.sheet} role="dialog" aria-modal="true" aria-labelledby="install-sheet-title" onClick={e => e.stopPropagation()}>
          <div className={s.sheetHandle} aria-hidden="true" />
          {body}
        </div>
      </div>
    </div>,
    document.body
  )
}