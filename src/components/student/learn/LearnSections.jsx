'use client'
// src/components/student/learn/LearnSections.jsx
// Hero carousel, Learning Tools cards and the tip bar for the Learn page.

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Caveat } from 'next/font/google'
import s from './learn.module.css'
import {
  ArrowRight, ArrowLeft, OpenBook, FlashTile, BookTile, Cell, TriangleFormula,
  Atom, Sprout, Flask, Bolt, Paper, Bulb, Sparkle, Rays,
} from './art'
import { HERO_CHARACTER, HERO_SLIDES, TIPS } from './content'

const hand = Caveat({ subsets: ['latin'], weight: ['700'], display: 'swap' })

const FACES = { atom: Atom, sprout: Sprout, flask: Flask, bolt: Bolt, paper: Paper }

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = e => setReduced(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

// ── Hero ─────────────────────────────────────────────────────────────────────
const AUTO_MS = 7000

function HeroCards({ cards }) {
  const [left, center, right] = cards
  const Face = key => FACES[key] ?? Atom
  const L = Face(left.face), C = Face(center.face), R = Face(right.face)
  return (
    <>
      <div className={`${s.card} ${s.cardLeft}`}><L /><span>{left.label}</span></div>
      <div className={`${s.card} ${s.cardRight}`}><R /><span>{right.label}</span></div>
      <div className={`${s.card} ${s.cardBack}`} />
      <div className={`${s.card} ${s.cardFront}`}><C /><span>{center.label}</span></div>
    </>
  )
}

export function LearnHero() {
  const [index, setIndex]   = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = usePrefersReducedMotion()
  const count   = HERO_SLIDES.length
  const slide   = HERO_SLIDES[index]
  const [imgOk, setImgOk] = useState(true)

  const go = useCallback(i => setIndex((i + count) % count), [count])

  useEffect(() => {
    if (paused || reduced || count < 2) return
    const t = setTimeout(() => go(index + 1), AUTO_MS)
    return () => clearTimeout(t)
  }, [index, paused, reduced, count, go])

  return (
    <section
      className={s.hero}
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false) }}
    >
      <div className={s.heroGlow} aria-hidden="true" />
      <span className={s.spark1}><Sparkle size={30} /></span>
      <span className={s.spark2}><Sparkle size={14} color="#7EA6FF" /></span>
      <span className={s.spark3}><Sparkle size={12} color="#7EA6FF" /></span>
      <span className={s.spark4}><Sparkle size={16} color="#5B8CFF" /></span>

      <div
        key={slide.id}
        className={s.heroText}
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${count}`}
        aria-live={paused ? 'polite' : 'off'}
      >
        <p className={s.eyebrow}>{slide.eyebrow}</p>
        <h1 className={s.heroTitle}>
          {slide.title} <em>{slide.accent}</em>
        </h1>
        <p className={s.heroBody}>{slide.body}</p>
        <Link href={slide.href} className={s.heroCta}>
          <OpenBook /> {slide.cta} <ArrowRight />
        </Link>
      </div>

      <div className={s.heroArt} aria-hidden="true">
        <HeroCards key={slide.id} cards={slide.cards} />
        {imgOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={HERO_CHARACTER} alt="" className={s.character} onError={() => setImgOk(false)} />
        )}
      </div>

      <p className={`${s.note} ${hand.className}`} aria-hidden="true">
        {slide.note[0]}<br />{slide.note[1]}
        <svg width="100" height="14" viewBox="0 0 100 14"><path d="M2 11C30 3 64 2 98 5" stroke="#FFC53D" strokeWidth="3.5" fill="none" strokeLinecap="round" /></svg>
      </p>

      <div className={s.dots}>
        {HERO_SLIDES.map((sl, i) => (
          <button
            key={sl.id} type="button"
            aria-label={`Show slide ${i + 1}: ${sl.accent}`}
            aria-current={i === index}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  )
}

// ── Learning Tools ───────────────────────────────────────────────────────────
function StackedCard({ children, tone }) {
  return (
    <div className={s.stack} data-tone={tone} aria-hidden="true">
      <span className={s.rays}><Rays /></span>
      <i /><i />
      <div className={s.stackFace}>{children}</div>
    </div>
  )
}

export function FlashcardsTool() {
  return (
    <article className={`${s.tool} ${s.toolFlash}`}>
      <div className={s.toolIcon}><FlashTile /></div>
      <div className={s.toolBody}>
        <h3 className={s.toolTitle}>
          Flashcards <span className={s.badgeLive}>Live</span>
        </h3>
        <p className={s.toolText}>
          Quick, interactive flashcards to help you remember key concepts and boost your exam performance.
        </p>
      </div>
      <Link href="/student/learn/flashcards" className={s.toolBtn}>
        Start Flashcards <ArrowRight />
      </Link>
      <StackedCard tone="flash">
        <strong>Mitosis</strong>
        <Cell />
      </StackedCard>
    </article>
  )
}

export function FormulasTool() {
  return (
    <article className={`${s.tool} ${s.toolSoon}`}>
      <div className={s.toolIcon}><BookTile /></div>
      <div className={s.toolBody}>
        <h3 className={s.toolTitle}>
          Key Formulas <span className={s.badgeSoon}>Coming Soon</span>
        </h3>
        <p className={s.toolText}>A collection of key formulas with clear explanations and quick checks.</p>
      </div>
      <button type="button" className={s.toolBtnSoon} disabled>Coming Soon</button>
      <StackedCard tone="soon">
        <TriangleFormula />
      </StackedCard>
    </article>
  )
}

// ── Tip bar ──────────────────────────────────────────────────────────────────
export function TipBar() {
  // Start on a tip that changes daily, so returning students see something new.
  const [i, setI] = useState(0)
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    setI(Math.floor(Date.now() / 86_400_000) % TIPS.length)
  }, [])
  const go = d => setI(v => (v + d + TIPS.length) % TIPS.length)

  return (
    <section className={s.tip} aria-label="Study tip">
      <span className={s.tipIcon}><Bulb /></span>
      <div className={s.tipText}>
        <p className={s.tipTitle}>Tip</p>
        <p className={s.tipBody} aria-live="polite">{TIPS[i]}</p>
      </div>
      <div className={s.tipNav}>
        <button type="button" onClick={() => go(-1)} aria-label="Previous tip"><ArrowLeft /></button>
        <button type="button" onClick={() => go(1)} aria-label="Next tip"><ArrowRight /></button>
      </div>
    </section>
  )
}

export { s as styles }
