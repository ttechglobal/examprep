'use client'
// src/app/school/dashboard/tabs/CohortTab.js

import { useState } from 'react'

export default function CohortTab({ cohort, allCohorts = [], totalStudents = 0, slotsTotal, slotsUsed = 0, onCohortCreated }) {
  const [selected,     setSelected]     = useState(cohort?.id ?? null)
  const [showCreate,   setShowCreate]   = useState(!cohort)
  const [cohortName,   setCohortName]   = useState('')
  const [cohortSess,   setCohortSess]   = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saveErr,      setSaveErr]      = useState(null)
  const [codeCopied,   setCodeCopied]   = useState(false)
  const [linkCopied,   setLinkCopied]   = useState(false)
  const [msgCopied,    setMsgCopied]    = useState(false)

  const sel         = allCohorts.find(c => c.id === selected) ?? cohort
  const slotsLeft   = slotsTotal != null ? Math.max(0, slotsTotal - slotsUsed) : null
  const slotsP      = slotsTotal > 0 ? Math.round((slotsUsed / slotsTotal) * 100) : 0
  const inviteLink  = sel ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${sel.invite_code}` : ''
  const yr          = new Date().getFullYear()

  function copyCode() { navigator.clipboard?.writeText(sel?.invite_code || ''); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000) }
  function copyLink() { navigator.clipboard?.writeText(inviteLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }
  function shareMsg() {
    const msg = `📚 Join our ExamPrep school!\n\nHi! Your school has set up an ExamPrep study group. Practice WAEC & JAMB questions, track your progress, and compete with classmates.\n\n👉 Join here: ${inviteLink}\nOr enter code: ${sel?.invite_code}\n\nGo to ExamPrep → Profile → Connect your school → Enter code`
    if (typeof navigator !== 'undefined' && navigator.share) { navigator.share({ text: msg }).catch(() => {}); return }
    navigator.clipboard?.writeText(msg); setMsgCopied(true); setTimeout(() => setMsgCopied(false), 2500)
  }

  async function handleCreate() {
    if (!cohortName.trim()) return
    setSaving(true); setSaveErr(null)
    try {
      const res = await fetch('/api/school/cohort', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cohortName.trim(), session: cohortSess.trim() }),
      })
      const d = await res.json()
      if (d.error) { setSaveErr(d.error); return }
      onCohortCreated?.(d.cohort)
      setShowCreate(false); setSelected(d.cohort.id); setCohortName(''); setCohortSess('')
    } catch { setSaveErr('Failed — try again') } finally { setSaving(false) }
  }

  return (
    <div className="sd-content">
      <div className="sd-page-header">
        <div>
          <div className="sd-page-title">Cohort &amp; Invite</div>
          <div className="sd-page-sub">Create and manage your student cohorts</div>
        </div>
        <button
          onClick={() => setShowCreate(o => !o)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, background:'#062A78', color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
        >
          + {showCreate ? 'Cancel' : 'New cohort'}
        </button>
      </div>

      <div className="sd-cohort-cols">
        {/* ── Cohort list ── */}
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:'#b0bada', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>Your cohorts</div>
          {!allCohorts.length ? (
            <div className="panel" style={{ padding:'20px 14px', textAlign:'center' }}>
              <div style={{ fontSize:12, color:'#7a8aaa', marginBottom:10 }}>No cohorts yet.</div>
              <button onClick={() => setShowCreate(true)} style={{ padding:'7px 14px', borderRadius:8, background:'#062A78', color:'#fff', border:'none', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Create first →</button>
            </div>
          ) : allCohorts.map(c => (
            <div
              key={c.id}
              onClick={() => { setSelected(c.id); setShowCreate(false) }}
              style={{ padding:'10px 12px', borderRadius:11, border:`1.5px solid ${selected === c.id ? '#1264E5' : '#e4eaf5'}`, background: selected === c.id ? '#EBF1FE' : '#fff', cursor:'pointer', marginBottom:6, transition:'border-color .13s' }}
            >
              <div style={{ fontSize:12, fontWeight:700, color:'#071B49' }}>{c.name}</div>
              <div style={{ fontSize:10, color:'#7a8aaa', marginTop:2 }}>
                {c.session || '—'} · {c.is_active ? totalStudents : '—'} students
              </div>
              {c.is_active && <span className="badge" style={{ background:'#ECFDF5', color:'#059669', marginTop:5, display:'inline-flex' }}>Active</span>}
            </div>
          ))}
        </div>

        {/* ── Main panel ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Create form */}
          {showCreate && (
            <div className="panel" style={{ padding:22 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#071B49', marginBottom:4 }}>
                {cohort ? 'Create a new cohort' : 'Create your first cohort'}
              </div>
              <div style={{ fontSize:12, color:'#7a8aaa', marginBottom:18 }}>
                {cohort ? 'Creating a new cohort archives the current one.' : "You'll get an invite code to share with students."}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#071B49', display:'block', marginBottom:5 }}>Cohort name *</label>
                  <input
                    value={cohortName} onChange={e => setCohortName(e.target.value)}
                    placeholder="e.g. SS3 Science 2026/2027" autoFocus
                    style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1.5px solid #e4eaf5', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#071B49', display:'block', marginBottom:5 }}>
                    Academic session <span style={{ fontWeight:400, color:'#b0bada' }}>(optional)</span>
                  </label>
                  <input
                    value={cohortSess} onChange={e => setCohortSess(e.target.value)}
                    placeholder={`e.g. ${yr}/${yr + 1}`}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1.5px solid #e4eaf5', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                  />
                </div>
                {saveErr && (
                  <div style={{ fontSize:12, color:'#dc2626', padding:'9px 12px', background:'#fef2f2', borderRadius:8, border:'1px solid #fecaca' }}>{saveErr}</div>
                )}
                <div style={{ display:'flex', gap:10 }}>
                  {cohort && (
                    <button onClick={() => setShowCreate(false)} style={{ padding:'9px 16px', borderRadius:9, border:'1px solid #e4eaf5', background:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'#7a8aaa' }}>
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleCreate}
                    disabled={saving || !cohortName.trim()}
                    style={{ flex:1, padding:'9px 16px', borderRadius:9, background: saving || !cohortName.trim() ? '#e2e8f0' : '#059669', color: saving || !cohortName.trim() ? '#7a8aaa' : '#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
                  >
                    {saving ? 'Creating…' : 'Create cohort →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selected cohort detail */}
          {sel && !showCreate && (
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">{sel.name}</div>
                  <div className="panel-sub">{sel.session || 'Active cohort'} · {totalStudents} students joined</div>
                </div>
                {sel.is_active && <span className="badge" style={{ background:'#ECFDF5', color:'#059669' }}>Active</span>}
              </div>

              {/* Invite code display */}
              <div style={{ padding:24, background:'linear-gradient(135deg,#ECFDF5,#F0FDF4)', textAlign:'center', borderBottom:'1px solid #e4eaf5' }}>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em', color:'#059669', textTransform:'uppercase', marginBottom:12 }}>Student invite code</div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:14, padding:'14px 24px', borderRadius:14, background:'#fff', border:'2px solid rgba(5,150,105,.2)' }}>
                  <div className="cohort-code">{sel.invite_code}</div>
                  <button className="copy-btn" onClick={copyCode} style={codeCopied ? { background:'#059669', color:'#fff' } : {}}>
                    {codeCopied ? 'Copied! ✓' : 'Copy code'}
                  </button>
                </div>
                <div style={{ fontSize:11, color:'#059669', marginTop:10 }}>
                  Students: ExamPrep → Profile → Connect your school → Enter code
                </div>
              </div>

              {/* Share actions */}
              <div style={{ padding:'16px 20px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#071B49', marginBottom:10 }}>Share with students</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button onClick={shareMsg} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, background:'#062A78', color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    📤 {msgCopied ? 'Copied! ✓' : 'Share invite message'}
                  </button>
                  <button onClick={copyLink} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, background:'#f4f7ff', color:'#3a4870', border:'1px solid #e4eaf5', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    🔗 {linkCopied ? 'Copied! ✓' : 'Copy invite link'}
                  </button>
                </div>
                <div style={{ fontSize:11, color:'#7a8aaa', marginTop:10, lineHeight:1.6 }}>
                  The invite message is ready to paste into WhatsApp or SMS — it includes the link and the code.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Slots panel ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="panel">
            <div className="panel-head" style={{ padding:'12px 16px' }}>
              <div className="panel-title">Student slots</div>
              <span className="badge" style={{ background:'#ECFDF5', color:'#059669' }}>● Active</span>
            </div>
            <div style={{ padding:16 }}>
              {slotsTotal != null ? (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:10, color:'#7a8aaa' }}>Used</div>
                      <div style={{ fontSize:22, fontWeight:700, color:'#071B49' }}>{slotsUsed} <span style={{ fontSize:13, fontWeight:500, color:'#7a8aaa' }}>/ {slotsTotal}</span></div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'#7a8aaa' }}>Free</div>
                      <div style={{ fontSize:22, fontWeight:700, color: slotsLeft <= 5 ? '#dc2626' : '#059669' }}>{slotsLeft}</div>
                    </div>
                  </div>
                  <div className="slots-bar-wrap">
                    <div className="slots-bar" style={{ width:`${slotsP}%`, background: slotsLeft <= 5 ? '#dc2626' : '#1264E5' }}/>
                  </div>
                  {slotsLeft <= 5 && <div style={{ fontSize:11, color:'#dc2626', fontWeight:700, marginBottom:6 }}>⚠ Running low on slots.</div>}
                </>
              ) : (
                <div style={{ fontSize:12, color:'#7a8aaa', marginBottom:10 }}>
                  {slotsUsed} student{slotsUsed !== 1 ? 's' : ''} enrolled
                </div>
              )}
              <div style={{ fontSize:11, color:'#7a8aaa', lineHeight:1.6, marginTop:6 }}>Each slot = one student with full premium access.</div>
              <div style={{ marginTop:12, padding:12, background:'#f4f7ff', borderRadius:10, border:'1px solid #e4eaf5' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#071B49', marginBottom:6 }}>Need more slots?</div>
                <div style={{ display:'flex', gap:6 }}>
                  <a href="mailto:schools@examprep.ng" style={{ flex:1, padding:'7px 0', borderRadius:8, background:'#062A78', color:'#fff', textDecoration:'none', fontSize:10, fontWeight:700, textAlign:'center' }}>✉ Email us</a>
                  <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:'7px 0', borderRadius:8, background:'#25D366', color:'#fff', textDecoration:'none', fontSize:10, fontWeight:700, textAlign:'center' }}>WhatsApp</a>
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ padding:'14px 16px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#071B49', marginBottom:10 }}>How slots work</div>
            {[
              ['🎟', 'Each slot covers one student.'],
              ['📲', 'Students join via the invite code.'],
              ['⭐', 'Joined students get full access.'],
              ['➕', 'Contact us to add more slots.'],
            ].map(([ico, txt], i) => (
              <div key={i} style={{ display:'flex', gap:8, fontSize:11, color:'#7a8aaa', marginBottom: i < 3 ? 8 : 0 }}>
                <span>{ico}</span>{txt}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}