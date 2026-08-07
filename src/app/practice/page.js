// src/app/practice/page.js
// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC free practice page — no login required.
// SEO target: "WAEC CBT practice online", "JAMB free practice", "WAEC past
//              questions", "free CBT practice Nigeria"
//
// Flow:
//   1. Pick exam (WAEC / JAMB / IGCSE)
//   2. Pick subject (loaded from DB, filtered by exam)
//   3. Pick question count
//   4. → writes practice_config to sessionStorage → /student/practice/session
//      (session page has no auth requirement — it just fetches questions)
//   5. After session → /student/practice/results
//      (results page detects guest and shows signup wall)
// ─────────────────────────────────────────────────────────────────────────────

import { Metadata } from 'next'

export const metadata = {
  title: 'Free WAEC & JAMB CBT Practice — ExamPrep',
  description: 'Practice WAEC and JAMB past questions for free online. No sign-up needed. Get instant feedback on every question.',
  keywords: ['WAEC CBT practice', 'JAMB free practice', 'WAEC past questions online', 'free CBT practice Nigeria', 'JAMB UTME practice', 'WAEC objective questions'],
  openGraph: {
    title: 'Free WAEC & JAMB CBT Practice',
    description: 'Start practising WAEC and JAMB past questions right now. No account needed.',
    type: 'website',
  },
}

export { default } from './_client'