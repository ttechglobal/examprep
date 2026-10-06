// src/lib/server/memo.js
// ─────────────────────────────────────────────────────────────────────────────
// A small in-memory cache for the admin and school dashboards, to keep the
// database from running the same heavy query over and over (the project is on
// Supabase's free plan).
//
//   const data = await memo('admin-analytics:overview:30', 5 * 60_000, () => load())
//   forget('school-dash:')        // drop everything whose key starts with this
//
// Per server instance: a warm instance answers repeat requests without touching
// the database; a cold one just loads. Two requests for the same key at the same
// moment share one load. A failed load is not kept. Use it only for numbers a
// few minutes old are fine for, never for anything that must be exact.
// ─────────────────────────────────────────────────────────────────────────────

const store = new Map()        // key → { at, promise }
const MAX_ENTRIES = 200

/** The cached value for `key` if it is younger than ttlMs, else `load()`'s result. */
export function memo(key, ttlMs, load, { fresh = false } = {}) {
  const hit = store.get(key)
  if (!fresh && hit && Date.now() - hit.at < ttlMs) return hit.promise

  const promise = Promise.resolve().then(load)
  store.set(key, { at: Date.now(), promise })
  promise.catch(() => { if (store.get(key)?.promise === promise) store.delete(key) })

  if (store.size > MAX_ENTRIES) {
    const oldest = [...store.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, store.size - MAX_ENTRIES)
    for (const [k] of oldest) store.delete(k)
  }
  return promise
}

/** Drops every cached key that starts with `prefix`. */
export function forget(prefix) {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key)
}

/** The cache key of a school's dashboard data: cleared when its students or slots change. */
export const schoolDashboardKey = schoolId => `school-dash:${schoolId}`
