'use client'
// src/components/battle/GuestUpgradeCard.jsx
// Shown to a battle guest (played from an invite link, no account) when their
// match ends. Signing up or in from here keeps this battle: lib/auth/client.js
// moves the guest's results onto the account.
import { useRouter } from 'next/navigation'
import Zara from '@/components/onboarding/Zara'

const NAVY = '#12195A', GOLD = '#FFB800', GOLD2 = '#CC8F00'

const PERKS = [
  ['💾', 'Save this battle, your XP and your form'],
  ['📚', 'Practice, mock exams and battles vs the computer'],
  ['🎁', 'Start with a free trial'],
]

export default function GuestUpgradeCard({ returnTo, style }) {
  const router = useRouter()
  const from = encodeURIComponent(returnTo)

  return (
    <div style={{ background: '#fff', borderRadius: 24, padding: '20px 20px 18px', textAlign: 'left', color: NAVY, boxShadow: '0 18px 50px rgba(0,0,0,.35)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Zara size={60} style={{ flexShrink: 0 }}/>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.01em', lineHeight: 1.2 }}>Create an account to save your progress</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>It's free and takes a minute.</div>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 8 }}>
        {PERKS.map(([icon, text]) => (
          <li key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
            <span aria-hidden="true" style={{ fontSize: 18 }}>{icon}</span>{text}
          </li>
        ))}
      </ul>

      <button onClick={() => router.push(`/onboarding?mode=signup&from=${from}`)}
        style={{ width: '100%', marginTop: 16, padding: 15, borderRadius: 16, border: 'none', background: `linear-gradient(135deg,${GOLD},#FBBF24)`, color: NAVY, fontSize: 16, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: `0 5px 0 ${GOLD2}` }}>
        Create free account
      </button>
      <button onClick={() => router.push(`/onboarding?mode=signin&from=${from}`)}
        style={{ width: '100%', marginTop: 8, padding: 10, border: 'none', background: 'none', color: '#1264E5', fontSize: 13, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}>
        I already have an account
      </button>
    </div>
  )
}
