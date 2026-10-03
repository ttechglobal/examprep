'use client'
import { useEffect, useRef } from 'react'
import styles from './BattleWorld.module.css'

export default function BattleDialog({ title, id, onClose, children }) {
  const dialog = useRef(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose },[onClose])
  useEffect(() => {
    const previous = document.activeElement
    const focusable = () => [...dialog.current.querySelectorAll('button:not(:disabled),input,select,textarea,a[href]')]
    focusable()[0]?.focus()
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault();close.current?.();return }
      if (event.key !== 'Tab') return
      const elements = focusable(), first = elements[0], last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus()}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus()}
    }
    document.addEventListener('keydown',onKey)
    return () => {document.removeEventListener('keydown',onKey);previous?.focus()}
  },[])
  return <div className={styles.settingsDialog} onClick={event=>{if (event.target===event.currentTarget) onClose?.()}}>
    <section ref={dialog} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>{children}
    </section>
  </div>
}
