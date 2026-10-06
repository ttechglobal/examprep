'use client'
// src/components/plan/PlanModals.jsx
// The plan's pop-ups, opened by PlanProvider (contexts/PlanContext.jsx):
//   UpgradeSheet   a locked feature or a used-up daily limit; shows the plans
//   TrialWelcome   once, when a new account's free Premium trial is running
//   PlanNotice     once each: the trial has ended · a paid plan ends within
//                  7 days · a paid plan has ended
// Paying is manual for now: "Get Premium" opens a WhatsApp chat with the plan
// and account already typed, and an admin turns Premium on.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Zara from '@/components/onboarding/Zara'
import { FEATURES, PLANS, FREE_TOPICS_PER_SUBJECT, TRIAL_DAYS, priceLabel } from '@/lib/plans'
import { whatsappLink } from '@/lib/contact'
import { formatPhoneForDisplay, isPhoneAuthEmail } from '@/lib/auth/phone'
import s from './Plan.module.css'

const PREMIUM_PERKS = [
  'Every topic in every subject',
  'Full WAEC and JAMB mock exams',
  'Unlimited custom, study and speed practice',
  'Unlimited battles against the computer',
  'Battle your friends (coming soon)',
]
const FREE_KEEPS = [
  'Quick 5, flashcards, lessons and explanations',
  `The first ${FREE_TOPICS_PER_SUBJECT} topics of every subject`,
  `${FEATURES.custom.freePerDay} custom practice session a day`,
  `${FEATURES.battle.freePerDay} battles a day`,
]

// What the student sends us: the plan, and who they are (name, and both the phone
// and the email on the account when they have them, plus their username), taken
// from their account so nobody has to type it. The admin finds them on the
// Students page by any of these.
function premiumRequest(plan, account) {
  const name = account?.full_name?.trim()
  const phone = account?.phone_number ? formatPhoneForDisplay(account.phone_number) : null
  const email = account?.email && !isPhoneAuthEmail(account.email) ? account.email : null
  const who = [name && `Name: ${name}`, phone && `Phone: ${phone}`, email && `Email: ${email}`, account?.username && `Username: ${account.username}`]
    .filter(Boolean).join('\n')
  return `Hi, I'd like ExamPrep A1 Premium: ${plan.name} (${priceLabel(plan.price)}).${who ? `\n\n${who}` : ''}`
}

const formatDate = iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' })

function Modal({ labelledBy, onClose, children }) {
  const card = useRef(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    const previous = document.activeElement
    card.current?.querySelector('button, a[href]')?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = event => { if (event.key === 'Escape') close.current?.() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])
  return <div className={s.backdrop} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={card} className={s.card} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div>
  </div>
}

function headline(feature, reason) {
  const rule = FEATURES[feature]
  if (!rule) return { title: 'Go Premium', text: 'Unlock everything in ExamPrep A1.' }
  if (reason === 'limit') {
    const what = feature === 'battle' ? `today's ${rule.freePerDay} free battles` : `today's free ${rule.name} session`
    return { title: `You've used ${what}`, text: `${rule.pitch} Free uses come back tomorrow.` }
  }
  if (feature === 'topic') return { title: 'This topic is on Premium', text: `Free covers the first ${FREE_TOPICS_PER_SUBJECT} topics of each subject. ${rule.pitch}` }
  return { title: `${rule.name} is on Premium`, text: rule.pitch }
}

/** account: the student's profile (for the WhatsApp message); guest: no account yet. */
export function UpgradeSheet({ feature, reason, guest, account, onClose }) {
  const [planId, setPlanId] = useState(PLANS.find(plan => plan.best)?.id ?? PLANS[0].id)
  const plan = PLANS.find(p => p.id === planId)
  const { title, text } = headline(feature, reason)
  const message = premiumRequest(plan, account)

  return <Modal labelledBy="upgrade-title" onClose={onClose}>
    <div className={s.crown} aria-hidden="true">👑</div>
    <h2 id="upgrade-title" className={s.title}>{title}</h2>
    <p className={s.text}>{text}</p>

    {guest ? <>
      <ul className={s.perks}>{PREMIUM_PERKS.map(perk => <li key={perk}>{perk}</li>)}</ul>
      <Link className={s.cta} href="/onboarding?mode=signup" onClick={onClose}>Create a free account — {TRIAL_DAYS} days of Premium</Link>
    </> : <>
      <div className={s.plans} role="radiogroup" aria-label="Choose a plan">
        {PLANS.map(p => <button key={p.id} type="button" role="radio" aria-checked={p.id === planId}
          className={`${s.plan} ${p.id === planId ? s.planOn : ''}`} onClick={() => setPlanId(p.id)}>
          {p.best && <span className={s.best}>Best value</span>}
          <strong>{priceLabel(p.price)}</strong>
          <span>{p.name}</span>
        </button>)}
      </div>
      <ul className={s.perks}>{PREMIUM_PERKS.map(perk => <li key={perk}>{perk}</li>)}</ul>
      <a className={s.cta} href={whatsappLink(message)} target="_blank" rel="noopener noreferrer"
        onClick={() => fetch('/api/student/events', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
          body: JSON.stringify({ event: 'upgrade_click', feature, plan: planId }),
        }).catch(() => {})}>Get Premium on WhatsApp</a>
      <p className={s.fine}>Send us a message, pay by transfer, and we&apos;ll switch your account to Premium.</p>
    </>}
    <button type="button" className={s.secondary} onClick={onClose}>Not now</button>
  </Modal>
}

export function TrialWelcome({ until, name, onClose }) {
  return <Modal labelledBy="trial-title" onClose={onClose}>
    <div className={s.zara}><Zara size={76}/></div>
    <h2 id="trial-title" className={s.title}>{name ? `${name}, you have ${TRIAL_DAYS} days of Premium` : `You have ${TRIAL_DAYS} days of Premium`}</h2>
    <p className={s.text}>Enjoy the full ExamPrep experience, free, for {TRIAL_DAYS} days{until ? `, until ${formatDate(until)}` : ''}. Nothing is locked.</p>
    <ul className={s.perks}>{PREMIUM_PERKS.map(perk => <li key={perk}>{perk}</li>)}</ul>
    <button type="button" className={s.cta} onClick={onClose}>Start exploring</button>
  </Modal>
}

const NOTICES = {
  trial_ended: () => ({
    title: 'Your Premium trial has ended',
    text: "You're on the Free plan now. You can still use:", list: FREE_KEEPS,
    cta: 'See Premium plans', dismiss: 'Continue on Free',
  }),
  renew: until => ({
    title: 'Your Premium ends soon',
    text: `Your plan ends on ${formatDate(until)}. Renew now and your new plan starts when this one ends, so you don't lose a day.`,
    cta: 'Renew Premium', dismiss: 'Later',
  }),
  paid_ended: until => ({
    title: 'Your Premium has ended',
    text: `Your plan ended on ${formatDate(until)}, so you're on the Free plan. You can still use:`, list: FREE_KEEPS,
    cta: 'Renew Premium', dismiss: 'Continue on Free',
  }),
}

/** kind: 'trial_ended' | 'renew' | 'paid_ended'; date: the plan's end. */
export function PlanNotice({ kind, date, onUpgrade, onClose }) {
  const notice = NOTICES[kind](date)
  return <Modal labelledBy="plan-notice-title" onClose={onClose}>
    <div className={s.zara}><Zara size={76}/></div>
    <h2 id="plan-notice-title" className={s.title}>{notice.title}</h2>
    <p className={s.text}>{notice.text}</p>
    {notice.list && <ul className={`${s.perks} ${s.freeList}`}>{notice.list.map(item => <li key={item}>{item}</li>)}</ul>}
    <button type="button" className={s.cta} onClick={onUpgrade}>{notice.cta}</button>
    <button type="button" className={s.secondary} onClick={onClose}>{notice.dismiss}</button>
  </Modal>
}
