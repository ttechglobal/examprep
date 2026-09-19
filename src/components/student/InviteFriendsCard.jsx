'use client'
// src/components/student/InviteFriendsCard.jsx
// Shared invite card used on leaderboard page and profile page.

import { useState } from 'react'

const BLUE  = '#1264E5'
const GREEN = '#22c55e'

export function InviteFriendsCard({ compact = false }) {
  const [copied, setCopied] = useState(false)

  const inviteText = `🎯 I'm building my WAEC & JAMB knowledge on ExamPrep — one practice session at a time.\n\nEvery question earns XP. Every XP climbs the leaderboard. Come practice with me and let's see who comes out on top 👊\n\n👉 examprep.ng`

  function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: 'Practice with me on ExamPrep', text: inviteText, url: 'https://examprep.ng' }).catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(inviteText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2800)
    }
  }

  if (compact) {
    return (
      <button onClick={share} style={{
        width:'100%', padding:'12px 16px', borderRadius:14,
        border:'1.5px solid rgba(18,100,229,.3)', background:'rgba(18,100,229,.06)',
        display:'flex', alignItems:'center', gap:10,
        cursor:'pointer', fontFamily:'inherit', textAlign:'left',
      }}>
        <div style={{ width:36, height:36, borderRadius:11, background:`${BLUE}15`, border:`1px solid ${BLUE}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16 }}>📣</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:800, color:BLUE }}>{copied ? 'Link copied! ✓' : 'Invite friends to practise'}</div>
          <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {copied ? 'Share this with your classmates' : "Build XP together · Beat each other's score"}
          </div>
        </div>
        {!copied && (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink:0, opacity:.5 }}>
            <path d="M8.5 1H12v3.5M12 1L7 6M5.5 3H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V8.5" stroke={BLUE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    )
  }

  return (
    <div style={{ borderRadius:18, overflow:'hidden', border:'1px solid var(--border)', background:'var(--bg-card)' }}>
      <div style={{ height:3, background:`linear-gradient(90deg, ${BLUE}, #18B7F2)` }}/>
      <div style={{ padding:'16px 16px 14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:`${BLUE}12`, border:`1px solid ${BLUE}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>📣</div>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', marginBottom:3 }}>Invite your classmates</div>
            <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.55 }}>Practise together, build XP, and see who tops the leaderboard first.</div>
          </div>
        </div>
        <button onClick={share} style={{
          width:'100%', padding:'11px 14px', borderRadius:11,
          background: copied ? `${GREEN}15` : `linear-gradient(135deg, ${BLUE} 0%, #0d4fd4 100%)`,
          border: copied ? `1.5px solid ${GREEN}40` : 'none',
          color: copied ? GREEN : '#fff',
          fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
          display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'all .15s',
        }}>
          {copied ? (
            <><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Copied! Send it to them 🔥</>
          ) : (
            <><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8.5 1H12v3.5M12 1L7 6M5.5 3H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V8.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>Invite friends to ExamPrep</>
          )}
        </button>
      </div>
    </div>
  )
}