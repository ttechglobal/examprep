'use client'
// src/components/ui/QuestionFigure.jsx
// A question's illustration: its image and/or inline SVG diagram. Used by the
// practice and battle question cards. Images open full screen on tap, so
// small labels stay readable on phones. Height: --figure-max-h (CSS).
//
// question: { image_url, image_description, svg_diagram }  (has_image is the
// bank's flag; a URL alone is enough to show the image)
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { safeSvg } from '@/lib/safeSvg'
import s from './QuestionFigure.module.css'

export default function QuestionFigure({ question, className = '' }) {
  const [zoomed, setZoomed] = useState(false)
  const image = typeof question?.image_url === 'string' && question.image_url.trim() ? question.image_url : null
  const svg = safeSvg(question?.svg_diagram)
  const alt = question?.image_description || 'Question diagram'
  useEffect(() => {
    if (!zoomed) return
    const close = event => { if (event.key === 'Escape') setZoomed(false) }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [zoomed])
  if (!image && !svg) return null
  return <figure className={`${s.figure} ${className}`}>
    {image && <button type="button" className={s.imageButton} onClick={() => setZoomed(true)} aria-label="Enlarge the diagram">
      {/* eslint-disable-next-line @next/next/no-img-element -- bank images live on external storage */}
      <img src={image} alt={alt} loading="eager" decoding="async"/>
      <span className={s.zoomHint} aria-hidden="true">Tap to enlarge</span>
    </button>}
    {svg && <div className={s.svg} role="img" aria-label={alt} dangerouslySetInnerHTML={{ __html: svg }}/>}
    {zoomed && createPortal(<div className={s.lightbox} role="dialog" aria-modal="true" aria-label={alt} onClick={() => setZoomed(false)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={alt}/>
      <button type="button" className={s.close} autoFocus onClick={() => setZoomed(false)}>Close</button>
    </div>, document.body)}
  </figure>
}
