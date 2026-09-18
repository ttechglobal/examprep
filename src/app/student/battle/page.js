'use client'
// src/app/student/battle/page.js
import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { useTheme }            from '@/contexts/ThemeContext'
import { readLocalBattleStats } from '@/lib/battleAI'

const NAVY = '#062A78', GOLD = '#FFB800', GREEN = '#22c55e', RED = '#f43f5e'

function SwordIcon({ size = 22, color = GOLD }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.5 2L22 9.5l-9 9-2-2 7-7L16 7.5l-1.5 1.5-2-2 2-5z" fill={color} opacity=".9"/>
      <path d="M2 22l5-5 2 2-5 5-2-2z" fill={color} opacity=".55"/>
      <path d="M9 13l2 2-5 5-2-2 5-5z" fill={color} opacity=".35"/>
    </svg>
  )
}

export default function BattlePage() {
  const router   = useRouter()
  const { dark } = useTheme()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    setStats(readLocalBattleStats())
    fetch('/api/student/battle/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.stats) setStats(d.stats) })
      .catch(() => {})
  }, [])

  const diff = stats?.ai_difficulty ?? 'easy'
  const diffColor = { easy: GREEN, medium: GOLD, hard: RED }[diff] ?? GREEN

  const MODES = [
    { key: 'computer', label: 'vs Computer', desc: 'Play solo. Works offline.', icon: '🤖', active: true },
    { key: '1v1',      label: '1v1 Live',    desc: 'Challenge a real student.', icon: '🤝', active: false },
    { key: 'group',    label: 'Group Battle', desc: 'Compete with your class.', icon: '👥', active: false },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 80 }}>

      {/* Header card */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20,
        padding: '22px 20px', display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: dark ? '0 4px 16px rgba(0,0,0,.3)' : '0 2px 10px rgba(6,42,120,.07)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: GOLD }} aria-hidden="true"/>
        <div style={{
          width: 52, height: 52, borderRadius: 15, flexShrink: 0,
          background: dark ? 'rgba(255,184,0,.12)' : 'rgba(255,184,0,.09)',
          border: `1px solid ${dark ? 'rgba(255,184,0,.2)' : 'rgba(255,184,0,.15)'}`,
          boxShadow: '0 3px 10px rgba(0,0,0,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SwordIcon size={26} color={GOLD}/>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.03em', lineHeight: 1.1 }}>Battle</div>
          <div style={{ fontSize: 13, color: 'var(--text-tert)', marginTop: 3 }}>Answer questions. Beat the computer. Win XP.</div>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
          padding: '14px 18px',
          boxShadow: dark ? '0 2px 8px rgba(0,0,0,.2)' : '0 1px 4px rgba(6,42,120,.05)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 12 }}>Your Record</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
            {[
              { l: 'Played', v: stats.battles_played,  c: 'var(--text-prim)' },
              { l: 'Won',    v: stats.battles_won,      c: GREEN },
              { l: 'Drawn',  v: stats.battles_drawn,    c: GOLD  },
              { l: 'Lost',   v: stats.battles_lost,     c: RED   },
              { l: 'XP',     v: (stats.total_battle_xp||0).toLocaleString(), c: GOLD },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: c, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tert)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode tiles */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>Choose Mode</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={m.active ? () => router.push('/student/battle/setup') : undefined}
              disabled={!m.active}
              style={{
                padding: '16px 14px', borderRadius: 16, fontFamily: 'inherit',
                border: `1.5px solid ${m.active ? (dark ? 'rgba(255,184,0,.3)' : 'rgba(255,184,0,.35)') : 'var(--border)'}`,
                background: m.active ? (dark ? 'rgba(255,184,0,.06)' : 'rgba(255,184,0,.04)') : 'var(--bg-subtle)',
                cursor: m.active ? 'pointer' : 'not-allowed', opacity: m.active ? 1 : 0.5,
                textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8,
                boxShadow: m.active ? (dark ? '0 3px 10px rgba(0,0,0,.25)' : '0 2px 8px rgba(255,184,0,.1)') : 'none',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: 22 }}>{m.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)' }}>{m.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tert)', lineHeight: 1.4 }}>{m.desc}</div>
              {!m.active && (
                <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-tert)' }}>Soon</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Start CTA */}
      <button
        onClick={() => router.push('/student/battle/setup')}
        style={{
          width: '100%', padding: '15px', borderRadius: 16, border: 'none',
          background: NAVY, color: '#fff', fontSize: 15, fontWeight: 900,
          fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '-.01em',
          boxShadow: '0 4px 0 #031548, 0 6px 20px rgba(6,42,120,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'transform .1s, box-shadow .1s',
        }}
        onPointerDown={e => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = '0 1px 0 #031548' }}
        onPointerUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 0 #031548, 0 6px 20px rgba(6,42,120,.25)' }}
        onPointerLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 0 #031548, 0 6px 20px rgba(6,42,120,.25)' }}
      >
        <SwordIcon size={18} color={GOLD}/> Start Battle
      </button>

      {stats && stats.battles_played > 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tert)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          Computer difficulty:
          <span style={{ fontSize: 11, fontWeight: 800, color: diffColor, background: `${diffColor}18`, border: `1px solid ${diffColor}30`, borderRadius: 999, padding: '2px 8px', textTransform: 'capitalize' }}>{diff}</span>
        </div>
      )}
    </div>
  )
}
