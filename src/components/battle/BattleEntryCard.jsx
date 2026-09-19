'use client'
// src/components/battle/BattleEntryCard.jsx
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function BattleEntryCard({ compact = false }) {
  const router = useRouter()

  return (
    <>
      <style>{`
        .bec-root {
          transition: transform .13s, box-shadow .13s;
        }
        .bec-root:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 40px rgba(6,20,80,.45) !important;
        }
        .bec-root:active {
          transform: translateY(2px);
          box-shadow: 0 2px 8px rgba(6,20,80,.3) !important;
        }
        .bec-cta {
          transition: transform .1s, box-shadow .1s;
        }
        .bec-cta:hover  { transform: translateY(-1px); }
        .bec-cta:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #b83e00 !important;
        }
      `}</style>

      <div
        className="bec-root"
        role="button"
        tabIndex={0}
        aria-label="Go to Battle mode"
        onClick={() => router.push('/student/battle')}
        onKeyDown={e => e.key === 'Enter' && router.push('/student/battle')}
        style={{
          position: 'relative',
          borderRadius: compact ? 18 : 22,
          overflow: 'hidden',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          display: 'flex',
          alignItems: 'stretch',
          minHeight: compact ? 120 : 148,
          boxShadow: '0 6px 0 rgba(6,20,80,.45), 0 10px 32px rgba(6,20,80,.32)',
        }}
      >

        {/* ── BACKGROUND IMAGE ── */}
        <Image
          src="/images/battle/battle-bg.png"
          alt=""
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center center' }}
        />

        {/* ── Dark overlay so text pops ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(110deg, rgba(8,18,90,.82) 0%, rgba(8,18,90,.72) 50%, rgba(8,18,90,.30) 100%)',
          pointerEvents: 'none',
        }}/>

        {/* ── Diagonal sheen ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(120deg, rgba(255,255,255,.07) 0%, transparent 55%)',
          pointerEvents: 'none',
        }}/>

        {/* ── LEFT CONTENT ── */}
        <div style={{
          flex: 1,
          padding: compact ? '16px 14px 16px 18px' : '20px 14px 20px 22px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative', zIndex: 2,
        }}>

          {/* "Battle" chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            alignSelf: 'flex-start',
            background: 'rgba(255,255,255,.15)',
            border: '1px solid rgba(255,255,255,.25)',
            borderRadius: 999,
            padding: '4px 12px 4px 9px',
            marginBottom: compact ? 8 : 10,
            backdropFilter: 'blur(6px)',
          }}>
            {/* tiny crossed swords */}
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l5 5M14 2L9 7M3 13.5l4-4M13 13.5l-4-4"
                stroke="#fff" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
            <span style={{
              fontSize: 10, fontWeight: 800, color: '#fff',
              letterSpacing: '.09em', textTransform: 'uppercase',
            }}>
              Battle
            </span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: compact ? 12 : 16 }}>
            <div style={{
              fontSize: compact ? 18 : 22,
              fontWeight: 900, color: '#fff',
              letterSpacing: '-.02em', lineHeight: 1.12,
              marginBottom: 2,
              textShadow: '0 2px 10px rgba(0,0,0,.4)',
            }}>
              Challenge Yourself
            </div>
            <div style={{
              fontSize: compact ? 17 : 21,
              fontWeight: 900, color: '#FFB800',
              letterSpacing: '-.02em', lineHeight: 1.12,
              marginBottom: compact ? 6 : 8,
              textShadow: '0 2px 10px rgba(0,0,0,.3)',
            }}>
              and Win Points!
            </div>
            <div style={{
              fontSize: compact ? 11 : 12,
              color: 'rgba(255,255,255,.62)',
              lineHeight: 1.5,
            }}>
              Put your knowledge to the test{'\n'}and win points.
            </div>
          </div>

          {/* Orange CTA button */}
          <button
            className="bec-cta"
            onClick={e => { e.stopPropagation(); router.push('/student/battle') }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              alignSelf: 'flex-start',
              background: 'linear-gradient(135deg, #FF6B00 0%, #FF5200 100%)',
              border: 'none', borderRadius: 999,
              padding: compact ? '9px 16px' : '11px 20px',
              boxShadow: '0 4px 0 #b83e00, 0 6px 18px rgba(255,100,0,.38)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            aria-label="Start Battle"
          >
            {/* Play triangle */}
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 1.5l8 4.5-8 4.5V1.5z"
                fill="#fff" stroke="#fff" strokeWidth=".3" strokeLinejoin="round"/>
            </svg>
            <span style={{
              fontSize: compact ? 12 : 13,
              fontWeight: 900, color: '#fff',
              letterSpacing: '.01em',
            }}>
              Start Battle
            </span>
            {/* Arrow */}
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4"
                stroke="#fff" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* ── RIGHT — battle icon image ── */}
        <div style={{
          width: compact ? 124 : 152,
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
          // align image to bottom of card
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          <Image
            src="/images/battle/battle-icon.png"
            alt="Battle shield and swords"
            width={compact ? 124 : 152}
            height={compact ? 130 : 160}
            style={{
              objectFit: 'contain',
              objectPosition: 'center bottom',
              filter: 'drop-shadow(0 6px 20px rgba(0,0,0,.55))',
              display: 'block',
            }}
          />
        </div>

      </div>
    </>
  )
}