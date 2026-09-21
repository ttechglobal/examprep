'use client'
// src/app/admin/notifications/page.js
//
// Manual push notification sender.
// - Pick a saved template or write a custom message
// - Preview how it looks on a phone
// - Send to all subscribed users
// - Save new templates to localStorage (no DB table needed)

import { useState, useEffect } from 'react'

// ── Built-in templates ────────────────────────────────────────────────────────
const BUILT_IN_TEMPLATES = [
  {
    id: 'challenge',
    label: '🏆 New Challenge',
    title: '🏆 New challenge just dropped!',
    body:  'A special challenge is live right now. Can you top the leaderboard?',
    url:   '/student/practice',
    tag:   'ep-challenge',
  },
  {
    id: 'offer',
    label: '🎁 Special Offer',
    title: '🎁 Special offer — act fast!',
    body:  'We have something special for you. Open the app to see.',
    url:   '/student/home',
    tag:   'ep-offer',
  },
  {
    id: 'streak',
    label: '🔥 Streak Warning',
    title: '🔥 Your streak is about to break!',
    body:  "Don't lose your progress. Quick practice now — it only takes 2 minutes.",
    url:   '/student/practice',
    tag:   'ep-streak',
  },
  {
    id: 'leaderboard',
    label: '📊 Leaderboard Update',
    title: '📊 Leaderboard just updated',
    body:  "See where you rank. Others are catching up — don't let them.",
    url:   '/student/home',
    tag:   'ep-leaderboard',
  },
  {
    id: 'new_content',
    label: '📚 New Content',
    title: '📚 New lessons are live!',
    body:  'Fresh content has just been added. Check it out before your next exam.',
    url:   '/student/subjects',
    tag:   'ep-content',
  },
  {
    id: 'exam_tip',
    label: '💡 Exam Tip',
    title: '💡 Quick exam tip for you',
    body:  'Top students practise a little every day. Open ExamPrep and keep your streak.',
    url:   '/student/practice',
    tag:   'ep-tip',
  },
]

const LS_KEY = 'ep_admin_notif_templates'

function loadCustomTemplates() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function saveCustomTemplates(templates) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(templates)) } catch {}
}

// ── Colours matching admin shell ───────────────────────────────────────────────
const NAVY  = '#062A78'
const BLUE  = '#1264E5'
const GREEN = '#10b981'
const RED   = '#ef4444'
const GOLD  = '#FFB800'

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ children }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 10 }}>
      {children}
    </p>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 22px', ...style }}>
      {children}
    </div>
  )
}

// Phone preview of what the notification will look like
function NotifPreview({ title, body }) {
  const hasContent = title.trim() || body.trim()
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 14, padding: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>Preview</p>
      <div style={{
        background: '#fff',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,.1)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: NAVY,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 16 }}>📚</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>ExamPrep A1</p>
            <p style={{ fontSize: 10, color: '#cbd5e1' }}>now</p>
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 2, lineHeight: 1.3 }}>
            {hasContent ? (title || 'Notification title') : 'Notification title'}
          </p>
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
            {hasContent ? (body || 'Your message body goes here.') : 'Your message body goes here.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function TemplateButton({ template, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '10px 12px',
        borderRadius: 10, border: `1.5px solid ${active ? BLUE : '#e2e8f0'}`,
        background: active ? '#eff6ff' : '#fff',
        textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all .12s',
        marginBottom: 4,
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0 }}>{template.label.split(' ')[0]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: active ? BLUE : '#1e293b', lineHeight: 1.2 }}>
          {template.label.split(' ').slice(1).join(' ')}
        </p>
        <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {template.body}
        </p>
      </div>
      {active && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: BLUE, flexShrink: 0 }} />
      )}
    </button>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminNotificationsPage() {
  const [customTemplates, setCustomTemplates] = useState([])
  const [activeTemplateId, setActiveTemplateId] = useState(null)

  // Form state
  const [title,   setTitle]   = useState('')
  const [body,    setBody]    = useState('')
  const [url,     setUrl]     = useState('/student/practice')
  const [tag,     setTag]     = useState('ep-custom')

  // Send state
  const [sending, setSending] = useState(false)
  const [result,  setResult]  = useState(null)   // { ok, sent, stale } | { error }

  // Save template state
  const [savingTpl,   setSavingTpl]   = useState(false)
  const [newTplLabel, setNewTplLabel] = useState('')

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates())
  }, [])

  const allTemplates = [...BUILT_IN_TEMPLATES, ...customTemplates]

  function applyTemplate(tpl) {
    setActiveTemplateId(tpl.id)
    setTitle(tpl.title)
    setBody(tpl.body)
    setUrl(tpl.url || '/student/practice')
    setTag(tpl.tag || 'ep-custom')
    setResult(null)
  }

  function clearForm() {
    setActiveTemplateId(null)
    setTitle('')
    setBody('')
    setUrl('/student/practice')
    setTag('ep-custom')
    setResult(null)
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/notifications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, body, url, tag }),
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ error: e.message })
    } finally {
      setSending(false)
    }
  }

  function handleSaveTemplate() {
    if (!newTplLabel.trim() || !title.trim() || !body.trim()) return
    const newTpl = {
      id:    'custom-' + Date.now(),
      label: newTplLabel.trim(),
      title: title.trim(),
      body:  body.trim(),
      url:   url.trim() || '/student/practice',
      tag:   tag.trim() || 'ep-custom',
    }
    const updated = [...customTemplates, newTpl]
    setCustomTemplates(updated)
    saveCustomTemplates(updated)
    setNewTplLabel('')
    setSavingTpl(false)
    setActiveTemplateId(newTpl.id)
  }

  function handleDeleteTemplate(id) {
    const updated = customTemplates.filter(t => t.id !== id)
    setCustomTemplates(updated)
    saveCustomTemplates(updated)
    if (activeTemplateId === id) clearForm()
  }

  const canSend = title.trim() && body.trim() && !sending

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: `linear-gradient(135deg, ${NAVY}, ${BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            🔔
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
              Push Notifications
            </h1>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Send a notification to all subscribed users right now
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: template picker ── */}
        <div>
          <Card>
            <SectionHeader>Templates</SectionHeader>

            <SectionHeader>Built-in</SectionHeader>
            {BUILT_IN_TEMPLATES.map(tpl => (
              <TemplateButton
                key={tpl.id}
                template={tpl}
                active={activeTemplateId === tpl.id}
                onClick={() => applyTemplate(tpl)}
              />
            ))}

            {customTemplates.length > 0 && (
              <>
                <div style={{ height: 1, background: '#f1f5f9', margin: '14px 0 10px' }} />
                <SectionHeader>Saved</SectionHeader>
                {customTemplates.map(tpl => (
                  <div key={tpl.id} style={{ position: 'relative' }}>
                    <TemplateButton
                      template={tpl}
                      active={activeTemplateId === tpl.id}
                      onClick={() => applyTemplate(tpl)}
                    />
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      title="Delete template"
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 20, height: 20, borderRadius: 6,
                        background: '#fef2f2', border: '1px solid #fecaca',
                        color: RED, fontSize: 11, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >✕</button>
                  </div>
                ))}
              </>
            )}

            <div style={{ height: 1, background: '#f1f5f9', margin: '14px 0 12px' }} />
            <button
              onClick={clearForm}
              style={{
                width: '100%', padding: '9px 12px',
                borderRadius: 10, border: '1.5px dashed #cbd5e1',
                background: 'transparent', color: '#64748b',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              + Custom message
            </button>
          </Card>
        </div>

        {/* ── Right: compose + send ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Compose */}
          <Card>
            <SectionHeader>Compose</SectionHeader>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Title <span style={{ color: RED }}>*</span>
                </label>
                <input
                  value={title}
                  onChange={e => { setTitle(e.target.value); setActiveTemplateId(null) }}
                  placeholder="e.g. 🏆 New challenge just dropped!"
                  maxLength={80}
                  style={{
                    width: '100%', padding: '10px 12px',
                    borderRadius: 10, border: '1.5px solid #e2e8f0',
                    fontSize: 13, fontFamily: 'inherit', outline: 'none',
                    color: '#0f172a',
                  }}
                />
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>{title.length}/80</p>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Body <span style={{ color: RED }}>*</span>
                </label>
                <textarea
                  value={body}
                  onChange={e => { setBody(e.target.value); setActiveTemplateId(null) }}
                  placeholder="The message students will read in the notification..."
                  maxLength={150}
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px',
                    borderRadius: 10, border: '1.5px solid #e2e8f0',
                    fontSize: 13, fontFamily: 'inherit', outline: 'none',
                    resize: 'vertical', color: '#0f172a', lineHeight: 1.5,
                  }}
                />
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>{body.length}/150</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>
                    Deep link URL
                  </label>
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="/student/practice"
                    style={{
                      width: '100%', padding: '10px 12px',
                      borderRadius: 10, border: '1.5px solid #e2e8f0',
                      fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#0f172a',
                    }}
                  />
                  <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>Where tapping opens in the app</p>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>
                    Tag
                  </label>
                  <input
                    value={tag}
                    onChange={e => setTag(e.target.value)}
                    placeholder="ep-custom"
                    style={{
                      width: '100%', padding: '10px 12px',
                      borderRadius: 10, border: '1.5px solid #e2e8f0',
                      fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#0f172a',
                    }}
                  />
                  <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>Replaces existing notif with same tag</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <Card>
            <NotifPreview title={title} body={body} />
          </Card>

          {/* Save as template */}
          <Card>
            <SectionHeader>Save as template</SectionHeader>
            {savingTpl ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newTplLabel}
                  onChange={e => setNewTplLabel(e.target.value)}
                  placeholder="Template name, e.g. 🎁 Flash Sale"
                  onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                  autoFocus
                  style={{
                    flex: 1, padding: '9px 12px',
                    borderRadius: 10, border: '1.5px solid #e2e8f0',
                    fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#0f172a',
                  }}
                />
                <button
                  onClick={handleSaveTemplate}
                  disabled={!newTplLabel.trim() || !title.trim() || !body.trim()}
                  style={{
                    padding: '9px 16px', borderRadius: 10, border: 'none',
                    background: GREEN, color: '#fff', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', opacity: (!newTplLabel.trim() || !title.trim() || !body.trim()) ? 0.5 : 1,
                  }}
                >Save</button>
                <button
                  onClick={() => setSavingTpl(false)}
                  style={{
                    padding: '9px 12px', borderRadius: 10,
                    border: '1px solid #e2e8f0', background: '#fff',
                    fontSize: 12, color: '#64748b', cursor: 'pointer',
                  }}
                >Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setSavingTpl(true)}
                disabled={!title.trim() || !body.trim()}
                style={{
                  padding: '9px 16px', borderRadius: 10,
                  border: '1.5px dashed #cbd5e1', background: 'transparent',
                  color: '#64748b', fontSize: 12, fontWeight: 700,
                  cursor: (!title.trim() || !body.trim()) ? 'default' : 'pointer',
                  opacity: (!title.trim() || !body.trim()) ? 0.5 : 1,
                }}
              >
                + Save current message as template
              </button>
            )}
          </Card>

          {/* Send */}
          <Card style={{ background: canSend ? `linear-gradient(135deg, ${NAVY}, ${BLUE})` : '#f8fafc', border: canSend ? 'none' : '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: canSend ? '#fff' : '#94a3b8', marginBottom: 2 }}>
                  {sending ? 'Sending…' : 'Send to all users'}
                </p>
                <p style={{ fontSize: 11, color: canSend ? 'rgba(255,255,255,.65)' : '#cbd5e1' }}>
                  {canSend
                    ? 'This will immediately push to every subscribed device.'
                    : 'Fill in title and body to enable sending.'}
                </p>
              </div>
              <button
                onClick={handleSend}
                disabled={!canSend}
                style={{
                  padding: '11px 24px', borderRadius: 12, border: 'none',
                  background: canSend ? GOLD : '#e2e8f0',
                  color: canSend ? NAVY : '#94a3b8',
                  fontSize: 13, fontWeight: 900,
                  cursor: canSend ? 'pointer' : 'default',
                  flexShrink: 0,
                  boxShadow: canSend ? '0 2px 0 #CC8F00' : 'none',
                  transition: 'all .15s',
                }}
              >
                {sending ? '⏳ Sending…' : '🔔 Send now'}
              </button>
            </div>

            {/* Result */}
            {result && (
              <div style={{
                marginTop: 14, padding: '10px 14px', borderRadius: 10,
                background: result.ok ? 'rgba(255,255,255,.12)' : '#fef2f2',
                border: result.ok ? '1px solid rgba(255,255,255,.2)' : '1px solid #fecaca',
              }}>
                {result.ok ? (
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    ✅ Sent to {result.sent ?? '?'} device{result.sent !== 1 ? 's' : ''}
                    {result.stale > 0 ? ` · ${result.stale} stale removed` : ''}
                  </p>
                ) : (
                  <p style={{ fontSize: 12, fontWeight: 700, color: RED }}>
                    ❌ {result.error ?? 'Failed to send'}
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}