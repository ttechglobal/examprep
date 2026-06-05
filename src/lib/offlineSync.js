// src/lib/offlineSync.js
// ─────────────────────────────────────────────────────────────────────────────
// ExamPrep offline-first question sync
//
// HOW IT WORKS:
//   1. After login, call triggerSync(userId, profile) once.
//   2. Questions for the student's exam + subjects download in the background
//      into IndexedDB (db: 'examprep', store: 'questions').
//   3. Practice & diagnostic API routes check IndexedDB first (getOfflineQuestions).
//      If offline, serve from cache. If online, fetch normally and cache the result.
//   4. A sync_meta record tracks when each subject was last synced, so subsequent
//      app opens only download a delta (questions newer than last_synced_at).
//
// STORAGE LAYOUT:
//   IndexedDB: examprep  (version 2)
//   ├── questions        keyPath: id
//   │     indexes: subject_id, exam_types, topic_id, is_active
//   └── sync_meta        keyPath: key  (e.g. "WAEC__Mathematics")
//         fields: key, subject_id, exam_type, last_synced_at, question_count
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME    = 'examprep'
const DB_VERSION = 2

// ── Open / upgrade DB ────────────────────────────────────────────────────────

let _db = null

export function openDB() {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result

      // questions store
      if (!db.objectStoreNames.contains('questions')) {
        const qs = db.createObjectStore('questions', { keyPath: 'id' })
        qs.createIndex('subject_id',  'subject_id',  { unique: false })
        qs.createIndex('topic_id',    'topic_id',    { unique: false })
        qs.createIndex('is_active',   'is_active',   { unique: false })
        // exam_types is an array — use multiEntry so each value is indexed
        qs.createIndex('exam_types',  'exam_types',  { unique: false, multiEntry: true })
      }

      // sync_meta store
      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta', { keyPath: 'key' })
      }
    }

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db) }
    req.onerror   = (e) => reject(e.target.error)
  })
}

// ── Low-level helpers ────────────────────────────────────────────────────────

function txStore(db, storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName)
}

function promisify(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

// ── Sync meta ────────────────────────────────────────────────────────────────

async function getSyncMeta(db, key) {
  return promisify(txStore(db, 'sync_meta').get(key))
}

async function setSyncMeta(db, record) {
  return promisify(txStore(db, 'sync_meta', 'readwrite').put(record))
}

// ── Write questions to IndexedDB ─────────────────────────────────────────────

async function storeQuestions(db, questions) {
  if (!questions?.length) return
  const store = txStore(db, 'questions', 'readwrite')
  const ops   = questions.map(q => promisify(store.put(q)))
  await Promise.all(ops)
}

// ── Read questions from IndexedDB ────────────────────────────────────────────

/**
 * Get questions for a given exam type + subject ids from IndexedDB.
 * Returns [] if nothing cached yet.
 */
export async function getOfflineQuestions({ examType, subjectIds = [], limit = 60 }) {
  try {
    const db    = await openDB()
    const store = txStore(db, 'questions')

    // Use exam_types multiEntry index
    const results = await promisify(
      store.index('exam_types').getAll(examType, limit * 3)
    )

    return results
      .filter(q =>
        q.is_active &&
        (subjectIds.length === 0 || subjectIds.includes(q.subject_id))
      )
      .slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Check if we have any cached questions for a subject + exam combo.
 */
export async function hasCachedQuestions(examType, subjectId) {
  try {
    const db      = await openDB()
    const metaKey = `${examType}__${subjectId}`
    const meta    = await getSyncMeta(db, metaKey)
    return (meta?.question_count ?? 0) > 0
  } catch {
    return false
  }
}

// ── Main sync function ───────────────────────────────────────────────────────

/**
 * Called once after login. Downloads questions for the student's subjects
 * into IndexedDB. Non-blocking — runs in the background.
 *
 * @param {string} userId
 * @param {{ exam_type: string, subjects: string[] }} profile
 * @param {function} onProgress  optional (pct: number, message: string) => void
 */
export async function triggerSync(userId, profile, onProgress) {
  if (typeof window === 'undefined') return   // server-side guard
  if (!profile?.exam_type || !profile?.subjects?.length) return

  const examType = profile.exam_type
  const subjects = profile.subjects

  try {
    const db = await openDB()
    onProgress?.(0, `Preparing offline access…`)

    // Fetch subject ids from API
    const subjectsRes = await fetch(
      `/api/offline/subjects?names=${subjects.join(',')}`
    )
    if (!subjectsRes.ok) return
    const { subjects: subjectRows } = await subjectsRes.json()
    if (!subjectRows?.length) return

    let totalSaved = 0
    const total    = subjectRows.length

    for (let i = 0; i < subjectRows.length; i++) {
      const subject  = subjectRows[i]
      const metaKey  = `${examType}__${subject.id}`
      const existing = await getSyncMeta(db, metaKey)
      const since    = existing?.last_synced_at ?? null

      onProgress?.(
        Math.round((i / total) * 80),
        `Syncing ${subject.name}…`
      )

      // Fetch questions for this subject
      const params = new URLSearchParams({
        subject_id: subject.id,
        exam_type:  examType,
        limit:      '300',
      })
      if (since) params.set('since', since)

      const res = await fetch(`/api/offline/questions?${params}`)
      if (!res.ok) continue

      const { questions, count } = await res.json()
      await storeQuestions(db, questions ?? [])

      await setSyncMeta(db, {
        key:            metaKey,
        subject_id:     subject.id,
        exam_type:      examType,
        last_synced_at: new Date().toISOString(),
        question_count: (existing?.question_count ?? 0) + (count ?? 0),
      })

      totalSaved += (count ?? 0)
    }

    onProgress?.(100, `${totalSaved} questions ready offline`)
    setTimeout(() => onProgress?.(null, null), 2000)

  } catch (err) {
    console.warn('[offline-sync] sync failed:', err.message)
    onProgress?.(null, null)
  }
}

/**
 * Returns a summary of what's cached — shown in the student's profile/settings.
 */
export async function getCacheStatus() {
  try {
    const db    = await openDB()
    const metas = await promisify(txStore(db, 'sync_meta').getAll())
    return (metas ?? []).map(m => ({
      subject_id:     m.subject_id,
      exam_type:      m.exam_type,
      question_count: m.question_count,
      last_synced_at: m.last_synced_at,
    }))
  } catch {
    return []
  }
}

/**
 * Clear all cached questions (e.g. when student changes subjects).
 */
export async function clearCache() {
  try {
    const db = await openDB()
    const tx = db.transaction(['questions', 'sync_meta'], 'readwrite')
    tx.objectStore('questions').clear()
    tx.objectStore('sync_meta').clear()
    await new Promise((res, rej) => {
      tx.oncomplete = res
      tx.onerror    = () => rej(tx.error)
    })
  } catch (err) {
    console.warn('[offline-sync] clearCache failed:', err)
  }
}