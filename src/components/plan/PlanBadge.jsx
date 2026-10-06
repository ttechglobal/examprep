'use client'
// src/components/plan/PlanBadge.jsx
// A small chip on anything Free limits, from the student's live plan:
//   👑 Premium      locked on Free (or `locked`, e.g. a topic past the free five)
//   2 free today    a daily limit with uses left
//   👑 Used today   today's free uses are gone
// Nothing for Premium students, or for features Free doesn't limit.

import { usePlan } from '@/contexts/PlanContext'
import s from './Plan.module.css'

export default function PlanBadge({ feature, locked = false, className = '' }) {
  const plan = usePlan()
  if (plan.premium) return null
  if (locked) return <span className={`${s.badge} ${s.premium} ${className}`}>👑 Premium</span>
  if (!feature) return null
  const access = plan.access(feature)
  if (access.reason === 'premium') return <span className={`${s.badge} ${s.premium} ${className}`}>👑 Premium</span>
  if (access.limit == null) return null
  return access.remaining > 0
    ? <span className={`${s.badge} ${s.limit} ${className}`}>{access.remaining} free today</span>
    : <span className={`${s.badge} ${s.out} ${className}`}>👑 Used today</span>
}
