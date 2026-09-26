'use client'
// src/components/battle/pvp/MatchResults.jsx
// End of a 1v1: who won and why, both scores, your accuracy and XP, then
// Review / Rematch / New battle. The rematch button follows the match's
// rematch offer: ask, wait for your friend (or cancel), or accept theirs.
// Battle guests (no account) see the sign-up card instead of the XP line.
import { opponentRole, outcomeFor, myResults, matchXp } from '@/lib/pvp/results'
import BattleBg from '@/components/battle/arena/BattleBg'
import ResultHero from '@/components/battle/arena/ResultHero'
import ScoreDuel from '@/components/battle/arena/ScoreDuel'
import GuestUpgradeCard from '@/components/battle/GuestUpgradeCard'
import { NAVY, NAVY2, GOLD, GOLD2 } from '@/components/battle/arena/theme'

function headline(outcome, match, opponentName) {
  const who = opponentName || 'Your friend'
  if (match.finish_reason === 'forfeit') {
    return outcome === 'win'
      ? { icon: '🏆', title: 'You Won!', sub: `${who} left the match.` }
      : { icon: '🚪', title: 'You left', sub: `${who} takes the win this time.` }
  }
  if (match.finish_reason === 'opponent_away') {
    return outcome === 'win'
      ? { icon: '🏆', title: 'You Won!', sub: `${who} stopped answering, so the win is yours.` }
      : { icon: '📶', title: `${who} won`, sub: 'You stopped answering, so the match was called.' }
  }
  if (outcome === 'win')  return { icon: '🏆', title: 'You Won!',     sub: `You beat ${who}. Brilliant!` }
  if (outcome === 'draw') return { icon: '🤝', title: "It's a Draw!", sub: 'Same points, same speed. Rematch?' }
  return { icon: '💪', title: `${who} won`, sub: "So close. Run it back and take the win." }
}

export default function MatchResults({
  state, isGuest, returnTo, busy,
  onReview, onRematch, onCancelRematch, onNewBattle, onHome,
}) {
  const { match, me, rematch } = state
  const opp       = opponentRole(me)
  const oppName   = state[opp].name
  const outcome   = outcomeFor(state)
  const h         = headline(outcome, match, oppName)
  // Count only questions actually played: a match can end early (left / away).
  const played    = state.rounds.length
  const correct   = myResults(state).filter(r => r.is_correct).length
  const accuracy  = played ? Math.round(correct / played * 100) : 0
  const xp        = matchXp(state)
  const offer     = rematch?.status === 'waiting' ? rematch : null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1500, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <BattleBg/>
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5 }}>
        <div style={{ maxWidth:520, margin:'0 auto' }}>

          <ResultHero tone={outcome} icon={h.icon} title={h.title} sub={h.sub}
            meta={[match.exam, match.subject_name, `${match.question_count} questions`].filter(Boolean).join(' · ')}/>

          <div style={{ background:'#D5E5F5', padding:'6px 16px 0' }}>
            <ScoreDuel
              left={{  label: 'YOU',                       score: state[me].points,  winner: outcome === 'win'  }}
              right={{ label: oppName || 'OPPONENT',       score: state[opp].points, winner: outcome === 'loss' }}
            />
          </div>

          {/* Stats */}
          <div style={{ background:'#D5E5F5', padding:'12px 16px 0' }}>
            <div style={{ background:'#fff', border:'2.5px solid rgba(26,36,104,.12)', borderRadius:20, padding:14, boxShadow:'0 6px 0 rgba(26,36,104,.1),0 10px 24px rgba(26,36,104,.1)' }}>
              {!isGuest && (
                <div style={{ background:`linear-gradient(135deg,${GOLD},#FBBF24)`, borderRadius:14, padding:'11px 14px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:12, boxShadow:`0 4px 0 ${GOLD2}` }}>
                  <span style={{ fontSize:18 }}>⚡</span>
                  <span style={{ fontSize:15, fontWeight:900, color:NAVY }}>+{xp} XP earned this battle</span>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[
                  { num: correct,                          label: 'Correct',  color: '#15803D', bg: '#DCFCE7' },
                  { num: played - correct,                 label: 'Missed',   color: '#B91C1C', bg: '#FEE2E2' },
                  { num: `${accuracy}%`,                   label: 'Accuracy', color: NAVY,      bg: '#EEF2FF' },
                ].map(({ num, label, color, bg }) => (
                  <div key={label} style={{ background:bg, borderRadius:14, padding:'12px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:22, fontWeight:900, color, lineHeight:1 }}>{num}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.08em', marginTop:4 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, color:'#6B7280', textAlign:'center', marginTop:10, lineHeight:1.5 }}>
                {played < match.question_count && `${played} of ${match.question_count} questions played. `}
                10 points per correct answer, up to 5 more for speed.
              </div>
            </div>
          </div>

          {/* Rematch offer from the friend */}
          {offer && !offer.mine && (
            <div role="status" style={{ margin:'12px 16px 0', background:'linear-gradient(135deg,#7C3AED,#5B21B6)', borderRadius:18, padding:'14px 16px', color:'#fff', display:'flex', alignItems:'center', gap:12, boxShadow:'0 6px 0 #3B0F87' }}>
              <span style={{ fontSize:28 }}>🔁</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:900 }}>{oppName || 'Your friend'} wants a rematch!</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', marginTop:2 }}>Same subject, same timer, new questions.</div>
              </div>
            </div>
          )}

          {isGuest && <GuestUpgradeCard returnTo={returnTo} style={{ margin:'12px 16px 0' }}/>}

          {/* Actions */}
          <div style={{ padding:'14px 16px max(40px,calc(24px + env(safe-area-inset-bottom)))', display:'flex', flexDirection:'column', gap:10 }}>
            {offer && offer.mine ? (
              <div style={{ background:'#fff', borderRadius:18, border:'2.5px solid rgba(26,36,104,.15)', padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                <div aria-hidden="true" style={{ width:22, height:22, borderRadius:'50%', border:'3px solid rgba(26,36,104,.15)', borderTopColor:NAVY2, animation:'spin .8s linear infinite', flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0, fontSize:14, fontWeight:800, color:NAVY2 }}>Waiting for {oppName || 'your friend'} to accept…</div>
                <button onClick={() => onCancelRematch(offer.match_id)} disabled={busy} style={smallBtn}>Cancel</button>
              </div>
            ) : (
              <button onClick={onRematch} disabled={busy} style={{ ...primaryBtn, opacity: busy ? .7 : 1 }}>
                {busy ? 'One moment…' : offer ? '✅ Accept rematch' : '🔁 Rematch'}
              </button>
            )}
            <button onClick={onReview} style={secondaryBtn}>📋 Review answers</button>
            <div style={{ display:'grid', gridTemplateColumns: isGuest ? '1fr' : '1fr 1fr', gap:10 }}>
              {!isGuest && <button onClick={onNewBattle} style={goldBtn}>⚔️ New battle</button>}
              <button onClick={onHome} style={plainBtn}>Back to 1v1</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const primaryBtn   = { width:'100%', padding:15, borderRadius:18, border:'none', background:`linear-gradient(135deg,${NAVY2},#2A3A8C)`, color:'#fff', fontSize:15, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:'0 5px 0 #031548,0 8px 20px rgba(26,36,104,.35)' }
const secondaryBtn = { width:'100%', padding:15, borderRadius:18, border:'2.5px solid rgba(26,36,104,.2)', background:'#fff', color:NAVY2, fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:'0 5px 0 rgba(26,36,104,.15)' }
const goldBtn      = { padding:13, borderRadius:16, border:'none', background:`linear-gradient(135deg,${GOLD},#FBBF24)`, color:NAVY, fontSize:13, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:`0 5px 0 ${GOLD2}` }
const plainBtn     = { padding:13, borderRadius:16, border:'2px solid rgba(26,36,104,.14)', background:'#fff', color:NAVY2, fontSize:13, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:'0 4px 0 rgba(26,36,104,.1)' }
const smallBtn     = { padding:'9px 14px', borderRadius:12, border:'2px solid rgba(220,38,38,.25)', background:'#FEF2F2', color:'#B91C1C', fontSize:13, fontWeight:900, fontFamily:'inherit', cursor:'pointer', minHeight:44 }
