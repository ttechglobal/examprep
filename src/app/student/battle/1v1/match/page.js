'use client'
// src/app/student/battle/1v1/match/page.js?m=<match id>
// ─────────────────────────────────────────────────────────────────────────────
// The live 1v1 match: 3-2-1, then each question on a shared server timer.
// Pick an answer and lock it in; you can change it until time is up or both
// players have locked in. Then both phones show the answer, the points and
// who picked what, and the next question starts 3 seconds later.
//
// Everything comes from the match engine through useMatch (lib/pvp/useMatch.js):
// closing the app and coming back, or losing signal for a while, picks the
// match up where it is. Results, review, rematch and the guest sign-up card
// follow at the end.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePoints } from '@/contexts/PointsContext'
import { useMatch } from '@/lib/pvp/useMatch'
import { pvpMessage } from '@/lib/pvp/client'
import { opponentRole, matchXp } from '@/lib/pvp/results'
import { normaliseOptions } from '@/lib/answers'
import BattleBg from '@/components/battle/arena/BattleBg'
import VSHeader from '@/components/battle/arena/VSHeader'
import Countdown from '@/components/battle/arena/Countdown'
import TimerRing from '@/components/battle/arena/TimerRing'
import QuestionCard from '@/components/battle/arena/QuestionCard'
import AnswerTiles from '@/components/battle/arena/AnswerTiles'
import BattleReview from '@/components/battle/arena/BattleReview'
import MatchResults from '@/components/battle/pvp/MatchResults'
import PvpNotice from '@/components/battle/PvpNotice'
import { NAVY, NAVY2, GOLD, GOLD2, LETTERS, optionText } from '@/components/battle/arena/theme'

const HUB = '/student/battle/1v1'

export default function PvpMatchPage() {
  return (
    <Suspense fallback={<StatusScreen title="Connecting…"/>}>
      <MatchRoute/>
    </Suspense>
  )
}

// A rematch swaps the ?m= in the URL; the key gives the new match a fresh screen.
function MatchRoute() {
  const matchId = useSearchParams().get('m')
  if (!matchId) return <StatusScreen title="No battle selected" action={{ label: 'Back to 1v1', href: HUB }}/>
  return <Match key={matchId} matchId={matchId}/>
}

function Match({ matchId }) {
  const router = useRouter()
  const match = useMatch(matchId)
  const { state, phase, serverNow, clockOffset, lockedIdx } = match
  const { totalPoints, setTotalPoints, showXPToast } = usePoints()

  const [isGuest,   setIsGuest]   = useState(false)   // playing from an invite link, no account
  const [selection, setSelection] = useState(null)    // { q, idx } picked but maybe not locked in
  const [popKey,    setPopKey]    = useState(0)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [view,      setView]      = useState('results')
  const [busy,      setBusy]      = useState(false)
  const [notice,    setNotice]    = useState(null)
  const [float,     setFloat]     = useState(null)
  const canvasRef = useRef(null)
  const sawLive   = useRef(false)
  const awarded   = useRef(false)
  const roundsSeen = useRef(null)

  useEffect(() => {
    createClient().auth.getSession()
      .then(({ data }) => setIsGuest(!!data?.session?.user?.is_anonymous))
      .catch(() => {})
  }, [])

  const me       = state?.me
  const opp      = me ? opponentRole(me) : null
  const oppName  = state?.[opp]?.name || 'Your friend'
  const m        = state?.match
  const rounds   = state?.rounds ?? []
  const current  = state?.current ?? null
  const last     = rounds[rounds.length - 1] ?? null
  const qIndex   = current?.q_index ?? last?.q_index ?? 0

  useEffect(() => {
    if (phase === 'question' || phase === 'reveal' || phase === 'countdown') sawLive.current = true
  }, [phase])

  // Host opened this before a friend joined: the waiting room is the right screen.
  useEffect(() => {
    if (phase === 'waiting') router.replace(`${HUB}/lobby?m=${matchId}`)
  }, [phase, matchId, router])

  // Each question starts at the top.
  useEffect(() => {
    canvasRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [qIndex, phase])

  // "+13" rising from whoever scored when a round closes.
  useEffect(() => {
    const n = rounds.length
    if (roundsSeen.current !== null && n > roundsSeen.current && last) {
      const mine = last.mine?.points ?? 0, theirs = last.theirs?.points ?? 0
      if (mine > 0 || theirs > 0) {
        setFloat({ side: mine > 0 ? 'me' : 'opponent', text: `+${mine > 0 ? mine : theirs}`, key: n })
        const t = setTimeout(() => setFloat(null), 900)
        roundsSeen.current = n
        return () => clearTimeout(t)
      }
    }
    roundsSeen.current = n
  }, [rounds.length, last])

  // XP was added on the server; show it here once, for a match played on this screen.
  useEffect(() => {
    if (phase !== 'finished' || awarded.current || !sawLive.current || isGuest || !state) return
    awarded.current = true
    const xp = matchXp(state)
    setTotalPoints((totalPoints || 0) + xp)
    showXPToast(xp, 'Battle done!')
  }, [phase, state, isGuest, totalPoints, setTotalPoints, showXPToast])

  // Both players end up in a rematch as soon as it starts.
  const rematch = state?.rematch
  useEffect(() => {
    if (rematch?.status === 'in_progress') router.replace(`${HUB}/match?m=${rematch.match_id}`)
  }, [rematch, router])

  async function doRematch() {
    setBusy(true)
    const res = await match.rematch()
    setBusy(false)
    if (!res.ok) return setNotice(res.error)
    if (res.joined) router.replace(`${HUB}/match?m=${res.match_id}`)
  }
  async function cancelRematch(id) {
    setBusy(true)
    await match.cancelRematch(id)
    setBusy(false)
  }
  async function claimWin() {
    const res = await match.claimWin()
    if (!res.ok) setNotice(res.error)
  }
  async function leave() {
    setMenuOpen(false)
    await match.leave()
  }

  // ── Screens that aren't the arena ─────────────────────────────────────────
  if (match.error) return <StatusScreen title={pvpMessage(match.error)} action={{ label: 'Back to 1v1', href: HUB }}/>
  if (phase === 'connecting' || phase === 'waiting') return <StatusScreen title="Connecting…" spinner offline={!match.online}/>
  if (phase === 'ended') return (
    <StatusScreen title="This battle didn't start" text="It was cancelled or expired before both players joined."
      action={{ label: 'Back to 1v1', href: HUB }}/>
  )
  if (phase === 'abandoned') return (
    <StatusScreen title="Match ended" text="Both players lost connection, so the match was closed. It doesn't count for either of you."
      action={{ label: 'Back to 1v1', href: HUB }}/>
  )
  if (phase === 'countdown') return (
    <Countdown endsAt={Date.parse(m.round_started_at) - clockOffset}>
      <div style={{ fontSize:16, fontWeight:900, color:NAVY2, textAlign:'center' }}>
        {state[me].name || 'You'} <span style={{ color:GOLD2, fontStyle:'italic' }}>vs</span> {state[opp].name || 'Friend'}
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:'rgba(26,36,104,.6)', textAlign:'center', marginTop:4 }}>
        {m.question_count} questions · {m.timer_secs}s each
      </div>
    </Countdown>
  )
  if (phase === 'finished') {
    const returnTo = `${HUB}/match?m=${matchId}`
    return view === 'review'
      ? <BattleReview items={reviewItems(rounds)} subject={m.subject_name} opponent={opponentBadge(oppName)} onDone={() => setView('results')}/>
      : (
        <>
          <MatchResults
            state={state} isGuest={isGuest} returnTo={returnTo} busy={busy}
            onReview={() => setView('review')}
            onRematch={doRematch}
            onCancelRematch={cancelRematch}
            onNewBattle={() => router.push(`${HUB}/create`)}
            onHome={() => router.push(HUB)}
          />
          <PvpNotice error={notice} onClose={() => setNotice(null)}/>
        </>
      )
  }

  // ── Arena: question or reveal ─────────────────────────────────────────────
  const live      = phase === 'question'
  const shown     = live ? current : last
  const options   = normaliseOptions(shown?.options).map(optionText)
  const selected  = live ? (selection?.q === current.q_index ? selection.idx : lockedIdx) : last?.mine?.choice ?? null
  const endsAt    = live ? Date.parse(m.round_started_at) + m.timer_secs * 1000 - clockOffset : null
  const dots      = side => rounds.filter(r => r[side]?.correct).length

  function select(idx) {
    setSelection({ q: current.q_index, idx })
    setPopKey(k => k + 1)
  }
  // Time's up with a pick that wasn't locked in: send it (the server allows a short grace).
  function onTimeUp() {
    if (selected !== null && selected !== lockedIdx) match.answer(selected)
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        @keyframes floatup{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-32px);opacity:0}}
        @keyframes slidein{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes tdot{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}
      `}</style>
      <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <BattleBg/>

        <VSHeader
          qIndex={qIndex} total={m.question_count}
          me={{ score: state[me].points, dots: dots('mine') }}
          opponent={{
            label: oppName, avatar: '🧑🏽‍🎓', score: state[opp].points, dots: dots('theirs'),
            answered: live ? current.opponent_answered : last?.theirs != null,
            waitingText: live ? 'Thinking' : 'No answer', idle: !live,
          }}
          onMenu={() => setMenuOpen(true)}
          float={float}
        />

        {!match.online && <OfflineBanner/>}

        <div ref={canvasRef} style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', overscrollBehavior:'contain', position:'relative', zIndex:5, padding:'20px 20px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div key={`${phase}-${qIndex}`} style={{ width:'100%', maxWidth:860, display:'flex', flexDirection:'column', gap:14, animation:'slidein .3s ease' }}>
            {state.opponent_away && (
              <AwayCard name={oppName} onClaim={claimWin}/>
            )}

            <QuestionCard
              subject={m.subject_name}
              text={shown?.text}
              passage={shown?.passage_text}
              timer={live ? <TimerRing secs={m.timer_secs} endsAt={endsAt} onTimeUp={onTimeUp}/> : null}
            />

            <AnswerTiles
              options={options}
              selectedIdx={selected}
              reveal={live ? null : { correctIdx: last.correct_index, theirsIdx: last.theirs?.choice ?? null }}
              opponent={opponentBadge(oppName)}
              onSelect={select}
              popKey={popKey}
            />

            <div style={{ height:24, flexShrink:0 }}/>
          </div>
        </div>

        <Dock>
          {live
            ? <QuestionDock selected={selected} lockedIdx={lockedIdx} oppName={oppName}
                opponentAnswered={current.opponent_answered} onLock={() => match.answer(selected)}/>
            : <RevealDock round={last} oppName={oppName}
                nextIn={m.status === 'in_progress' ? Math.max(0, Math.ceil((Date.parse(m.round_started_at) - serverNow) / 1000)) : null}/>}
        </Dock>

        {menuOpen && <LeaveSheet oppName={oppName} onStay={() => setMenuOpen(false)} onLeave={leave}/>}
        <PvpNotice error={notice} onClose={() => setNotice(null)}/>
      </div>
    </>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function opponentBadge(name) {
  return { emoji: '🧑🏽‍🎓', label: (name || 'Friend').split(/\s+/)[0], color: '#6D28D9' }
}

// pvp_state rounds → the shared BattleReview rows.
function reviewItems(rounds) {
  return rounds.map(r => {
    const options = normaliseOptions(r.options).map(optionText)
    return {
      text: r.text, options, correctIdx: r.correct_index,
      mineIdx: r.mine?.choice ?? null, theirsIdx: r.theirs?.choice ?? null,
      points: r.mine?.points ?? 0, explanation: r.explanation,
      question: { options, correct_answer: LETTERS[r.correct_index] },
    }
  })
}

// ── Pieces ──────────────────────────────────────────────────────────────────
function Dock({ children }) {
  return (
    <div style={{ flexShrink:0, position:'relative', zIndex:20, padding:'10px 16px', paddingBottom:'max(12px,env(safe-area-inset-bottom))', background:'linear-gradient(to top,rgba(200,221,239,.98) 70%,rgba(200,221,239,0))' }}>
      <div style={{ maxWidth:860, margin:'0 auto', display:'flex', alignItems:'center', gap:10, background:'#fff', border:'2px solid rgba(26,36,104,.12)', borderRadius:20, padding:'8px 8px 8px 12px', minHeight:64, boxShadow:'0 6px 0 rgba(26,36,104,.1),0 10px 24px rgba(26,36,104,.12)' }}>
        {children}
      </div>
    </div>
  )
}

const dockBtn = { display:'flex', alignItems:'center', gap:8, padding:'13px clamp(20px,4vw,32px)', borderRadius:999, border:'none', fontSize:15, fontWeight:900, fontFamily:'inherit', flexShrink:0, minHeight:48 }

function QuestionDock({ selected, lockedIdx, oppName, opponentAnswered, onLock }) {
  const isLocked = lockedIdx !== null && selected === lockedIdx
  const title = selected === null ? 'Pick an answer'
    : isLocked ? `Locked in: ${LETTERS[lockedIdx]}`
    : lockedIdx !== null ? `Change to ${LETTERS[selected]}?`
    : `Your pick: ${LETTERS[selected]}`
  const sub = isLocked
    ? (opponentAnswered ? 'Both answered, revealing…' : `Waiting for ${oppName}. You can still change it.`)
    : opponentAnswered ? `${oppName} has answered` : 'Lock it in before time runs out'
  const label = isLocked ? 'Locked ✓' : lockedIdx !== null && selected !== null ? 'Change' : 'Lock in'
  const disabled = selected === null || isLocked
  return (
    <>
      <div style={{ flex:1, minWidth:0 }} aria-live="polite">
        <div style={{ fontSize:14, fontWeight:900, color: selected === null ? '#6B7280' : NAVY2 }}>{title}</div>
        <div style={{ fontSize:12, fontWeight:700, color:'#6B7280', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sub}</div>
      </div>
      <button onClick={onLock} disabled={disabled}
        style={{ ...dockBtn, background: disabled ? (isLocked ? '#16A34A' : '#CBD5E1') : NAVY2, color:'#fff', cursor: disabled ? 'default' : 'pointer', boxShadow: disabled ? 'none' : '0 5px 0 #031548,0 7px 18px rgba(26,36,104,.35)' }}>
        {label}
      </button>
    </>
  )
}

function RevealDock({ round, oppName, nextIn }) {
  const mine = round?.mine, theirs = round?.theirs
  const correct = !!mine?.correct, skipped = mine == null
  const theirLine = theirs == null ? `${oppName} didn't answer` : theirs.correct ? `${oppName} got it too (+${theirs.points})` : `${oppName} missed it`
  return (
    <>
      <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background: correct ? '#16A34A' : skipped ? '#6B7280' : '#DC2626', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, color:'#fff' }}>
        {correct ? '✓' : skipped ? '⏱' : '✗'}
      </div>
      <div style={{ flex:1, minWidth:0 }} aria-live="polite">
        <div style={{ fontSize:14, fontWeight:900, color: correct ? '#15803D' : skipped ? '#4B5563' : '#B91C1C' }}>
          {correct ? `Correct! +${mine.points}` : skipped ? "Time's up" : 'Wrong'}
        </div>
        <div style={{ fontSize:12, fontWeight:700, color:'#6B7280', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{theirLine}</div>
      </div>
      <div style={{ flexShrink:0, textAlign:'center', padding:'0 10px', minWidth:70 }}>
        <div style={{ fontSize:10, fontWeight:800, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.06em' }}>{nextIn == null ? 'Results' : 'Next in'}</div>
        <div style={{ fontSize:22, fontWeight:900, color:NAVY2, lineHeight:1.1, fontVariantNumeric:'tabular-nums' }}>{nextIn == null ? '🏁' : nextIn}</div>
      </div>
    </>
  )
}

function AwayCard({ name, onClaim }) {
  return (
    <div role="status" style={{ background:'#FFF7ED', border:'2px solid rgba(249,115,22,.35)', borderRadius:18, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
      <span style={{ fontSize:24 }}>📶</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:900, color:'#9A3412' }}>{name} has missed 3 questions</div>
        <div style={{ fontSize:12, color:'#7C2D12', marginTop:2 }}>Their connection may have dropped. You can end the match as a win.</div>
      </div>
      <button onClick={onClaim} style={{ padding:'10px 14px', borderRadius:12, border:'none', background:'#EA580C', color:'#fff', fontSize:13, fontWeight:900, fontFamily:'inherit', cursor:'pointer', minHeight:44, flexShrink:0 }}>Claim win</button>
    </div>
  )
}

function LeaveSheet({ oppName, onStay, onLeave }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="leave-title" onClick={onStay}
      style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(18,25,90,.8)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:24, padding:'24px 20px', width:'100%', maxWidth:340, boxShadow:'0 20px 60px rgba(0,0,0,.5)' }}>
        <div id="leave-title" style={{ fontSize:20, fontWeight:900, color:NAVY2, letterSpacing:'-.03em', marginBottom:6 }}>Leave the match?</div>
        <div style={{ fontSize:13, color:'#6B7280', marginBottom:20, lineHeight:1.5 }}>The timer doesn't stop in a 1v1. If you leave now, {oppName} wins.</div>
        <button onClick={onStay} autoFocus
          style={{ width:'100%', padding:14, borderRadius:16, border:'none', background:NAVY2, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:'0 5px 0 #031548', marginBottom:10 }}>
          ▶ Keep playing
        </button>
        <button onClick={onLeave}
          style={{ width:'100%', padding:13, borderRadius:14, border:'2px solid rgba(220,38,38,.2)', background:'#FEF2F2', color:'#B91C1C', fontSize:13, fontWeight:800, fontFamily:'inherit', cursor:'pointer' }}>
          🚪 Leave match
        </button>
      </div>
    </div>
  )
}

function OfflineBanner() {
  return (
    <div role="status" style={{ position:'relative', zIndex:30, background:'#FEF3C7', color:'#92400E', fontSize:13, fontWeight:800, textAlign:'center', padding:'8px 12px', borderBottom:'1px solid rgba(146,64,14,.2)' }}>
      Reconnecting… your answers will be sent when you're back online.
    </div>
  )
}

function StatusScreen({ title, text, action, spinner = false, offline = false }) {
  const router = useRouter()
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <BattleBg overlay="linear-gradient(180deg, rgba(8,18,80,.6) 0%, rgba(8,18,80,.45) 50%, rgba(8,18,80,.7) 100%)"/>
      <div style={{ position:'relative', zIndex:5, maxWidth:400, width:'100%', background:'rgba(12,20,90,.85)', border:'1px solid rgba(255,255,255,.14)', borderRadius:24, padding:'26px 22px', textAlign:'center', color:'#fff' }}>
        {spinner && <div aria-hidden="true" style={{ width:36, height:36, margin:'0 auto 14px', borderRadius:'50%', border:'3px solid rgba(255,255,255,.18)', borderTopColor:GOLD, animation:'spin .7s linear infinite' }}/>}
        <div style={{ fontSize:19, fontWeight:900 }}>{title}</div>
        {(text || offline) && <div style={{ fontSize:14, color:'rgba(255,255,255,.7)', marginTop:8, lineHeight:1.55 }}>{offline ? 'Check your connection. The match continues on the server.' : text}</div>}
        {action && (
          <button onClick={() => router.push(action.href)}
            style={{ marginTop:18, padding:'13px 22px', borderRadius:16, border:'none', background:`linear-gradient(135deg,${GOLD},#FBBF24)`, color:NAVY, fontSize:15, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:`0 5px 0 ${GOLD2}` }}>
            {action.label}
          </button>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
