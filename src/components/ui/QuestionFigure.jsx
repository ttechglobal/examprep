'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { safeSvg } from '@/lib/safeSvg'
import { publicQuestionContent } from '@/lib/studentQuestionContent'
import s from './QuestionFigure.module.css'

export default function QuestionFigure({ question, className = '', label = 'Question diagram' }) {
  const [zoomed, setZoomed] = useState(null)
  const opener = useRef(null)
  const closeButton = useRef(null)
  const content = publicQuestionContent(question ?? {})
  const svg = safeSvg(content.svg_diagram)
  const image = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : content.image_url
  const alt = content.image_description || label
  const open = !!image && zoomed === image
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const onKey = event => {
      if (event.key === 'Escape') setZoomed(null)
      if (event.key === 'Tab') { event.preventDefault(); closeButton.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      if (opener.current?.isConnected) opener.current.focus()
    }
  }, [open])
  if (!image) return null
  return <figure className={`${s.figure} ${className}`}>
    <button type="button" className={s.imageButton} onClick={event => { opener.current = event.currentTarget; setZoomed(image) }} aria-label={`Enlarge ${label.toLowerCase()}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- external bank images and isolated inline SVG */}
      <img src={image} alt={alt} loading="eager" decoding="async" />
      <span className={s.zoomHint} aria-hidden="true">Enlarge diagram</span>
    </button>
    {open && createPortal(<div className={s.lightbox} role="dialog" aria-modal="true" aria-label={label} onClick={() => setZoomed(null)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={alt} />
      <button ref={closeButton} type="button" className={s.close} onClick={() => setZoomed(null)}>Close</button>
    </div>, document.body)}
  </figure>
}
