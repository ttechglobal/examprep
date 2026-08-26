'use client'
// src/components/lesson/SnapAndMark.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Floating button that lives inside the lesson viewer.
// Student snaps a photo of their handwritten working or essay.
// Sends to /api/student/snap-mark (Llama 4 vision).
// Shows step-by-step marking in a bottom sheet.
//
// Props:
//   question    — the question being answered (string)
//   type        — 'maths' | 'essay'
//   subject     — subject name (string)
//   accentColor — matches the lesson accent
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react'

export default function SnapAndMark({ question, type = 'maths', subject = '', accentColor = '#9b7ae0' }) {
  const [phase,    setPhase]    = useState('idle')   // idle|preview|marking|result|error
  const [preview,  setPreview]  = useState(null)     // base64 data URL
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)
  const fileRef   = useRef(null)
  const cameraRef = useRef(null)

  // ── File picked (camera or gallery) ────────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setPreview(ev.target.result)
      setPhase('preview')
    }
    reader.readAsDataURL(file)
  }

  // ── Submit to AI ────────────────────────────────────────────────────────────
  async function submitForMarking() {
    if (!preview) return
    setPhase('marking')
    setError(null)
    try {
      const res  = await fetch('/api/student/snap-mark', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: preview, question, type, subject }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
      setPhase('result')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setPhase('error')
    }
  }

  function reset() {
    setPhase('idle'); setPreview(null); setResult(null); setError(null)
    if (fileRef.current)   fileRef.current.value   = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  const pct = result?.overall?.pct ?? 0

  // ── Idle: floating snap button ──────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{
          background: `${accentColor}0d`, border: `1.5px dashed ${accentColor}40`,
          borderRadius: 14, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>📸</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 2 }}>
              Snap your {type === 'essay' ? 'essay' : 'working'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-tert)', lineHeight: 1.4 }}>
              Write your answer on paper, take a photo, and AI will mark it step by step.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            {/* Camera button */}
            <label style={{
              padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
              background: accentColor, color: '#fff',
              fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: `0 3px 0 ${accentColor}88`,
            }}>
              📷 Camera
              <input
                ref={cameraRef}
                type="file" accept="image/*" capture="environment"
                style={{ display: 'none' }} onChange={handleFile}
              />
            </label>
            {/* Gallery button */}
            <label style={{
              padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
              background: 'var(--surface2)', color: 'var(--dim)',
              border: '1px solid var(--border)',
              fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              🖼 Upload
              <input
                ref={fileRef}
                type="file" accept="image/*"
                style={{ display: 'none' }} onChange={handleFile}
              />
            </label>
          </div>
        </div>
      </div>
    )
  }

  // ── Preview: show image, confirm before sending ─────────────────────────────
  if (phase === 'preview') {
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <img
            src={preview} alt="Your working"
            style={{ width: '100%', maxHeight: 280, objectFit: 'contain', background: '#fff' }}
          />
          <div style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
            <button
              onClick={reset}
              style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--dim)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← Retake
            </button>
            <button
              onClick={submitForMarking}
              style={{ flex: 2, padding: '10px', borderRadius: 10, background: accentColor, color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 3px 0 ${accentColor}88` }}
            >
              Mark my {type === 'essay' ? 'essay' : 'working'} →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Marking: loading ────────────────────────────────────────────────────────
  if (phase === 'marking') {
    return (
      <div style={{ marginTop: 16, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid var(--border)`, borderTopColor: accentColor, animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 4 }}>AI is reading your {type === 'essay' ? 'essay' : 'working'}…</p>
        <p style={{ fontSize: 11, color: 'var(--dim)' }}>Marking each {type === 'essay' ? 'section' : 'step'} individually</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={{ marginTop: 16, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 14, padding: '14px 16px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--danger)', marginBottom: 4 }}>Couldn't mark this time</p>
        <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 10 }}>{error}</p>
        <button onClick={reset} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-sec)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Try again
        </button>
      </div>
    )
  }

  // ── Result: step-by-step breakdown ─────────────────────────────────────────
  if (phase === 'result' && result) {
    const passed = pct >= 60
    return (
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Score header */}
        <div style={{
          background: passed ? 'var(--success-bg)' : 'var(--warning-bg)',
          border: `1px solid ${passed ? 'var(--success-border)' : 'var(--warning-border)'}`,
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4"/>
              <circle cx="24" cy="24" r="20" fill="none"
                stroke={passed ? 'var(--success)' : 'var(--warning)'}
                strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${Math.round(pct / 100 * 125.6)} 125.6`}
                transform="rotate(-90 24 24)"/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: passed ? 'var(--success)' : 'var(--warning)' }}>
              {pct}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 3 }}>
              {result.overall?.summary}
            </p>
            <p style={{ fontSize: 11, color: 'var(--dim)' }}>
              {result.overall?.score} / {result.overall?.total} {type === 'essay' ? 'sections' : 'steps'} correct
            </p>
          </div>
        </div>

        {/* Step breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--faint)' }}>
            {type === 'essay' ? 'Section feedback' : 'Step-by-step'}
          </p>
          {(result.steps ?? []).map((step, i) => (
            <div key={i} style={{
              padding: '10px 12px', borderRadius: 12,
              background: step.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
              border: `1px solid ${step.ok ? 'var(--success-border)' : 'var(--danger-border)'}`,
              display: 'flex', gap: 9, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: step.ok ? 'rgba(74,222,128,.15)' : 'rgba(239,93,78,.15)',
                color: step.ok ? 'var(--success)' : 'var(--danger)',
                fontSize: 10, fontWeight: 900, marginTop: 1,
              }}>
                {step.ok ? '✓' : '✗'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: step.ok ? 'var(--success)' : 'var(--danger)', marginBottom: 2 }}>{step.label}</p>
                {step.studentText && (
                  <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-sec)', background: 'rgba(255,255,255,.04)', padding: '2px 6px', borderRadius: 5, display: 'inline-block', marginBottom: 3 }}>{step.studentText}</p>
                )}
                <p style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.5 }}>{step.comment}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        {result.overall?.tip && (
          <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
            <p style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 700, lineHeight: 1.5 }}>
              💡 {result.overall.tip}
            </p>
          </div>
        )}

        {/* Try again */}
        <button
          onClick={reset}
          style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--dim)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Snap another attempt
        </button>
      </div>
    )
  }

  return null
}