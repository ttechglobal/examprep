// src/lib/launchSplash.js
// ─────────────────────────────────────────────────────────────────────────────
// Ends the installed-app launch splash (see "LAUNCH SPLASH" in globals.css and
// the head script in app/layout.js). Call it once the first real screen is
// ready. Safe to call any number of times, and a no-op when no splash is
// showing (browser tabs, later navigations).
//
// The splash stays up for at least MIN_VISIBLE_MS from the moment the app
// started opening, like a native app's launch screen, so it's seen rather than
// flashed. If the app takes longer to get ready, it fades as soon as it is.
// The head script also removes it after 6 s on its own, so a slow network or
// an error can never leave a student stuck on it.
// ─────────────────────────────────────────────────────────────────────────────

import { applyThemeColor } from '@/lib/themeColor'

const MIN_VISIBLE_MS = 2500   // counted from app open, not from this call
const FADE_MS        = 300

let scheduled = false

export function endLaunchSplash() {
  if (typeof document === 'undefined' || scheduled) return
  const html = document.documentElement
  if (!html.classList.contains('ep-launching')) return
  scheduled = true

  // performance.now() is the time since the page started loading.
  const wait = Math.max(0, MIN_VISIBLE_MS - performance.now())

  setTimeout(() => {
    requestAnimationFrame(() => {
      html.classList.add('ep-launch-out')
      applyThemeColor()
      setTimeout(() => html.classList.remove('ep-launching', 'ep-launch-out'), FADE_MS)
    })
  }, wait)
}