// src/app/school/dashboard/tabs/shared.js
// Shared helpers, constants and CSS used across all school dashboard tabs.

// ── Formatters ─────────────────────────────────────────────────────────────────
export function pct(n)       { return n == null ? '—' : `${Math.round(n)}%` }
export function initials(n = '?') {
  return (n || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}
export function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
export function lastLabel(d) {
  return d == null ? '—' : d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`
}

// ── Student status ─────────────────────────────────────────────────────────────
export function statusOf(s) {
  const d = s.daysSinceLastPractice ?? 999
  if (d >= 21)                                  return { l: 'Inactive',  c: '#7a8aaa', bg: '#f4f7ff',  border: '#e4eaf5'  }
  if (d >= 14)                                  return { l: 'Slipping',  c: '#d97706', bg: '#FFFBEB',  border: '#fde68a'  }
  if (s.accuracy != null && s.accuracy < 40)    return { l: 'Weak',      c: '#dc2626', bg: '#FEF2F2',  border: '#fecaca'  }
  if (d <= 7)                                   return { l: 'Active',    c: '#059669', bg: '#ECFDF5',  border: '#a7f3d0'  }
  return                                               { l: 'Slipping',  c: '#d97706', bg: '#FFFBEB',  border: '#fde68a'  }
}

export function needsAttention(s) {
  const d = s.daysSinceLastPractice ?? 999
  return d >= 14 || (d <= 7 && s.accuracy != null && s.accuracy < 40)
}

// ── Tier (from atRiskSegmented) ────────────────────────────────────────────────
export const TIER_META = {
  dropped:    { label: 'Dropped off', color: '#d97706', bg: '#FFFBEB', border: '#fde68a',  desc: 'Was active recently, gone quiet this week' },
  inactive:   { label: 'Inactive',    color: '#7a8aaa', bg: '#f4f7ff', border: '#e4eaf5',  desc: 'No activity for 2+ weeks' },
  struggling: { label: 'Struggling',  color: '#dc2626', bg: '#FEF2F2', border: '#fecaca',  desc: 'Active but accuracy below 40%' },
}

// ── Performance colours ────────────────────────────────────────────────────────
export function perfCol(a)   { return a >= 70 ? '#059669' : a >= 45 ? '#d97706' : '#dc2626' }
export function perfBg(a)    { return a >= 70 ? '#ECFDF5' : a >= 45 ? '#FFFBEB' : '#FEF2F2' }
export function perfLabel(a) { return a >= 70 ? 'Strong'  : a >= 45 ? 'Fair'    : 'Weak'    }

// ── Subject meta ───────────────────────────────────────────────────────────────
const SUBJ_ICON = { Mathematics: '📐', 'English Language': '📖', 'Use of English': '📖', Physics: '⚡', Chemistry: '⚗️', Biology: '🧬', Economics: '📊', Government: '🏛️', Geography: '🌍' }
const SUBJ_BG   = { Mathematics: '#EBF1FE', 'English Language': '#ECFDF5', 'Use of English': '#ECFDF5', Physics: '#F5F3FF', Chemistry: '#ECFDF5', Biology: '#FEF2F2', Economics: '#FEF3C7' }
export function sIcon(n) { return SUBJ_ICON[n] || '📚' }
export function sBg(n)   { return SUBJ_BG[n]   || '#f4f7ff' }

// ── Avatar colours ─────────────────────────────────────────────────────────────
const AV_COLORS = ['#1264E5','#7C3AED','#059669','#d97706','#dc2626','#0891b2','#be185d']
export function avColor(name = '') {
  const code = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AV_COLORS[code % AV_COLORS.length]
}

// ── Shared inline CSS ──────────────────────────────────────────────────────────
export const DASH_CSS = `
@keyframes spin    { to { transform: rotate(360deg) } }
@keyframes fadeUp  { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
*, *::before, *::after { box-sizing: border-box }

/* ── Page wrapper ── */
.sd-content { padding: 4px 0 52px; display: flex; flex-direction: column; gap: 20px; animation: fadeUp .22s ease }

/* ── Page header ── */
.sd-page-header  { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 4px }
.sd-page-title   { font-size: 22px; font-weight: 800; color: #071B49; letter-spacing: -.03em }
.sd-page-sub     { font-size: 13px; color: #8896b3; margin-top: 4px }

/* ── Stat grid ── */
.stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px }
.stat-card {
  background: #fff; border-radius: 20px; padding: 22px 20px 18px;
  box-shadow: 0 2px 12px rgba(6,42,120,.06), 0 0 0 1px rgba(6,42,120,.04);
  transition: box-shadow .15s, transform .15s; cursor: default
}
.stat-card:hover { box-shadow: 0 6px 24px rgba(6,42,120,.1), 0 0 0 1px rgba(6,42,120,.06); transform: translateY(-2px) }
.stat-badge  { width:52px; height:52px; border-radius:16px; display:flex; align-items:center; justify-content:center; margin-bottom:16px; flex-shrink:0 }
.stat-val    { font-size: 28px; font-weight: 800; color: #071B49; letter-spacing: -.04em; line-height: 1; margin-bottom: 5px }
.stat-label  { font-size: 12px; color: #8896b3; font-weight: 500 }
.stat-delta  { font-size: 11px; font-weight: 700; margin-top: 8px }

/* ── Panel ── */
.panel {
  background: #fff; border-radius: 20px; overflow: hidden;
  box-shadow: 0 2px 12px rgba(6,42,120,.06), 0 0 0 1px rgba(6,42,120,.04)
}
.panel-head  { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px }
.panel-title { font-size: 14px; font-weight: 700; color: #071B49; letter-spacing: -.01em }
.panel-sub   { font-size: 11px; color: #b0bada; margin-top: 2px }
.view-btn    { font-size: 11px; font-weight: 700; color: #1264E5; border: none; cursor: pointer; font-family: inherit; padding: 5px 12px; border-radius: 8px; background: #EBF1FE; white-space: nowrap }

/* ── Badge ── */
.badge { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 99px; white-space: nowrap }

/* ── Pill filter ── */
.pill       { font-size: 10px; font-weight: 700; padding: 5px 12px; border-radius: 99px; border: 1.5px solid #e4eaf5; background: #fff; color: #7a8aaa; cursor: pointer; font-family: inherit; transition: all .12s; white-space: nowrap }
.pill.active { border-color: #1264E5; background: #EBF1FE; color: #1264E5 }

/* ── Table rows ── */
.th-row { display: grid; gap: 8px; padding: 10px 20px; background: #f8f9ff; border-bottom: 1px solid #eef0f8 }
.th     { font-size: 10px; font-weight: 700; color: #b0bada; letter-spacing: .06em; text-transform: uppercase; text-align: center }
.st-row { display: grid; gap: 8px; padding: 12px 20px; border-bottom: 1px solid #f4f7ff; align-items: center }
.st-row:last-child { border-bottom: none }
.st-av   { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#fff; flex-shrink:0 }
.st-name { font-size: 13px; font-weight: 600; color: #071B49; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.st-sub  { font-size: 10px; color: #b0bada; margin-top: 1px }
.st-center { text-align: center; font-size: 12px; color: #3a4870; font-weight: 600 }

/* ── Bar chart ── */
.bars      { display: flex; align-items: flex-end; gap: 8px; height: 110px; padding: 0 20px 14px }
.bar-col   { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px }
.bar-val   { font-size: 9px; font-weight: 700 }
.bar-rect  { width: 100%; border-radius: 6px 6px 0 0; min-height: 4px }
.bar-label { font-size: 9px; color: #b0bada; white-space: nowrap }

/* ── Subject rows ── */
.subj-row      { display: flex; align-items: center; gap: 10px; padding: 9px 20px; border-top: 1px solid #f4f7ff }
.subj-icon     { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0 }
.subj-name     { flex:1; font-size:12px; font-weight:600; color:#071B49; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.subj-bar-wrap { width: 70px; height: 5px; background: #f0f2f8; border-radius: 99px; overflow: hidden; flex-shrink: 0 }
.subj-bar      { height: 100%; border-radius: 99px }
.subj-pct      { font-size: 11px; font-weight: 700; min-width: 32px; text-align: right; flex-shrink: 0 }

/* ── Donut ── */
.donut-svg   { transform: rotate(-90deg) }
.donut-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; pointer-events: none }

/* ── Invite card ── */
.invite-card      { background: linear-gradient(135deg,#062A78 0%,#1264E5 100%); border-radius: 20px; padding: 22px; color: #fff; box-shadow: 0 4px 20px rgba(6,42,120,.25) }
.invite-code-box  { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); border-radius: 12px; padding: 14px 16px; margin: 14px 0 10px; font-size: 22px; font-weight: 800; letter-spacing: .3em; font-family: monospace; color: #fff; text-align: center }
.invite-copy-btn  { width: 100%; padding: 10px; border-radius: 11px; border: none; background: rgba(255,255,255,.15); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background .13s }
.invite-copy-btn:hover { background: rgba(255,255,255,.25) }

/* ── Attention row ── */
.attn-row { display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-top: 1px solid #f4f7ff }
.attn-av  { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#fff; flex-shrink:0 }

/* ── Overview grid ── */
.ov-grid    { display: grid; grid-template-columns: 1fr 1fr 320px; gap: 20px; align-items: start }
.ov-sidebar { display: flex; flex-direction: column; gap: 16px }

/* ── Search bar ── */
.sd-search-bar         { position: relative }
.sd-search-bar input   { padding: 8px 12px 8px 34px; border-radius: 10px; border: 1px solid #e4eaf5; background: #fff; font-size: 12px; color: #3a4870; outline: none; width: 200px; font-family: inherit }
.sd-search-bar svg     { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none }

/* ── Cohort & Settings grid ── */
.sd-cohort-cols   { display: grid; grid-template-columns: 180px 1fr 220px; gap: 14px; align-items: start }
.sd-settings-cols { display: grid; grid-template-columns: 1fr 220px; gap: 14px }
.cohort-code      { font-size: 28px; font-weight: 700; letter-spacing: .4em; font-family: monospace; color: #065f46 }
.copy-btn         { padding: 7px 14px; border-radius: 8px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit }
.slots-bar-wrap   { height: 7px; background: #f0f2f8; border-radius: 99px; overflow: hidden; margin: 8px 0 }
.slots-bar        { height: 100%; border-radius: 99px }

/* ── Performance tab-style subject buttons ── */
.tab-btn        { font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 8px; border: none; cursor: pointer; font-family: inherit; transition: all .12s; background: #f4f7ff; color: #7a8aaa }
.tab-btn.active { background: #1264E5; color: #fff; font-weight: 700 }
.two-col        { display: grid; grid-template-columns: 1fr 1fr; gap: 16px }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .ov-grid { grid-template-columns: 1fr 1fr !important }
  .ov-sidebar { grid-column: 1/-1; flex-direction: row; flex-wrap: wrap }
  .ov-sidebar > * { flex: 1; min-width: 240px }
}
@media (max-width: 768px) {
  .stat-grid { grid-template-columns: repeat(2,1fr) !important }
  .ov-grid   { grid-template-columns: 1fr !important }
  .ov-sidebar { flex-direction: column }
  .two-col    { grid-template-columns: 1fr !important }
  .sd-cohort-cols   { grid-template-columns: 1fr !important }
  .sd-settings-cols { grid-template-columns: 1fr !important }
  .sd-settings-side { display: none !important }
  .sd-search-bar    { display: none !important }
}
@media (max-width: 480px) {
  .sd-content { padding: 14px 0 36px }
  .stat-grid  { gap: 10px }
}
`