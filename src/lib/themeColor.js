// src/lib/themeColor.js
// ─────────────────────────────────────────────────────────────────────────────
// Status-bar colour (<meta name="theme-color">).
//
//   While the launch splash is showing → brand navy, matching the splash.
//   Otherwise                          → the app canvas, so the bar blends in
//                                        (light #f0f4ff, dark #0a0c14).
//
// app/layout.js ships navy as the initial value (the phone's own splash uses
// the same colour). ThemeContext and lib/launchSplash.js call this whenever
// the theme changes or the splash ends.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND_NAVY   = '#062A78'
export const CANVAS_LIGHT = '#f0f4ff'
export const CANVAS_DARK  = '#0a0c14'

export function applyThemeColor() {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  const launching = html.classList.contains('ep-launching') && !html.classList.contains('ep-launch-out')
  const color = launching ? BRAND_NAVY : html.classList.contains('dark') ? CANVAS_DARK : CANVAS_LIGHT

  let metas = document.querySelectorAll('meta[name="theme-color"]')
  if (!metas.length) {
    const m = document.createElement('meta')
    m.name = 'theme-color'
    document.head.appendChild(m)
    metas = [m]
  }
  metas.forEach(m => m.setAttribute('content', color))
}
