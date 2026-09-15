'use client'
// src/app/school/dashboard/tabs/SettingsTab.js

import { useState }     from 'react'
import { useRouter }    from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { initials }     from './shared'

const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']

const INPUT_STYLE = { width:'100%', padding:'9px 12px', borderRadius:9, border:'1.5px solid #e4eaf5', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const FOCUS_STYLE = { borderColor:'#1264E5' }

export default function SettingsTab({ school, onSaved }) {
  const [name,              setName]              = useState(school?.name  ?? '')
  const [city,              setCity]              = useState(school?.city  ?? '')
  const [state,             setState]             = useState(school?.state ?? '')
  const [saving,            setSaving]            = useState(false)
  const [saved,             setSaved]             = useState(false)
  const [error,             setError]             = useState(null)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [signingOut,        setSigningOut]        = useState(false)
  const router = useRouter()

  async function handleSave() {
    if (!name.trim()) { setError('School name is required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/school/setup', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName: name.trim(), city: city.trim(), state }),
      })
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setSaved(true); setTimeout(() => setSaved(false), 2500)
      onSaved?.({ name: name.trim(), city: city.trim(), state })
    } catch { setError('Failed to save') } finally { setSaving(false) }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/school-login')
    } catch {
      setSigningOut(false)
      setShowSignOutConfirm(false)
    }
  }

  return (
    <div className="sd-content">
      <div className="sd-page-title">Settings</div>

      <div className="sd-settings-cols">
        {/* ── Main settings panel ── */}
        <div className="panel" style={{ padding:22 }}>
          {/* School identity preview */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:12, background:'#f4f7ff', borderRadius:11, border:'1px solid #e4eaf5', marginBottom:20 }}>
            <div style={{ width:44, height:44, borderRadius:11, background:'#062A78', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#FFB800', flexShrink:0 }}>
              {initials(name || '?')}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#071B49' }}>{name || 'Your School'}</div>
              <div style={{ fontSize:11, color:'#7a8aaa' }}>{city || '—'}{state ? `, ${state}` : ''}</div>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#071B49', display:'block', marginBottom:5 }}>School name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Excellence Academy" style={INPUT_STYLE}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#071B49', display:'block', marginBottom:5 }}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Lagos" style={INPUT_STYLE}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#071B49', display:'block', marginBottom:5 }}>State</label>
              <select value={state} onChange={e => setState(e.target.value)} style={{ ...INPUT_STYLE, color: state ? '#071B49' : '#b0bada' }}>
                <option value="">Select state</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {error  && <div style={{ fontSize:12, color:'#dc2626', padding:'9px 12px', background:'#fef2f2', borderRadius:8, border:'1px solid #fecaca' }}>{error}</div>}
            {saved  && <div style={{ fontSize:12, color:'#059669', padding:'9px 12px', background:'#ecfdf5', borderRadius:8, border:'1px solid #a7f3d0' }}>✓ Changes saved</div>}

            <div style={{ textAlign:'right' }}>
              <button
                onClick={handleSave} disabled={saving}
                style={{ padding:'9px 20px', borderRadius:9, background: saving ? '#e2e8f0' : '#062A78', color: saving ? '#7a8aaa' : '#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="sd-settings-side" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="panel" style={{ padding:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#071B49', marginBottom:10 }}>Support</div>
            <a href="mailto:schools@examprep.ng" style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 12px', borderRadius:9, background:'#f4f7ff', border:'1px solid #e4eaf5', textDecoration:'none', color:'#071B49', fontSize:12, fontWeight:600, marginBottom:7 }}>
              ✉ schools@examprep.ng
            </a>
            <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 12px', borderRadius:9, background:'#ECFDF5', border:'1px solid #a7f3d0', textDecoration:'none', color:'#059669', fontSize:12, fontWeight:600 }}>
              WhatsApp support
            </a>
          </div>

          {/* Sign out — no longer framed as "danger zone" since it's just sign-out */}
          <div className="panel" style={{ padding:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#071B49', marginBottom:7 }}>Account</div>
            <div style={{ fontSize:11, color:'#7a8aaa', marginBottom:10, lineHeight:1.5 }}>
              Sign out of the school dashboard on this device.
            </div>
            {!showSignOutConfirm ? (
              <button
                onClick={() => setShowSignOutConfirm(true)}
                style={{ padding:'7px 14px', borderRadius:8, background:'transparent', border:'1.5px solid #e4eaf5', color:'#3a4870', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', width:'100%' }}
              >
                Sign out
              </button>
            ) : (
              <div>
                <div style={{ fontSize:11, color:'#3a4870', marginBottom:8, fontWeight:600 }}>Sign out of this dashboard?</div>
                <div style={{ display:'flex', gap:6 }}>
                  <button
                    onClick={() => setShowSignOutConfirm(false)}
                    style={{ flex:1, padding:'7px 0', borderRadius:8, border:'1px solid #e4eaf5', background:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'#7a8aaa' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSignOut} disabled={signingOut}
                    style={{ flex:1, padding:'7px 0', borderRadius:8, border:'none', background:'#062A78', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
                  >
                    {signingOut ? '…' : 'Sign out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}