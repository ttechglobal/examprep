// Per warm instance: bounded cache, shared in-flight work and refresh cooldown.
export function analyticsSnapshotLoader({ load, clock = Date.now, ttl = 300_000, refreshFloor = 30_000, maxEntries = 24 }) {
  const entries = new Map()
  return async function snapshot(key, args, refresh = false) {
    const hit = entries.get(key)
    if (hit && (hit.pending || clock() - hit.at < (refresh ? refreshFloor : ttl))) return hit.promise
    const entry = { at: clock(), pending: true }
    entry.promise = Promise.resolve().then(() => load(args)).then(data => {
      entry.pending = false
      entry.at = clock()
      return { ...data, at: entry.at }
    }).catch(error => { if (entries.get(key) === entry) entries.delete(key); throw error })
    entries.set(key, entry)
    for (const [oldKey, old] of entries) {
      if (entries.size <= maxEntries) break
      if (oldKey !== key && !old.pending) entries.delete(oldKey)
    }
    return entry.promise
  }
}

export function analyticsHandler({ requireAdmin, rateLimited, appDay, snapshot }) {
  return async function GET(request) {
    const denied = await requireAdmin()
    if (denied) return denied
    const limited = rateLimited(request, 'admin-analytics', 60, 60_000)
    if (limited) return limited
    const params = new URL(request.url).searchParams
    const days = [1, 7, 30, 90].includes(Number(params.get('days'))) ? Number(params.get('days')) : 30
    const exam = ['WAEC', 'JAMB'].includes(params.get('exam')) ? params.get('exam') : null
    try {
      const data = await snapshot(`${appDay()}:${days}:${exam || 'all'}`, { p_days: days, p_exam: exam }, params.get('refresh') === '1')
      return Response.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
    } catch {
      return Response.json({ error: 'Analytics could not be loaded. Check the shared analytics migration and try again.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
  }
}
