'use client'
// src/components/battle/BattleEntryCard.jsx
import { useRouter } from 'next/navigation'
import { useTheme }  from '@/contexts/ThemeContext'

const NAVY = '#062A78'
const GOLD = '#FFB800'

function SwordIcon({ size = 24, color = GOLD }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14.5 2L22 9.5l-9 9-2-2 7-7L16 7.5l-1.5 1.5-2-2 2-5z" fill={color} opacity=".9"/>
      <path d="M2 22l5-5 2 2-5 5-2-2z" fill={color} opacity=".55"/>
      <path d="M9 13l2 2-5 5-2-2 5-5z" fill={color} opacity=".35"/>
    </svg>
  )
}

export default function BattleEntryCard({ compact = false }) {
  const router   = useRouter()
  const { dark } = useTheme()

  return (
    <div
      role="button" tabIndex={0}
      aria-label="Go to Battle mode"
      onClick={() => router.push('/student/battle')}
      onKeyDown={e => e.key === 'Enter' && router.push('/student/battle')}
      style={{
        position:   'relative',
        borderRadius: compact ? 18 : 20,
        background: 'var(--bg-card)',
        border:     '1px solid var(--border)',
        boxShadow:  dark
          ? '0 2px 12px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.2)'
          : '0 2px 12px rgba(6,42,120,.08), 0 1px 3px rgba(6,42,120,.05)',
        padding:    compact ? '16px 18px 16px 22px' : '20px 22px 20px 26px',
        display:    'flex', alignItems: 'center', gap: 16,
        cursor:     'pointer', overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Gold left accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: GOLD, borderRadius: '4px 0 0 4px' }} aria-hidden="true"/>

      {/* Icon */}
      <div style={{
        width: compact ? 42 : 48, height: compact ? 42 : 48, borderRadius: 13, flexShrink: 0,
        background: dark ? 'rgba(255,184,0,.12)' : 'rgba(255,184,0,.09)',
        border:     `1px solid ${dark ? 'rgba(255,184,0,.2)' : 'rgba(255,184,0,.16)'}`,
        boxShadow:  dark ? '0 3px 8px rgba(0,0,0,.3)' : '0 2px 6px rgba(255,184,0,.12)',
        display:    'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <SwordIcon size={compact ? 21 : 24} color={GOLD}/>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: compact ? 15 : 17, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.02em', lineHeight: 1.2 }}>
            Battle
          </span>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: '.09em', padding: '2px 7px',
            borderRadius: 999, textTransform: 'uppercase',
            background: dark ? 'rgba(255,255,255,.08)' : 'rgba(6,42,120,.07)',
            color: 'var(--text-tert)',
            border: `1px solid ${dark ? 'rgba(255,255,255,.1)' : 'rgba(6,42,120,.1)'}`,
          }}>
            VS Computer
          </span>
        </div>
        <p style={{ fontSize: compact ? 12 : 13, color: 'var(--text-tert)', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Answer questions. Beat the computer. Win XP.
        </p>
      </div>

      {/* Play button */}
      <button
        onClick={e => { e.stopPropagation(); router.push('/student/battle') }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: compact ? '8px 14px' : '10px 18px',
          borderRadius: 11, border: 'none', cursor: 'pointer',
          background: NAVY, color: '#fff',
          fontSize: 13, fontWeight: 900, fontFamily: 'inherit',
          boxShadow: '0 4px 0 #031548, 0 5px 14px rgba(6,42,120,.25)',
          flexShrink: 0, whiteSpace: 'nowrap',
          transition: 'transform .1s, box-shadow .1s',
        }}
        onPointerDown={e => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = '0 1px 0 #031548' }}
        onPointerUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 0 #031548, 0 5px 14px rgba(6,42,120,.25)' }}
        onPointerLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 0 #031548, 0 5px 14px rgba(6,42,120,.25)' }}
        aria-label="Play Battle"
      >
        Play
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 7h8M8 4l3 3-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}
