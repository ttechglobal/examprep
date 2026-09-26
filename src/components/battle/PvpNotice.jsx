'use client'
// src/components/battle/PvpNotice.jsx
// Friendly overlay for 1v1 problems, with Zara. PVP_FULL gets its own copy
// and a "Play the computer" way out; other errors show pvpMessage().
import { useRouter } from 'next/navigation'
import Zara from '@/components/onboarding/Zara'
import { pvpMessage } from '@/lib/pvp/client'

const NAVY = '#12195A', GOLD = '#FFB800', GOLD2 = '#CC8F00'

export default function PvpNotice({ error, onClose, onRetry }) {
  const router = useRouter()
  if (!error) return null
  const full = error === 'PVP_FULL'

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(6,12,44,.78)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 24, padding: '24px 22px 20px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.45)' }}>
        <Zara size={96} style={{ margin: '0 auto' }}/>
        <div style={{ fontSize: 19, fontWeight: 900, color: NAVY, marginTop: 10, letterSpacing: '-.01em' }}>
          {full ? 'The battle arena is packed!' : 'Hmm, that didn\'t work'}
        </div>
        <div style={{ fontSize: 14, color: '#4B5563', marginTop: 8, lineHeight: 1.55 }}>
          {full
            ? 'Other students are battling right now, and every room is taken. Warm up against the computer while you wait, then try again in a few minutes.'
            : pvpMessage(error)}
        </div>
        <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
          {full && (
            <button onClick={() => router.push('/student/battle/setup')}
              style={{ padding: 14, borderRadius: 16, border: 'none', background: `linear-gradient(135deg,${GOLD},#FBBF24)`, color: NAVY, fontSize: 15, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: `0 5px 0 ${GOLD2}` }}>
              🤖 Play the computer
            </button>
          )}
          {onRetry && (
            <button onClick={onRetry}
              style={{ padding: 13, borderRadius: 16, border: '2px solid #E5E7EB', background: '#fff', color: NAVY, fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}>
              Try again
            </button>
          )}
          <button onClick={onClose}
            style={{ padding: 10, border: 'none', background: 'none', color: '#6B7280', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
