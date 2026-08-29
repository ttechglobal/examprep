// src/lib/localSessionSync.js
// ─────────────────────────────────────────────────────────────────────────────
// Local-first session persistence and sync.
//
// Every practice session — guest or auth, online or offline — is saved locally
// first. A sync queue holds sessions that haven't reached the server yet.
// When the user logs in, comes online, or creates an account, the queue flushes
// automatically and their full history lands in Supabase.
//
// Keys:
//   ep_session_history  — last 20 sessions, shown in SessionHistory component
//   ep_activity         — { 'YYYY-MM-DD': questionCount } for activity chart
//   ep_sync_queue       — sessions waiting to reach the server
//   ep_sync_queue_lock  — prevents concurrent flush attempts
//
// Usage (client-side only):
//   import { saveSessionLocally, flushSyncQueue } from '@/lib/localSessionSync'
//
//   // After every session, always call this first:
//   saveSessionLocally(sessionData)
//
//   // Then attempt server sync (non-blocking):
//   flushSyncQueue()
// ─────────────────────────────────────────────────────────────────────────────

const HISTORY_KEY  = 'ep_session_history'
const ACTIVITY_KEY = 'ep_activity'
const QUEUE_KEY    = 'ep_sync_queue'
const LOCK_KEY     = 'ep_sync_queue_lock'
const LOCK_TTL_MS  = 30_000   // 30s — stale lock timeout
const MAX_HISTORY  = 20
const MAX_QUEUE    = 100
const SYNC_ENDPOINT = '/api/student/questions/session/save'

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}

function safeWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ── Session history ───────────────────────────────────────────────────────────

/**
 * Normalise a raw session payload into the shape SessionHistory expects.
 */
function normaliseSession(raw) {
  const count   = raw.questions_count ?? raw.total_questions ?? raw.count ?? 0
  const correct = raw.correct_count   ?? raw.correct ?? 0
  const pct     = count > 0 ? Math.round((correct / count) * 100) : 0
  const secs    = raw.duration_secs ?? raw.time ?? 0
  const timeStr = secs > 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : secs ? `${secs}s` : null
  return {
    id:      raw.session_id ?? raw.id ?? null,
    subject: raw.subject_name ?? raw.subject ?? 'Mixed',
    mode:    raw.mode ?? 'practice',
    date:    raw.created_at
      ? new Date(raw.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : 'Today',
    count, correct, pct, timeStr,
    synced:  raw.synced ?? false,
  }
}

/**
 * Append a session to the local history list.
 * Deduplicates by session_id if present.
 */
export function appendToHistory(sessionData) {
  const entry    = normaliseSession(sessionData)
  const existing = safeRead(HISTORY_KEY, [])
  const filtered = entry.id ? existing.filter(s => s.id !== entry.id) : existing
  const updated  = [entry, ...filtered].slice(0, MAX_HISTORY)
  safeWrite(HISTORY_KEY, updated)
  return updated
}

export function readHistory() {
  return safeRead(HISTORY_KEY, [])
}

// ── Activity chart ────────────────────────────────────────────────────────────

/**
 * Record questions answered today for the activity bar chart.
 */
export function recordActivity(questionCount = 1) {
  try {
    const today   = new Date().toISOString().slice(0, 10)
    const data    = safeRead(ACTIVITY_KEY, {})
    data[today]   = (data[today] || 0) + questionCount
    // Prune entries older than 30 days
    const cutoff  = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutStr  = cutoff.toISOString().slice(0, 10)
    for (const k of Object.keys(data)) {
      if (k < cutStr) delete data[k]
    }
    safeWrite(ACTIVITY_KEY, data)
  } catch {}
}

export function readWeeklyActivity() {
  try {
    const data   = safeRead(ACTIVITY_KEY, {})
    const counts = [0, 0, 0, 0, 0, 0, 0]
    const today  = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      counts[i] = data[d.toISOString().slice(0, 10)] || 0
    }
    return counts
  } catch { return [0, 0, 0, 0, 0, 0, 0] }
}

// ── Sync queue ────────────────────────────────────────────────────────────────

function readQueue() { return safeRead(QUEUE_KEY, []) }
function writeQueue(q) { safeWrite(QUEUE_KEY, q.slice(0, MAX_QUEUE)) }

function acquireLock() {
  try {
    const existing = JSON.parse(localStorage.getItem(LOCK_KEY) ?? 'null')
    if (existing && (Date.now() - existing.ts) < LOCK_TTL_MS) return false  // locked
    localStorage.setItem(LOCK_KEY, JSON.stringify({ ts: Date.now() }))
    return true
  } catch { return false }
}

function releaseLock() {
  try { localStorage.removeItem(LOCK_KEY) } catch {}
}

/**
 * Add a session payload to the sync queue.
 */
function enqueue(payload) {
  const queue   = readQueue()
  const entry   = { payload, queuedAt: new Date().toISOString(), attempts: 0 }
  // Deduplicate by session_id
  const filtered = payload.session_id
    ? queue.filter(q => q.payload?.session_id !== payload.session_id)
    : queue
  writeQueue([...filtered, entry])
}

// ── Main API ──────────────────────────────────────────────────────────────────

/**
 * Save a completed session locally (history + activity + queue).
 * Call this BEFORE making any server request — it's instant and never fails.
 *
 * @param {object} sessionData - Full session payload sent to the server
 * @param {number} xpAwarded   - XP computed locally for instant display
 */
export function saveSessionLocally(sessionData, xpAwarded = 0) {
  // 1. Append to session history
  appendToHistory({ ...sessionData, xp_awarded: xpAwarded })

  // 2. Record activity
  const questionCount = sessionData.results?.length
    ?? sessionData.questions_count
    ?? sessionData.total_questions
    ?? 0
  if (questionCount > 0) recordActivity(questionCount)

  // 3. Queue for server sync
  enqueue(sessionData)
}

/**
 * Flush the sync queue to the server.
 * Safe to call anytime — skips if already flushing, returns count synced.
 * Leaves failed items in the queue for the next attempt.
 *
 * @returns {Promise<number>} Number of sessions successfully synced
 */
export async function flushSyncQueue() {
  if (typeof window === 'undefined') return 0

  const queue = readQueue()
  if (!queue.length) return 0

  // Prevent concurrent flushes
  if (!acquireLock()) return 0

  let synced = 0
  const failed = []

  try {
    for (const item of queue) {
      try {
        const res = await fetch(SYNC_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.ok && !data.guest) {
            synced++
            // Mark session as synced in history
            try {
              const history = readHistory()
              const sid = item.payload?.session_id
              if (sid) {
                const updated = history.map(s => s.id === sid ? { ...s, synced: true } : s)
                safeWrite(HISTORY_KEY, updated)
              }
            } catch {}
            continue  // don't add to failed
          }
        }

        // Server returned non-ok or guest response — keep in queue if too many attempts
        item.attempts = (item.attempts ?? 0) + 1
        if (item.attempts < 5) failed.push(item)
        // After 5 attempts we drop it — prevents infinite queue growth

      } catch {
        // Network error — keep for retry
        item.attempts = (item.attempts ?? 0) + 1
        if (item.attempts < 5) failed.push(item)
      }
    }
  } finally {
    writeQueue(failed)
    releaseLock()
  }

  return synced
}

/**
 * How many sessions are waiting to sync.
 */
export function pendingSyncCount() {
  return readQueue().length
}

/**
 * Call this after a user logs in or creates an account.
 * Flushes the queue and returns number synced.
 */
export async function syncOnLogin() {
  return flushSyncQueue()
}