'use client'
// src/app/student/battle/page.js
// Battle hub: the student's recent form, then the battle modes.
//
// v2: recent form strip (last 10 results, W/D/L) replaces the plain stats row;
// Player vs Player shows as "Coming soon" (not clickable). The 1v1 build lives
// at /student/battle/1v1 and is not linked from anywhere yet.
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { readLocalBattleStats, pickBattleStats } from '@/lib/battleAI'
import RecentForm from '@/components/battle/RecentForm'
import Image from 'next/image'

const GOLD = '#FFB800'

export default function BattlePage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)

  // Device record first (instant, works offline and for guests), then the
  // server's — whichever has the more recent match wins.
  useEffect(() => {
    const local = readLocalBattleStats()
    setStats(local)
    fetch('/api/student/battle/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.stats) setStats(pickBattleStats(local, d.stats)) })
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

          {/* ── RECENT FORM ── */}
          {stats && (
            <RecentForm
              form={stats.recent_form}
              played={stats.battles_played}
              totals={[
                { l: 'Played',    v: stats.battles_played ?? 0,                         c: '#fff'    },
                { l: 'Won',       v: stats.battles_won ?? 0,                            c: '#4ADE80' },
                { l: 'Battle XP', v: (stats.total_battle_xp || 0).toLocaleString(),     c: '#FFB800' },
              ]}
            />
          )}

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

            {/* ── BATTLE MODES — stacked on phones, side by side on desktop ── */}
            <ModeGrid>
              <ModeCard
                onClick={() => router.push('/student/battle/setup')}
                imageSrc="/images/battle/battle-pvc.png"
                title="Player vs Computer"
                desc="Test your skills against the computer. Answer questions faster and smarter than the AI to earn XP."
                arrowBg="#FF6B00"
                accentColor="#FF8C00"
              />

              <ModeCard
                imageSrc="/images/battle/battle-pvp.png"
                title="Player vs Player"
                desc="Challenge a friend with a code or QR, answer the same questions, and see who comes out on top."
                arrowBg="#7C3AED"
                accentColor="#A78BFA"
                comingSoon
              />
            </ModeGrid>
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

// ── Mode cards ────────────────────────────────────────────────────────────────
// Phones: stacked, image on top. Tablet: one per row, image beside the text.
// Desktop (≥900px): side by side, image on top.
function ModeGrid({ children }) {
  return (
    <>
      <style>{`
        .mc-card {
          border-radius: 22px;
          overflow: hidden;
          position: relative;
          border: 2px solid var(--mc-accent);
          box-shadow: 0 8px 0 rgba(0,0,0,.35), 0 14px 40px rgba(0,0,0,.28);
          cursor: pointer;
          transition: transform .13s, box-shadow .13s, filter .13s;
          background: rgba(8,4,20,.92);
          display: flex;
          flex-direction: column;
        }
        .mc-card:not(.mc-soon):hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 0 rgba(0,0,0,.3), 0 22px 48px rgba(0,0,0,.3);
          filter: brightness(1.06);
        }
        .mc-card:not(.mc-soon):active {
          transform: translateY(2px);
          box-shadow: 0 3px 0 rgba(0,0,0,.3), 0 6px 12px rgba(0,0,0,.22);
          filter: brightness(.94);
        }
        .mc-soon { cursor: not-allowed; box-shadow: 0 5px 0 rgba(0,0,0,.3); }
        .mc-soon .mc-img-wrap, .mc-soon .mc-cta { filter: grayscale(1) opacity(.55); }
        .mc-img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 7;
          flex-shrink: 0;
        }
        .mc-fade { position:absolute; inset:0; background: linear-gradient(to bottom, transparent 50%, rgba(8,4,20,.92) 100%); }
        .mc-body {
          display: flex;
          align-items: center;
          padding: 18px 18px 20px;
          gap: 14px;
        }
        .mc-grid { display: grid; gap: 16px; }
        /* Tablet: one card per row, image beside the text */
        @media (min-width: 640px) and (max-width: 899px) {
          .mc-card { flex-direction: row; min-height: 160px; }
          .mc-img-wrap { width: 220px; min-width: 220px; aspect-ratio: unset; align-self: stretch; }
          .mc-body { flex: 1; padding: 24px 20px 24px 26px; }
          .mc-fade { background: linear-gradient(to right, transparent 50%, rgba(8,4,20,.92) 100%); }
        }
        /* Desktop: the modes side by side, image on top */
        @media (min-width: 900px) {
          .mc-grid { grid-template-columns: 1fr 1fr; gap: 20px; }
          .mc-img-wrap { aspect-ratio: 16 / 8; }
          .mc-body { flex: 1; padding: 22px 24px 24px; }
        }
      `}</style>
      <div className="mc-grid">{children}</div>
    </>
  )
}

// comingSoon: greyed out, not clickable, "Coming soon" badge.
// imageSrc: artwork in /public; VsArt shows until the file exists.
function ModeCard({ onClick, imageSrc, title, desc, arrowBg, accentColor, comingSoon = false }) {
  const [imgFailed, setImgFailed] = useState(false)
  const cls = comingSoon ? 'mc-card mc-soon' : 'mc-card'
  return (
    <div
      className={cls}
      style={{ '--mc-accent': `${accentColor}55` }}
      onClick={comingSoon ? undefined : onClick}
      role={comingSoon ? undefined : 'button'}
      aria-disabled={comingSoon || undefined}
      tabIndex={comingSoon ? -1 : 0}
      onKeyDown={comingSoon ? undefined : e => { if (e.key === 'Enter' || e.key === ' ') onClick?.() }}
    >
      {/* Image — or built-in artwork until the image file exists */}
      <div className="mc-img-wrap">
        {imageSrc && !imgFailed
          ? <Image src={imageSrc} alt={title} fill onError={() => setImgFailed(true)}
              style={{ objectFit: 'cover', objectPosition: 'center top' }}/>
          : <VsArt accent={accentColor}/>}
        <div className="mc-fade"/>
      </div>

      {/* Text + CTA */}
      <div className="mc-body">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: comingSoon ? 'rgba(255,255,255,.1)' : `${accentColor}22`,
            border: `1px solid ${comingSoon ? 'rgba(255,255,255,.25)' : `${accentColor}55`}`,
            borderRadius: 999, padding: '3px 10px',
            fontSize: 9, fontWeight: 900,
            color: comingSoon ? 'rgba(255,255,255,.8)' : accentColor,
            textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 9,
          }}>
            {comingSoon
              ? <>🔒 Coming soon</>
              : <><span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, display: 'inline-block' }}/> Available Now</>}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: comingSoon ? 'rgba(255,255,255,.75)' : '#fff', lineHeight: 1.15, marginBottom: 6, letterSpacing: '-.02em' }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: comingSoon ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.55)', lineHeight: 1.55 }}>
            {desc}
          </div>
        </div>

        {/* Arrow CTA */}
        <div className="mc-cta" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%', background: arrowBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 5px 0 rgba(0,0,0,.4), 0 8px 20px ${arrowBg}60`,
          }}>
            {comingSoon
              ? <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="4" y="9" width="12" height="8" rx="2" stroke="#fff" strokeWidth="2"/><path d="M7 9V6.5a3 3 0 016 0V9" stroke="#fff" strokeWidth="2"/></svg>
              : <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            {comingSoon ? 'Soon' : 'Play'}
          </div>
        </div>
      </div>
    </div>
  )
}

// Placeholder artwork (two players, VS) used until a mode image is added.
function VsArt({ accent }) {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
      background: `radial-gradient(circle at 30% 40%, ${accent}55, transparent 60%), radial-gradient(circle at 70% 60%, #1264E555, transparent 60%), #140B3A`,
    }}>
      <span style={{ fontSize: 44 }}>🧑🏾‍🎓</span>
      <span style={{ fontSize: 26, fontWeight: 900, color: GOLD, textShadow: '0 2px 10px rgba(0,0,0,.5)' }}>VS</span>
      <span style={{ fontSize: 44 }}>🧑🏽‍🎓</span>
    </div>
  )
}
