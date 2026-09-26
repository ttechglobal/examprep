'use client'
// src/app/student/battle/1v1/page.js
// 1v1 hub: create a battle, join with a code, and your "vs friends" form.
//
// Not linked from anywhere yet: the battle hub shows 1v1 as "Coming soon"
// with its button disabled. Launch = enable that button.
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useStudentUser } from '@/app/student/layout'
import RecentForm from '@/components/battle/RecentForm'
import { pvpCall } from '@/lib/pvp/client'
import { PVP_CODE_RE, PVP_CODE_CHARS } from '@/lib/pvp/constants'

const NAVY = '#12195A', GOLD = '#FFB800', GOLD2 = '#CC8F00'
const NOT_CODE_CHAR = new RegExp(`[^${PVP_CODE_CHARS}]`, 'g')

export default function PvpHubPage() {
  const router  = useRouter()
  const profile = useStudentUser()
  const isGuest = !!profile?.isGuest
  const [code,  setCode]  = useState('')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!profile || isGuest) return
    pvpCall('pvp_my_stats').then(s => { if (s && s.played != null) setStats(s) })
  }, [profile, isGuest])

  const codeOk = PVP_CODE_RE.test(code)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Image src="/images/battle/battle-bg.png" alt="" fill priority style={{ objectFit: 'cover', objectPosition: 'center bottom' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,18,80,.62) 0%, rgba(8,18,80,.45) 50%, rgba(8,18,80,.72) 100%)' }}/>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 5 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <button onClick={() => router.push('/student/battle')}
            style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.26)', borderRadius: 999, padding: '7px 16px 7px 11px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Battle
          </button>

          <div>
            <div style={{ display: 'inline-block', background: GOLD, borderRadius: 999, padding: '5px 16px', fontSize: 11, fontWeight: 900, color: '#1a1200', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
              Player vs Player
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-.02em' }}>Battle a friend</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', marginTop: 8, lineHeight: 1.55 }}>
              Same questions, same timer, head to head. Create a battle and send the code, or join a friend's.
            </div>
          </div>

          {isGuest ? (
            <Panel>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Sign in to battle friends</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 6, lineHeight: 1.5 }}>
                1v1 battles need an account so your wins, XP and form are saved.
              </div>
              <Cta gold onClick={() => router.push('/onboarding?mode=signin&from=/student/battle/1v1')} style={{ marginTop: 14 }}>
                Sign in or create an account
              </Cta>
            </Panel>
          ) : (
            <>
              {/* Create */}
              <Panel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 34 }}>⚔️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>Create a battle</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>Pick the subject and timer, then share your code.</div>
                  </div>
                </div>
                <Cta gold onClick={() => router.push('/student/battle/1v1/create')} style={{ marginTop: 14 }}>Create battle</Cta>
              </Panel>

              {/* Join */}
              <Panel>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>Join with a code</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>Enter the 4-character code your friend sent you.</div>
                <form onSubmit={e => { e.preventDefault(); if (codeOk) router.push(`/b/${code}`) }}
                  style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase().replace(NOT_CODE_CHAR, '').slice(0, 4))}
                    inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false}
                    placeholder="K7Q2" aria-label="Battle code"
                    style={{ flex: 1, minWidth: 0, textAlign: 'center', letterSpacing: '.35em', fontSize: 24, fontWeight: 900, padding: '12px 10px', borderRadius: 14, border: '2px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.08)', color: '#fff', fontFamily: 'inherit', outline: 'none', textTransform: 'uppercase' }}
                  />
                  <button type="submit" disabled={!codeOk}
                    style={{ padding: '0 20px', borderRadius: 14, border: 'none', background: codeOk ? '#1264E5' : 'rgba(255,255,255,.12)', color: codeOk ? '#fff' : 'rgba(255,255,255,.35)', fontSize: 15, fontWeight: 900, fontFamily: 'inherit', cursor: codeOk ? 'pointer' : 'not-allowed', boxShadow: codeOk ? '0 4px 0 #062A78' : 'none' }}>
                    Join
                  </button>
                </form>
              </Panel>

              {stats && (
                <RecentForm
                  title="Your form vs friends"
                  form={stats.recent_form}
                  played={stats.played}
                  totals={[
                    { l: 'Played', v: stats.played, c: '#fff'    },
                    { l: 'Won',    v: stats.won,    c: '#4ADE80' },
                    { l: 'Lost',   v: stats.lost,   c: '#F87171' },
                  ]}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Panel({ children }) {
  return (
    <div style={{ background: 'rgba(12,20,90,.75)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,.13)', borderRadius: 24, padding: '18px 20px 20px' }}>
      {children}
    </div>
  )
}

function Cta({ children, onClick, gold, style }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', padding: 14, borderRadius: 16, border: 'none', background: gold ? `linear-gradient(135deg,${GOLD},#FBBF24)` : '#1264E5', color: gold ? NAVY : '#fff', fontSize: 15, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: gold ? `0 5px 0 ${GOLD2}` : '0 5px 0 #062A78', ...style }}>
      {children}
    </button>
  )
}
