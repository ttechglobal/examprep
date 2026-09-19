'use client'
// src/app/student/battle/page.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { readLocalBattleStats } from '@/lib/battleAI'
import Image from 'next/image'

const GOLD = '#FFB800'

export default function BattlePage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    setStats(readLocalBattleStats())
    fetch('/api/student/battle/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.stats) setStats(d.stats) })
      .catch(() => {})
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── BACKGROUND IMAGE ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Image
          src="/images/battle/battle-bg.png"
          alt=""
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center bottom' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(8,18,80,.50) 0%, rgba(8,18,80,.28) 45%, rgba(8,18,80,.62) 100%)',
        }}/>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
      }}>

        {/* ── CENTERED COLUMN — max 860px, generous side padding ── */}
        <div style={{
          width: '100%', maxWidth: 1500,
          padding: '0 32px',
          display: 'flex', flexDirection: 'column',
          flex: 1,
          boxSizing: 'border-box',
        }}>

          {/* ── Back button ── */}
          <div style={{ paddingTop: 20, paddingBottom: 0 }}>
            <button
              onClick={() => router.push('/student/practice')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,.14)',
                border: '1px solid rgba(255,255,255,.26)',
                borderRadius: 999, padding: '7px 16px 7px 11px',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M13 4l-6 6 6 6" stroke="#fff" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          </div>

          {/* ── HERO SECTION ── */}
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: 0,
            paddingTop: 20, paddingBottom: 28,
          }}>
            {/* Left — text */}
            <div style={{ flex: 1, paddingRight: 16 }}>

              {/* BATTLE MODE chip */}
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: GOLD,
                borderRadius: 999,
                padding: '5px 18px',
                fontSize: 11, fontWeight: 900,
                color: '#1a1200',
                textTransform: 'uppercase', letterSpacing: '.07em',
                marginBottom: 16,
                boxShadow: '0 3px 12px rgba(255,184,0,.45)',
              }}>
                BATTLE MODE
              </div>

              <div style={{
                fontSize: 34, fontWeight: 900, color: '#fff',
                lineHeight: 1.08, letterSpacing: '-.025em', marginBottom: 4,
                textShadow: '0 2px 16px rgba(0,0,0,.4)',
              }}>
                Challenge Yourself
              </div>
              <div style={{
                fontSize: 32, fontWeight: 900, color: GOLD,
                lineHeight: 1.08, letterSpacing: '-.025em', marginBottom: 16,
                textShadow: '0 2px 16px rgba(0,0,0,.3)',
              }}>
                and Win Points!
              </div>
              <div style={{
                fontSize: 14, color: 'rgba(255,255,255,.72)',
                lineHeight: 1.6, maxWidth: 340,
                textShadow: '0 1px 6px rgba(0,0,0,.5)',
              }}>
                Put your knowledge to the test in an exciting battle. Choose a mode and get started!
              </div>
            </div>

            {/* Right — shield + swords hero image */}
            <div style={{ flexShrink: 0, width: 130 }}>
              <Image
                src="/images/battle/battle-icon.png"
                alt="Battle shield and swords"
                width={130}
                height={142}
                priority
                style={{
                  objectFit: 'contain',
                  objectPosition: 'center bottom',
                  filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.5))',
                  display: 'block',
                }}
              />
            </div>
          </div>

          {/* ── BOTTOM PANEL ── */}
          <div style={{
            background: 'rgba(12,20,90,.75)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255,255,255,.13)',
            borderRadius: 28,
            padding: '24px 24px 26px',
            position: 'relative', zIndex: 3,
          }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 15, flexShrink: 0,
                background: 'rgba(255,255,255,.11)',
                border: '1px solid rgba(255,255,255,.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                🎮
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-.01em' }}>
                  Choose a Battle Mode
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.52)', marginTop: 3 }}>
                  Select how you want to battle and start earning points.
                </div>
              </div>
            </div>

            {/* ── BATTLE MODE CARD ── */}
            <ModeCard
              onClick={() => router.push('/student/battle/setup')}
              imageSrc="/images/battle/battle-pvc.png"
              title="Player vs Computer"
              desc="Test your skills against the computer. Answer questions faster and smarter than the AI to earn XP."
              arrowBg="#FF6B00"
              accentColor="#FF8C00"
              active
            />

            {/* Stats row (only when played before) */}
            {stats && stats.battles_played > 0 && (
              <div style={{
                marginTop: 20,
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10,
              }}>
                {[
                  { l: 'Played', v: stats.battles_played ?? 0,                  c: '#fff'    },
                  { l: 'Won',    v: stats.battles_won ?? 0,                      c: '#4ADE80' },
                  { l: 'XP',    v: (stats.total_battle_xp||0).toLocaleString(), c: GOLD      },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{
                    textAlign: 'center',
                    background: 'rgba(255,255,255,.07)',
                    border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: 14, padding: '12px 6px',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: c, lineHeight: 1 }}>{v}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.09em', marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── SPACER pushes footer to bottom ── */}
          <div style={{ flex: 1, minHeight: 20 }}/>

          {/* ── FOOTER — outside the panel, bottom of page ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, padding: '18px 0 24px',
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.15)' }}/>
            <span style={{ fontSize: 18 }}>🏆</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', fontWeight: 600, letterSpacing: '.03em' }}>
              Practice · Improve · Earn Points
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.15)' }}/>
          </div>

        </div>{/* end centered column */}
      </div>
    </div>
  )
}

// ── Mode Card — stacked on mobile (image top, text below), horizontal on desktop
function ModeCard({ onClick, imageSrc, title, desc, arrowBg, accentColor }) {
  return (
    <>
      <style>{`
        .mc-card {
          border-radius: 22px;
          overflow: hidden;
          position: relative;
          border: 2px solid ${accentColor}55;
          box-shadow: 0 8px 0 rgba(0,0,0,.35), 0 14px 40px rgba(0,0,0,.28);
          cursor: pointer;
          transition: transform .13s, box-shadow .13s, filter .13s;
          background: rgba(8,4,20,.92);
          display: flex;
          flex-direction: column;
        }
        .mc-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 0 rgba(0,0,0,.3), 0 22px 48px rgba(0,0,0,.3);
          filter: brightness(1.06);
        }
        .mc-card:active {
          transform: translateY(2px);
          box-shadow: 0 3px 0 rgba(0,0,0,.3), 0 6px 12px rgba(0,0,0,.22);
          filter: brightness(.94);
        }
        /* Mobile: image fills top at 16:7 ratio */
        .mc-img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 7;
          flex-shrink: 0;
        }
        .mc-body {
          display: flex;
          align-items: center;
          padding: 18px 18px 20px;
          gap: 14px;
        }
        /* Desktop ≥640px: horizontal layout */
        @media (min-width: 640px) {
          .mc-card { flex-direction: row; min-height: 160px; }
          .mc-img-wrap { width: 220px; min-width: 220px; aspect-ratio: unset; align-self: stretch; }
          .mc-body { flex: 1; padding: 24px 20px 24px 26px; }
        }
      `}</style>

      <div className="mc-card" onClick={onClick}>

        {/* Image */}
        {imageSrc && (
          <div className="mc-img-wrap">
            <Image
              src={imageSrc}
              alt={title}
              fill
              style={{ objectFit: 'cover', objectPosition: 'center top' }}
            />
            {/* Fade: bottom on mobile, right on desktop */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, transparent 50%, rgba(8,4,20,.92) 100%)',
            }}/>
            <style>{`@media (min-width: 640px) { .mc-img-wrap > div:last-child { background: linear-gradient(to right, transparent 50%, rgba(8,4,20,.92) 100%) !important; } }`}</style>
          </div>
        )}

        {/* Text + CTA */}
        <div className="mc-body">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: `${accentColor}22`,
              border: `1px solid ${accentColor}55`,
              borderRadius: 999,
              padding: '3px 10px',
              fontSize: 9, fontWeight: 900,
              color: accentColor,
              textTransform: 'uppercase', letterSpacing: '.08em',
              marginBottom: 9,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, display: 'inline-block' }}/>
              Available Now
            </div>
            <div style={{
              fontSize: 20, fontWeight: 900, color: '#fff',
              lineHeight: 1.15, marginBottom: 6,
              letterSpacing: '-.02em',
            }}>
              {title}
            </div>
            <div style={{
              fontSize: 13, color: 'rgba(255,255,255,.55)',
              lineHeight: 1.55,
            }}>
              {desc}
            </div>
          </div>

          {/* Arrow CTA */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: arrowBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 5px 0 rgba(0,0,0,.4), 0 8px 20px ${arrowBg}60`,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M11 5l5 5-5 5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
              Play
            </div>
          </div>
        </div>

      </div>
    </>
  )
}