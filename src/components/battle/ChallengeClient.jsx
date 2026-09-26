'use client'
// src/components/battle/ChallengeClient.jsx
// The challenge screen behind /b/<code>: "Tobi challenged you!" → Accept.
//
// Phase 2: accepting needs a signed-in account (the sign-in screen brings
// them straight back here). Phase 4 adds "play as a guest" with just a name.
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Zara from '@/components/onboarding/Zara'
import PvpNotice from '@/components/battle/PvpNotice'
import { pvpCall } from '@/lib/pvp/client'

const NAVY = '#12195A', GOLD = '#FFB800', GOLD2 = '#CC8F00'

export default function ChallengeClient({ code, preview }) {
  const router = useRouter()
  const [signedIn, setSignedIn] = useState(null)   // null = checking
  const [joining,  setJoining]  = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    createClient().auth.getSession()
      .then(({ data }) => setSignedIn(!!data?.session))
      .catch(() => setSignedIn(false))
  }, [])

  const open = preview?.ok && preview.status === 'waiting'
  const back = encodeURIComponent(`/b/${code}`)

  async function accept() {
    if (joining) return
    setJoining(true)
    const res = await pvpCall('pvp_join', { p_code: code })
    setJoining(false)
    if (!res.ok) { setError(res.error); return }
    router.replace(`/student/battle/1v1/match?m=${res.match_id}`)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg,#0B1138 0%,#1A2468 60%,#23308A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 28, padding: '26px 22px 22px', textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,.45)' }}>
        <Zara size={88} style={{ margin: '0 auto' }}/>

        {open ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 10 }}>
              {preview.is_rematch ? 'Rematch!' : 'Battle challenge'}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: NAVY, marginTop: 6, letterSpacing: '-.02em' }}>
              {preview.host_name ?? 'A friend'} challenged you! ⚔️
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 }}>
              {[preview.exam, preview.subject_name, preview.topic_name, `${preview.question_count} questions`, `${preview.timer_secs}s each`]
                .filter(Boolean)
                .map(t => (
                  <span key={t} style={{ fontSize: 12, fontWeight: 800, color: NAVY, background: '#EEF2FF', borderRadius: 999, padding: '5px 11px' }}>{t}</span>
                ))}
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 14, lineHeight: 1.55 }}>
              Same questions, same timer. Most points wins.
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
              {signedIn === null ? (
                <div style={{ padding: 14, color: '#9CA3AF', fontWeight: 800 }}>Checking…</div>
              ) : signedIn ? (
                <button onClick={accept} disabled={joining} style={primary}>
                  {joining ? 'Joining…' : 'Accept challenge'}
                </button>
              ) : (
                <>
                  <button onClick={() => router.push(`/onboarding?mode=signin&from=${back}`)} style={primary}>
                    Sign in to accept
                  </button>
                  <button onClick={() => router.push(`/onboarding?mode=signup&from=${back}`)} style={secondary}>
                    New here? Create a free account
                  </button>
                </>
              )}
              <button onClick={() => router.push(signedIn ? '/student/battle' : '/')} style={ghost}>Not now</button>
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 12 }}>Code {code}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, color: NAVY, marginTop: 12 }}>
              {preview?.error === 'PVP_SERVER' ? 'We couldn\'t load this battle' : 'This battle has ended'}
            </div>
            <div style={{ fontSize: 14, color: '#6B7280', marginTop: 8, lineHeight: 1.55 }}>
              {preview?.error === 'PVP_SERVER'
                ? 'Check your connection and try again.'
                : `The code ${code} isn't open any more. It may have expired, or the battle already started.`}
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
              <button onClick={() => router.push('/student/battle/1v1')} style={primary}>Create your own battle</button>
              <button onClick={() => router.push('/student/battle/setup')} style={secondary}>Play the computer</button>
            </div>
          </>
        )}
      </div>

      <PvpNotice error={error} onClose={() => setError(null)}/>
    </div>
  )
}

const primary   = { padding: 15, borderRadius: 16, border: 'none', background: `linear-gradient(135deg,${GOLD},#FBBF24)`, color: NAVY, fontSize: 16, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: `0 5px 0 ${GOLD2}` }
const secondary = { padding: 13, borderRadius: 16, border: '2px solid #E5E7EB', background: '#fff', color: NAVY, fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }
const ghost     = { padding: 8, border: 'none', background: 'none', color: '#6B7280', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }
