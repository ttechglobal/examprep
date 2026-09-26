'use client'
// src/app/student/battle/1v1/lobby/page.js?m=<match id>
// Host's waiting room: the code (copy), WhatsApp / share, a QR code for a
// friend nearby, and a countdown to expiry. When the friend joins (Realtime
// 'joined', or the next poll), both go to the match screen.
//
// QR codes use the `qrcode` package (npm install qrcode).
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { pvpCall, pvpMessage, watchMatch, inviteLink, inviteText } from '@/lib/pvp/client'

const NAVY = '#12195A', GOLD = '#FFB800', GOLD2 = '#CC8F00'

function matchIdFromUrl() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('m')
}

export default function PvpLobbyPage() {
  const router = useRouter()
  const [matchId, setMatchId] = useState(null)
  const [state,   setState]   = useState(null)
  const [error,   setError]   = useState(null)
  const [qr,      setQr]      = useState(null)
  const [copied,  setCopied]  = useState(false)
  const [now,     setNow]     = useState(Date.now())
  const [canShare, setCanShare] = useState(false)
  const offset = useRef(0)            // server clock − phone clock
  const leaving = useRef(false)

  useEffect(() => {
    setMatchId(matchIdFromUrl())
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  // Follow the match until the friend joins.
  useEffect(() => {
    if (!matchId) return
    const goToMatch = () => { if (!leaving.current) router.replace(`/student/battle/1v1/match?m=${matchId}`) }
    const watcher = watchMatch(matchId, (event, payload) => {
      if (event === 'joined') return goToMatch()
      if (event === 'error') return setError(payload.error)
      if (event === 'state') {
        offset.current = payload.clockOffset
        setState(payload)
        if (payload.match.status === 'in_progress') goToMatch()
      }
    })
    return watcher.stop
  }, [matchId, router])

  const code = state?.match?.code
  useEffect(() => {
    if (!code) return
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(inviteLink(code), { margin: 1, width: 360, color: { dark: '#12195A', light: '#FFFFFF' } }))
      .then(setQr)
      .catch(() => setQr(null))
  }, [code])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const m = state?.match
  const status = m?.status === 'waiting' && m.expires_at && new Date(m.expires_at).getTime() < now + offset.current ? 'expired' : m?.status
  const secsLeft = m?.expires_at ? Math.max(0, Math.round((new Date(m.expires_at).getTime() - (now + offset.current)) / 1000)) : 0
  const text = m ? inviteText({ hostName: state.host.name, exam: m.exam, subject: m.subject_name, count: m.question_count, timer: m.timer_secs, code: m.code }) : ''

  async function copyCode() {
    try { await navigator.clipboard.writeText(`${m.code} — ${inviteLink(m.code)}`); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }
  async function share() {
    try { await navigator.share({ title: 'ExamPrep battle', text }) } catch {}
  }
  async function cancel() {
    leaving.current = true
    if (matchId) await pvpCall('pvp_leave', { p_match: matchId })
    router.push('/student/battle/1v1')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Image src="/images/battle/battle-bg.png" alt="" fill priority style={{ objectFit: 'cover', objectPosition: 'center bottom' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,18,80,.66) 0%, rgba(8,18,80,.5) 50%, rgba(8,18,80,.75) 100%)' }}/>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 5 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', gap: 16, color: '#fff' }}>

          {error ? (
            <Card>
              <div style={{ fontSize: 17, fontWeight: 900 }}>{pvpMessage(error)}</div>
              <Btn onClick={() => router.push('/student/battle/1v1')} style={{ marginTop: 14 }}>Back to 1v1</Btn>
            </Card>
          ) : !m ? (
            <div style={{ textAlign: 'center', padding: 60, fontWeight: 800 }}>Setting up your battle…</div>
          ) : status === 'expired' || status === 'cancelled' ? (
            <Card>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{status === 'expired' ? 'No one joined in time' : 'Battle cancelled'}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 6 }}>The code {m.code} no longer works.</div>
              <Btn gold onClick={() => router.push('/student/battle/1v1/create')} style={{ marginTop: 16 }}>Create a new battle</Btn>
              <Btn onClick={() => router.push('/student/battle/1v1')} style={{ marginTop: 10 }}>Back to 1v1</Btn>
            </Card>
          ) : (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>Your battle code</div>
                <button onClick={copyCode} aria-label="Copy battle code"
                  style={{ marginTop: 10, background: '#fff', color: NAVY, border: 'none', borderRadius: 22, padding: '14px 28px', fontSize: 44, fontWeight: 900, letterSpacing: '.28em', fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 6px 0 rgba(0,0,0,.3)' }}>
                  {m.code}
                </button>
                <div style={{ fontSize: 12, fontWeight: 800, color: copied ? '#4ADE80' : 'rgba(255,255,255,.55)', marginTop: 10 }}>
                  {copied ? 'Copied! Paste it to your friend' : 'Tap the code to copy it'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: canShare ? '1fr 1fr' : '1fr', gap: 10 }}>
                <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 16, background: '#25D366', color: '#fff', fontSize: 15, fontWeight: 900, textDecoration: 'none', boxShadow: '0 5px 0 #128C7E' }}>
                  <span style={{ fontSize: 18 }}>💬</span> Share on WhatsApp
                </a>
                {canShare && (
                  <Btn onClick={share}>Share…</Btn>
                )}
              </div>

              <Card style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 900 }}>Friend next to you? Let them scan</div>
                <div style={{ width: 200, height: 200, margin: '12px auto 0', borderRadius: 16, background: '#fff', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {qr
                    ? <img src={qr} alt={`QR code to join battle ${m.code}`} width={180} height={180}/>
                    : <span style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 700 }}>QR code loading…</span>}
                </div>
              </Card>

              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>{m.exam} · {m.subject_name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 3 }}>
                      {m.topic_name ? `${m.topic_name} · ` : ''}{m.question_count} questions · {m.timer_secs}s each
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Expires in</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: secsLeft < 60 ? '#F87171' : GOLD, fontVariantNumeric: 'tabular-nums' }}>
                      {Math.floor(secsLeft / 60)}:{String(secsLeft % 60).padStart(2, '0')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,.07)' }}>
                  <span className="pvp-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: GOLD }}/>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>Waiting for your friend to join…</span>
                </div>
              </Card>

              <button onClick={cancel}
                style={{ alignSelf: 'center', padding: '10px 18px', background: 'none', border: 'none', color: 'rgba(255,255,255,.65)', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
                Cancel battle
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes pvppulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}} .pvp-pulse{animation:pvppulse 1.2s ease-in-out infinite}`}</style>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: 'rgba(12,20,90,.78)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,.13)', borderRadius: 22, padding: '18px 18px 20px', ...style }}>
      {children}
    </div>
  )
}

function Btn({ children, onClick, gold, style }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', padding: 14, borderRadius: 16, border: gold ? 'none' : '1.5px solid rgba(255,255,255,.25)', background: gold ? `linear-gradient(135deg,${GOLD},#FBBF24)` : 'rgba(255,255,255,.1)', color: gold ? NAVY : '#fff', fontSize: 15, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: gold ? `0 5px 0 ${GOLD2}` : 'none', ...style }}>
      {children}
    </button>
  )
}
