// src/lib/launchSplash.js
// ─────────────────────────────────────────────────────────────────────────────
// Ends the installed-app launch splash (see "LAUNCH SPLASH" in globals.css and
// the head script in app/layout.js). Call it once the first real screen is
// ready to show. Safe to call any number of times, and a no-op when no splash
// is showing (browser tabs, later navigations).
//
// The head script also ends it after 5 s on its own, so a slow network or an
// error can never leave a student stuck on the splash.
// ─────────────────────────────────────────────────────────────────────────────

import { applyThemeColor } from '@/lib/themeColor'

const FADE_MS = 300

export function endLaunchSplash() {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  if (!html.classList.contains('ep-launching') || html.classList.contains('ep-launch-out')) return
  // Let the screen underneath paint first, then fade the splash away.
  requestAnimationFrame(() => {
    html.classList.add('ep-launch-out')
    applyThemeColor()
    setTimeout(() => html.classList.remove('ep-launching', 'ep-launch-out'), FADE_MS)
  })
}
