'use client'
// src/app/school/dashboard/tabs/SubscriptionsTab.js
//
// Schools manage their premium student slots here.
//
// What it shows:
//   - Slot usage bar (X of Y used, Z remaining)
//   - "Buy more slots" section — picks a quantity, opens pre-filled WhatsApp
//   - Add student by email (checks if registered, consumes one slot)
//   - List of subscribed students with remove button

import { useState, useEffect, useCallback } from 'react'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GREEN  = '#059669'
const RED    = '#dc2626'
const BORDER = '#e4eaf5'
const DIM    = '#7a8aaa'
const FAINT  = '#b0bada'
const TEXT   = '#071B49'

// WhatsApp number — update when you have the real one
const WA_NUMBER = '2348000000000'

function SlotBar({ used, purchased }) {
  const pct    = purchased > 0 ? Math.min(100, Math.round((used / purchased) * 100)) : 0
  const left   = Math.max(0, purchased - used)
  const danger = left <= 2

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: DIM, marginBottom: 2 }}>Slots used</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: TEXT, lineHeight: 1 }}>
            {used}
            <span style={{ fontSize: 14, fontWeight: 500, color: DIM }}> / {purchased}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: DIM, marginBottom: 2 }}>Available</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: danger ? RED : GREEN, lineHeight: 1 }}>
            {left}
          </div>
        </div>
      </div>

      <div style={{ height: 8, background: BORDER, borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 99,
          background: danger ? RED : BLUE,
          transition: 'width .4s ease',
        }}/>
      </div>

      {danger && left > 0 && (
        <div style={{ fontSize: 11, color: RED, fontWeight: 600 }}>
          ⚠ Only {left} slot{left !== 1 ? 's' : ''} remaining — buy more below.
        </div>
      )}
      {left === 0 && (
        <div style={{ fontSize: 11, color: RED, fontWeight: 700 }}>
          ✕ All slots are used. Buy more slots to add more students.
        </div>
      )}
    </div>
  )
}

function BuySlots({ schoolName, adminEmail }) {
  const QUANTITIES = [10, 20, 30, 50, 100]
  const [qty, setQty] = useState(20)

  function openWhatsApp() {
    const msg =
      `Hi ExamPrep 👋\n\n` +
      `I'd like to buy ${qty} student slot${qty !== 1 ? 's' : ''} for my school.\n\n` +
      `School: ${schoolName || 'My School'}\n` +
      `Account email: ${adminEmail || ''}\n\n` +
      `Please send payment details. Thank you.`
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ padding: 18, background: '#F0F4FF', borderRadius: 12, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 4 }}>Buy more slots</div>
      <div style={{ fontSize: 11, color: DIM, marginBottom: 14, lineHeight: 1.5 }}>
        Select how many slots you want. We'll send you payment details on WhatsApp.
        Each slot = ₦3,000/year per student.
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {QUANTITIES.map(q => (
          <button
            key={q}
            onClick={() => setQty(q)}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${qty === q ? BLUE : BORDER}`,
              background: qty === q ? '#EBF1FE' : '#fff',
              color: qty === q ? BLUE : DIM,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: TEXT }}>
          <span style={{ fontWeight: 700 }}>{qty} slots</span>
          <span style={{ color: DIM }}> = ₦{(qty * 3000).toLocaleString()}/year</span>
        </div>
      </div>

      <button
        onClick={openWhatsApp}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 10,
          background: '#25D366', color: '#fff',
          border: 'none', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.116 1.535 5.84L.057 23.882a.5.5 0 0 0 .61.61l6.042-1.478A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.674-.5-5.21-1.374l-.374-.217-3.883.95.968-3.793-.237-.386A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
        Send request on WhatsApp
      </button>
      <div style={{ fontSize: 10, color: FAINT, marginTop: 8 }}>
        We'll confirm your payment and activate the slots within 24 hours.
      </div>
    </div>
  )
}

function AddStudentForm({ slotsLeft, onAdded }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState(null)
  const [ok,      setOk]      = useState(null)

  async function submit() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) { setErr('Enter a valid email address'); return }
    setLoading(true); setErr(null); setOk(null)
    try {
      const res = await fetch('/api/school/subscriptions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: trimmed }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error || 'Something went wrong'); return }
      setOk(`${d.subscription.full_name || trimmed} added to premium ✓`)
      setEmail('')
      onAdded?.(d)
    } catch { setErr('Network error — please try again') }
    finally   { setLoading(false) }
  }

  const disabled = slotsLeft <= 0

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>
        Add a student
      </div>
      <div style={{ fontSize: 11, color: DIM, marginBottom: 16, lineHeight: 1.5 }}>
        Enter the student's email address. They must have an ExamPrep account first.
        {disabled && (
          <span style={{ display: 'block', color: RED, fontWeight: 600, marginTop: 4 }}>
            You have no slots left. Buy more slots to continue adding students.
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setErr(null); setOk(null) }}
          onKeyDown={e => e.key === 'Enter' && !loading && !disabled && submit()}
          placeholder="student@email.com"
          disabled={disabled || loading}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: `1.5px solid ${err ? RED : email ? BLUE : BORDER}`,
            fontSize: 13, outline: 'none', fontFamily: 'inherit',
            background: disabled ? '#f8fafc' : '#fff',
            color: TEXT, transition: 'border-color .15s',
          }}
        />
        <button
          onClick={submit}
          disabled={disabled || loading || !email.trim()}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: disabled || !email.trim() ? '#e2e8f0' : NAVY,
            color: disabled || !email.trim() ? FAINT : '#fff',
            fontSize: 13, fontWeight: 700, cursor: disabled || !email.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Adding…' : 'Add →'}
        </button>
      </div>

      {err && (
        <div style={{ marginTop: 10, fontSize: 12, color: RED, lineHeight: 1.5 }}>{err}</div>
      )}
      {ok && (
        <div style={{ marginTop: 10, fontSize: 12, color: GREEN, fontWeight: 600 }}>{ok}</div>
      )}
    </div>
  )
}

function SubRow({ sub, onRemoved }) {
  const [removing, setRemoving] = useState(false)
  const [done,     setDone]     = useState(false)

  async function remove() {
    if (!confirm(`Remove ${sub.full_name || sub.email} from premium? Their access will end immediately.`)) return
    setRemoving(true)
    try {
      const res = await fetch('/api/school/subscriptions', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscription_id: sub.id }),
      })
      if (res.ok) { setDone(true); onRemoved?.(sub.id) }
    } catch {}
    finally { setRemoving(false) }
  }

  if (done) return null

  const initials = (sub.full_name || sub.email)
    .split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  const colors = ['#1264E5','#059669','#7C3AED','#D97706','#DC2626','#0891B2']
  const col    = colors[(sub.email.charCodeAt(0) || 0) % colors.length]

  const date = sub.assigned_at
    ? new Date(sub.assigned_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : ''

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: col, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, flexShrink: 0,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub.full_name || <span style={{ color: DIM, fontWeight: 500 }}>{sub.email}</span>}
        </div>
        <div style={{ fontSize: 11, color: DIM, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub.email} {sub.exam_type ? `· ${sub.exam_type}` : ''} {date ? `· Added ${date}` : ''}
        </div>
      </div>

      <span style={{
        padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
        background: '#ECFDF5', color: GREEN, border: '1px solid #a7f3d0',
        flexShrink: 0,
      }}>
        Premium
      </span>

      <button
        onClick={remove}
        disabled={removing}
        style={{
          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
          background: 'none', border: `1px solid ${BORDER}`, color: removing ? FAINT : '#ef4444',
          cursor: removing ? 'wait' : 'pointer', fontFamily: 'inherit', flexShrink: 0,
          transition: 'border-color .12s',
        }}
      >
        {removing ? '…' : 'Remove'}
      </button>
    </div>
  )
}

export default function SubscriptionsTab({ school, adminEmail }) {
  const [loading,       setLoading]       = useState(true)
  const [err,           setErr]           = useState(null)
  const [slotsPurchased, setSlotsPurchased] = useState(school?.slots_purchased ?? 2)
  const [slotsUsed,     setSlotsUsed]     = useState(school?.slots_used      ?? 0)
  const [subs,          setSubs]          = useState([])

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/school/subscriptions')
      const d   = await res.json()
      if (d.error) { setErr(d.error); return }
      setSlotsPurchased(d.slots_purchased ?? 2)
      setSlotsUsed(d.slots_used ?? 0)
      setSubs(d.subscriptions ?? [])
    } catch { setErr('Failed to load. Refresh to try again.') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function handleAdded(d) {
    setSubs(prev => [d.subscription, ...prev])
    setSlotsUsed(d.slots_used)
    setSlotsPurchased(d.slots_purchased)
  }

  function handleRemoved(id) {
    setSubs(prev => prev.filter(s => s.id !== id))
    setSlotsUsed(prev => Math.max(0, prev - 1))
  }

  const slotsLeft = Math.max(0, slotsPurchased - slotsUsed)

  return (
    <div className="sd-content">
      <div className="sd-page-header">
        <div>
          <div className="sd-page-title">Subscriptions</div>
          <div className="sd-page-sub">Manage premium student slots for your school</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: DIM, fontSize: 13 }}>
          Loading…
        </div>
      ) : err ? (
        <div style={{ padding: 20, background: '#fef2f2', borderRadius: 12, color: RED, fontSize: 13 }}>
          {err} <button onClick={load} style={{ background: 'none', border: 'none', color: BLUE, textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>Retry</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Slot usage panel */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 16 }}>
              Your slots
            </div>
            <SlotBar used={slotsUsed} purchased={slotsPurchased} />

            <div style={{ marginTop: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, fontSize: 11, color: DIM, lineHeight: 1.6 }}>
              <strong style={{ color: TEXT }}>How slots work:</strong> Each slot = one student with premium access.
              Schools start with 2 free slots. You can remove a student to free up a slot and add someone else.
            </div>
          </div>

          {/* Add student */}
          <AddStudentForm slotsLeft={slotsLeft} onAdded={handleAdded} />

          {/* Buy more */}
          <BuySlots schoolName={school?.name} adminEmail={adminEmail} />

          {/* Subscribed students list */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Subscribed students</div>
                <div className="panel-sub">
                  {subs.length === 0 ? 'No students added yet' : `${subs.length} student${subs.length !== 1 ? 's' : ''} on premium`}
                </div>
              </div>
            </div>

            {subs.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: DIM, fontSize: 12 }}>
                Add your first student above to get started.
              </div>
            ) : (
              <div style={{ padding: '0 20px' }}>
                {subs.map(s => (
                  <SubRow key={s.id} sub={s} onRemoved={handleRemoved} />
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}