'use client'
// src/components/ui/CoachBanner.jsx — v5
// Zara uses the real PNG asset. Bigger image. Speech bubble floats beside her.
// Mobile: stacked layout with Zara left, bubble right. Desktop: same row, larger.

export default function CoachBanner({ emoji, message, buddy = 'zara', greeting = null }) {
  if (!message) return null
  const name = buddy === 'emeka' ? 'Emeka' : 'Zara'

  return (
    <div style={{
      borderRadius: 16,
      background: 'rgba(18,100,229,.08)',
      border: '1.5px solid rgba(18,100,229,.2)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'flex-end',
      gap: 14,
      position: 'relative',
      overflow: 'visible',
    }}>

      {/* Zara PNG — anchored to bottom of banner */}
      <div style={{
        flexShrink: 0,
        width: 88,
        height: 96,
        position: 'relative',
        alignSelf: 'flex-end',
        marginBottom: -14, // pull her down so she "sits" on the card edge
        marginLeft: -4,
      }}>
        <img
          src="/images/zara_studybuddy.png"
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'bottom center',
            display: 'block',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.35))',
          }}
        />
      </div>

      {/* Speech bubble */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {/* Bubble tail pointing left toward Zara */}
        <div style={{
          position: 'absolute',
          left: -10,
          bottom: 12,
          width: 0,
          height: 0,
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderRight: '10px solid rgba(18,100,229,.18)',
          zIndex: 1,
        }} />
        <div style={{
          background: 'var(--bg-card, rgba(255,255,255,.06))',
          border: '1px solid rgba(18,100,229,.2)',
          borderRadius: 12,
          padding: '10px 13px',
        }}>
          <p style={{
            fontSize: 9,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            color: '#18B7F2',
            marginBottom: 4,
            lineHeight: 1,
          }}>
            {name} · Study Buddy
          </p>
          <p style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-sec)',
            lineHeight: 1.55,
          }}>
            {greeting
              ? <><strong style={{ fontWeight: 800, color: 'var(--text-prim)' }}>{greeting}</strong> — {message}</>
              : message}
          </p>
        </div>
      </div>

    </div>
  )
}