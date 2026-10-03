'use client'
import { useEffect, useRef, useState } from 'react'
import { readBattlePreferences, saveBattlePreferences } from '@/lib/battlePreferences'
import { GameButton, styles } from './BattleWorld'

export default function BattleSettings({ onClose }) {
  const dialog = useRef(null)
  const [settings, setSettings] = useState(readBattlePreferences)
  const [error, setError] = useState(null)
  // Sound changes apply at once, so they can be heard while adjusting.
  function update(patch) { const next = {...settings, ...patch}; setSettings(next); saveBattlePreferences(next) }
  useEffect(() => {
    const previous = document.activeElement
    dialog.current?.querySelector('input')?.focus()
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const elements = [...dialog.current.querySelectorAll('button,input')]
      const first = elements[0], last = elements.at(-1)
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [onClose])
  return <div className={styles.settingsDialog} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="battle-settings-title" ref={dialog}>
      <h2 id="battle-settings-title">Battle settings</h2>
      <label>Sound<input type="checkbox" checked={settings.sound} onChange={e => update({sound:e.target.checked})}/></label>
      <label>Music<input type="checkbox" checked={settings.music} disabled={!settings.sound} onChange={e => update({music:e.target.checked})}/></label>
      <label>Announcer voice<input type="checkbox" checked={settings.voice} disabled={!settings.sound} onChange={e => update({voice:e.target.checked})}/></label>
      <label>Volume {Math.round(settings.volume * 100)}%<input aria-label="Battle volume" type="range" min="0" max="100" value={Math.round(settings.volume * 100)} onChange={e => update({volume:Number(e.target.value)/100})}/></label>
      <label>Reduce animations<input type="checkbox" checked={settings.reducedMotion} onChange={e => setSettings(p => ({ ...p, reducedMotion:e.target.checked }))}/></label>
      <p>Question count and time are chosen in Battle Setup.</p>
      {error && <p role="alert">{error}</p>}
      <GameButton onClick={() => { if (saveBattlePreferences(settings)) onClose(); else setError('Settings could not be saved on this device.') }}>Save settings</GameButton>
      <GameButton secondary onClick={onClose}>Close</GameButton>
    </section>
  </div>
}
