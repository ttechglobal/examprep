'use client'
// src/contexts/PlanContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The student's plan, for every screen: usePlan().
//
//   premium / status    lib/plans.js planStatus, from GET /api/student/plan
//                       (cached on the device so it's instant and works offline)
//   access(feature)     lib/plans.js featureAccess with today's uses
//   gate(feature)       true if allowed; otherwise opens the upgrade sheet and
//                       returns false. Call it before starting something.
//   gateTopic(topic)    the same for a topic from /api/student/topics (`free`)
//   recordUse(feature, ref)
//                       a daily-limited session/battle has started (the server
//                       has already counted it; this updates the screen, and
//                       is the only count guests have)
//   denied(body)        the server refused (403 from /api/student/questions):
//                       shows why and refreshes
//   showUpgrade(feature?)
//
// It also shows, once each, the "You've got Premium" welcome while the free
// trial runs (after profile setup, so it never stacks on that prompt), and
// notes when the trial ends, when a paid plan is within 7 days of its end and
// when it has ended (each paid plan's end is noted once). None interrupts a
// practice session, a mock or Battle World.
//
// Each time the upgrade sheet opens for a signed-in student, why it opened is
// recorded for Analytics' upgrade triggers (/api/student/events).
//
// Before the plan is known (first visit, offline with no cache) nothing is
// shown as locked: the server still enforces every rule.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { planStatus, featureAccess, FEATURES, RENEW_REMINDER_DAYS } from '@/lib/plans'
import { appDay } from '@/lib/dates'
import { isProfileComplete } from '@/lib/profileSetup'
import { UpgradeSheet, TrialWelcome, PlanNotice } from '@/components/plan/PlanModals'

const UNKNOWN = { premium: true, source: 'unknown', until: null, daysLeft: null, trialEnded: false, paidEnded: null }
const GUEST   = planStatus({ isGuest: true })
const REFRESH_AFTER_MS = 60_000
const QUIET_PATHS = ['/student/practice/session', '/student/practice/mock', '/student/battle']

const cacheKey  = id => `ep_plan_${id}`
const seenKey   = (kind, id) => `ep_plan_${kind}_${id}`
const GUEST_USE = 'ep_guest_usage'   // { day, refs: { custom: [ref…], battle: [ref…] } }

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function guestUsage() {
  const saved = read(GUEST_USE)
  const refs = saved?.day === appDay() ? saved.refs ?? {} : {}
  return { day: appDay(), refs, usage: Object.fromEntries(Object.entries(refs).map(([key, list]) => [key, list.length])) }
}

// The pop-up this student should see now, if any: { kind, date, seen }.
// `seen` is the device key that stops it showing again; paid plans key by
// their end date, so a renewed plan gets its own reminders.
function whichPopup(status, id) {
  const unseen = (kind, date = null) => {
    const seen = seenKey(date ? `${kind}_${date}` : kind, id)
    return read(seen) ? null : { kind, date, seen }
  }
  if (status.source === 'trial') return unseen('welcome')
  if (status.source === 'paid' && status.until && status.daysLeft <= RENEW_REMINDER_DAYS) return unseen('renew', status.until)
  if (status.source === 'free' && status.paidEnded) return unseen('paid_ended', status.paidEnded)
  if (status.source === 'free' && status.trialEnded) return unseen('trial_ended')
  return null
}

const PlanContext = createContext({
  status: UNKNOWN, premium: true, usage: {},
  access: feature => featureAccess(UNKNOWN, feature), gate: () => true, gateTopic: () => true,
  recordUse: () => {}, denied: () => {}, showUpgrade: () => {}, refresh: () => {},
})
export const usePlan = () => useContext(PlanContext)

export function PlanProvider({ profile, children }) {
  const pathname = usePathname()
  const guest = !!profile?.isGuest
  const id = guest ? null : profile?.id ?? null
  // { id, status, usage, day } — the plan as last loaded for this account
  const [plan, setPlan] = useState(null)
  const [guestUses, setGuestUses] = useState(null)
  const [sheet, setSheet] = useState(null)     // { feature, reason }
  const [popup, setPopup] = useState(null)     // { kind, date, seen } (see whichPopup)
  const counted = useRef(new Set())            // refs this screen already counted
  const lastFetch = useRef(0)

  const refresh = useCallback(async () => {
    if (!id) return
    lastFetch.current = Date.now()
    try {
      const res = await fetch('/api/student/plan', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const next = { id, status: data.status, usage: data.usage ?? {}, day: appDay() }
      write(cacheKey(id), next)
      setPlan(next)
    } catch { /* offline: keep what we have */ }
  }, [id])

  // Load: the device's copy at once, then the server's.
  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (!active) return
      if (guest) { setGuestUses(guestUsage()); return }
      if (!id) return
      const cached = read(cacheKey(id))
      setPlan(cached?.id === id ? cached : null)
      refresh()
    })
    return () => { active = false }
  }, [id, guest, refresh])

  // Back to the app after a while: the plan or the day may have changed.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch.current > REFRESH_AFTER_MS) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  const status = guest ? GUEST : plan?.id === id && plan?.status ? plan.status : UNKNOWN
  const usage = useMemo(() => {
    if (guest) return guestUses?.day === appDay() ? guestUses.usage : {}
    return plan?.day === appDay() ? plan.usage ?? {} : {}
  }, [guest, guestUses, plan])

  const access = useCallback(feature => featureAccess(status, feature, usage[feature] ?? 0), [status, usage])
  const showUpgrade = useCallback((feature = null, reason = null) => setSheet({ feature, reason }), [])

  const gate = useCallback(feature => {
    const result = access(feature)
    if (!result.allowed) setSheet({ feature, reason: result.reason })
    return result.allowed
  }, [access])

  const gateTopic = useCallback(topic => {
    if (status.premium || topic?.free !== false) return true
    setSheet({ feature: 'topic', reason: 'premium' })
    return false
  }, [status.premium])

  const recordUse = useCallback((feature, ref) => {
    if (!FEATURES[feature]?.freePerDay || !ref || counted.current.has(`${feature}:${ref}`)) return
    counted.current.add(`${feature}:${ref}`)
    if (guest) {
      const current = guestUsage()
      const refs = current.refs[feature] ?? []
      if (!refs.includes(ref)) current.refs[feature] = [...refs, ref]
      write(GUEST_USE, { day: current.day, refs: current.refs })
      setGuestUses(guestUsage())
      return
    }
    setPlan(p => p ? { ...p, day: appDay(), usage: { ...(p.day === appDay() ? p.usage : {}), [feature]: ((p.day === appDay() ? p.usage?.[feature] : 0) ?? 0) + 1 } } : p)
    refresh()
  }, [guest, refresh])

  const denied = useCallback(body => {
    const feature = body?.feature ?? null
    if (body?.code === 'daily_limit' && feature) {
      setPlan(p => p ? { ...p, day: appDay(), usage: { ...p.usage, [feature]: body.limit ?? FEATURES[feature]?.freePerDay ?? 0 } } : p)
    }
    setSheet({ feature, reason: body?.code === 'daily_limit' ? 'limit' : 'premium' })
    refresh()
  }, [refresh])

  // Analytics: what made the upgrade sheet appear.
  useEffect(() => {
    if (!sheet || !id) return
    fetch('/api/student/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ event: 'upgrade_view', feature: sheet.feature, reason: sheet.reason ?? 'general' }),
    }).catch(() => {})
  }, [sheet, id])

  // One-time pop-ups, never in the middle of a session or in Battle World.
  const quiet = QUIET_PATHS.some(path => pathname?.startsWith(path))
  useEffect(() => {
    if (!id || quiet || popup || sheet || !isProfileComplete(profile)) return
    const next = whichPopup(status, id)
    if (!next) return
    const timer = setTimeout(() => setPopup(next), 600)
    return () => clearTimeout(timer)
  }, [id, quiet, popup, sheet, profile, status])

  const closePopup = useCallback(() => {
    if (popup) write(popup.seen, true)
    setPopup(null)
  }, [popup])

  const value = useMemo(() => ({
    status, premium: !!status.premium, usage,
    access, gate, gateTopic, recordUse, denied, showUpgrade, refresh,
  }), [status, usage, access, gate, gateTopic, recordUse, denied, showUpgrade, refresh])

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || null
  return <PlanContext.Provider value={value}>
    {children}
    {sheet && <UpgradeSheet feature={sheet.feature} reason={sheet.reason} guest={guest} account={profile} onClose={() => setSheet(null)}/>}
    {!sheet && popup?.kind === 'welcome' && <TrialWelcome until={status.until} name={firstName} onClose={closePopup}/>}
    {!sheet && popup && popup.kind !== 'welcome' && <PlanNotice kind={popup.kind} date={popup.date} onClose={closePopup}
      onUpgrade={() => { closePopup(); setSheet({ feature: null, reason: null }) }}/>}
  </PlanContext.Provider>
}
