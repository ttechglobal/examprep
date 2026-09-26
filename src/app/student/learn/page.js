'use client'
// src/app/student/learn/page.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// Learn hub: featured carousel (Flashcards, Learning World, Past Questions),
// Learning Tools, and a rotating study tip.
//
// v3 drops "Continue Learning" (its links pointed at /student/learn/lesson/*
// and /student/learn/all, which don't exist) and "Your Activity Today"
// (now on the profile page). Learning World moved into the carousel.
// Copy lives in components/student/learn/content.js.
// ─────────────────────────────────────────────────────────────────────────────

import {
  LearnHero, FlashcardsTool, FormulasTool, TipBar, styles as s,
} from '@/components/student/learn/LearnSections'

export default function LearnPage() {
  return (
    <div className={s.page}>
      <LearnHero />

      <section aria-labelledby="learning-tools">
        <h2 id="learning-tools" className={s.sectionTitle}>Learning Tools</h2>
        <p className={s.sectionSub}>Essential tools to help you learn, recall and perform better.</p>
      </section>

      <div className={s.tools}>
        <FlashcardsTool />
        <FormulasTool />
      </div>

      <TipBar />
    </div>
  )
}
