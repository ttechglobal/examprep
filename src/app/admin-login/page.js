'use client'
// src/app/admin/login/page.js
// Password-only admin login.
// On success the API sets a secure httpOnly cookie — no Supabase session needed.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [show,     setShow]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res  = await fetch('/api/admin/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      setError(data.error ?? 'Incorrect password')
      setLoading(false)
      return
    }

    router.replace('/admin/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0e14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: '#1a1b28', border: '1px solid rgba(255,255,255,.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900, color: '#fff',
            margin: '0 auto 12px',
            boxShadow: '0 4px 0 #05070f',
          }}>E</div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ExamPrep Admin
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#13141f',
          border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 20,
          padding: '28px 24px',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#eef0fa', marginBottom: 4 }}>
            Admin access
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', marginBottom: 24 }}>
            Enter the admin password to continue.
          </p>

          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px',
              background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.25)',
              borderRadius: 10, fontSize: 13, color: '#f87171',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Admin password"
                required
                autoFocus
                style={{
                  width: '100%', padding: '12px 44px 12px 14px',
                  background: '#0d0e14', border: '1.5px solid rgba(255,255,255,.1)',
                  borderRadius: 12, fontSize: 14, color: '#eef0fa',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(155,122,224,.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.1)'}
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 15,
                  color: 'rgba(255,255,255,.3)',
                }}
              >
                {show ? '🙈' : '👁'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%', padding: 13, borderRadius: 12, border: 'none',
                background: loading ? 'rgba(155,122,224,.3)' : '#9b7ae0',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 0 #5b3fa8',
                transition: 'all .15s',
              }}
            >
              {loading ? 'Checking…' : 'Enter dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}