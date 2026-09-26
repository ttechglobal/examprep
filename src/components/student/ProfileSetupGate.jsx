'use client'
// src/components/student/ProfileSetupGate.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Sign-up only asks for a phone/email and password, so every new student
// arrives with an empty profile. Until they add their name and pick their
// exam subjects, Zara asks them to do that first. Practice needs subjects,
// so this can't be dismissed; it hides on the profile page itself and in 1v1.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Zara from '@/components/onboarding/Zara'
import { hasName, hasSubjects, isProfileComplete } from '@/lib/profileSetup'
import s from './ProfileSetupGate.module.css'

export default function ProfileSetupGate({ profile }) {
  const pathname = usePathname()
  const router   = useRouter()
  const buttonRef = useRef(null)

  // Never over a 1v1: it doesn't need subjects, the opponent is waiting, and
  // players who came from an invite link may have no profile at all.
  const visible = !!profile && !isProfileComplete(profile)
    && !pathname.startsWith('/student/profile') && !pathname.startsWith('/student/battle/1v1')

  useEffect(() => {
    if (!visible) return
    buttonRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [visible])

  if (!visible) return null

  const nameDone = hasName(profile)
  const subjectsDone = hasSubjects(profile)
  const firstName = nameDone ? profile.full_name.trim().split(/\s+/)[0] : null

  return (
    <div className={s.backdrop}>
      <div className={s.card} role="dialog" aria-modal="true" aria-labelledby="setup-title" aria-describedby="setup-text">
        <div className={s.head}>
          <Zara size={72} />
          <div>
            <h2 id="setup-title" className={s.title}>
              {firstName ? `One more step, ${firstName}` : 'Welcome to ExamPrep!'}
            </h2>
            <p id="setup-text" className={s.text}>
              Set up your profile so I can give you the right past questions.
            </p>
          </div>
        </div>

        <ul className={s.steps}>
          <li className={s.step}>
            <span className={`${s.tick} ${nameDone ? s.done : ''}`}>{nameDone ? '✓' : '1'}</span>
            <span className={nameDone ? s.stepDone : ''}>Add your name</span>
          </li>
          <li className={s.step}>
            <span className={`${s.tick} ${subjectsDone ? s.done : ''}`}>{subjectsDone ? '✓' : '2'}</span>
            <span className={subjectsDone ? s.stepDone : ''}>Pick your exams and subjects</span>
          </li>
        </ul>

        <button ref={buttonRef} className={s.cta} onClick={() => router.push('/student/profile?setup=1')}>
          Set up my profile
        </button>
      </div>
    </div>
  )
}
