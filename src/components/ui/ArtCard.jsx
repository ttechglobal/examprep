'use client'
// src/components/ui/ArtCard.jsx
// v3: Home and Practice opt into the same illustrated card treatment.
// Big illustrated action cards, used on Home (Practice / Battle) and Practice
// (Topic / Mock). Styles: ./ArtCard.module.css.
//
// The card is a gradient with real text and a real button; the picture
// (background + characters, no text) loads lazily on top and fades in, so the
// card is complete before, or without, its image.
//
//   <ArtCardRow>
//     <ArtCard href="/student/practice" art={{ image, fallback }} chip="Practice mode"
//              chipIcon="📘" title="…" desc="…" cta="Start Practising" />
//   </ArtCardRow>
//
// Props: href (link) or onClick (button) · art { image, fallback } ·
//        chip, chipIcon, chipBoxed (icon in a white tile) · title · desc · cta ·
//        ctaStyle 'gold' | 'white' · ctaInk (text colour of a white button) ·
//        tall (height when side by side, default 280) · badge (corner chip) ·
//        variant ('practice' | 'home', optional illustrated treatment).

import Link from 'next/link'
import LazyImage from '@/components/ui/LazyImage'
import s from './ArtCard.module.css'

export function ArtCardRow({ children }) {
  return <div className={s.row}><div className={s.grid}>{children}</div></div>
}

export default function ArtCard({
  href, onClick, art, chip, chipIcon, chipBoxed = false, badge = null,
  title, desc, cta, ctaStyle = 'gold', ctaInk, tall, variant,
}) {
  const style = {
    background: art.fallback,
    ...(ctaInk && { '--cta-ink': ctaInk }),
    ...(tall && { '--card-tall': `${tall}px` }),
  }
  const cardClass = [s.card, (variant === 'practice' || variant === 'home') && s.illustrated, variant === 'home' && s.home].filter(Boolean).join(' ')
  const content = (
    <>
      <LazyImage src={art.image} className={s.art} />
      <span className={s.scrim} aria-hidden="true" />
      <span className={s.body}>
        <span className={chipBoxed ? `${s.chip} ${s.chipBoxed}` : s.chip}>
          <span className={chipBoxed ? s.chipIcon : undefined} aria-hidden="true">{chipIcon}</span>
          {chip}
        </span>
        {badge && <span className={s.badge}>{badge}</span>}
        <span className={s.title}>{title}</span>
        <span className={s.desc}>{desc}</span>
        <span className={`${s.cta} ${ctaStyle === 'white' ? s.ctaWhite : s.ctaGold}`}>
          {cta}
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </>
  )

  return href
    ? <Link href={href} className={cardClass} style={style}>{content}</Link>
    : <button type="button" onClick={onClick} className={cardClass} style={style}>{content}</button>
}
