// Public card content only. Progress remains separately in localStorage.
export const FLASHCARD_CACHE = 'ep-flashcards-v1'
const memory = new Map()
const pending = new Map()
export async function loadFlashcards(query = '', { refresh = false } = {}) {
  const params = new URLSearchParams(query.replace(/^\?/, ''))
  params.sort()
  const url = `/api/student/flashcards${params.size ? `?${params}` : ''}`
  if (!refresh && memory.has(url)) return memory.get(url)
  if (pending.has(url)) return pending.get(url)
  const task = (async () => {
    let cache
    try {
      if (typeof caches !== 'undefined') cache = await caches.open(FLASHCARD_CACHE)
      if (!refresh && cache) {
        const hit = await cache.match(url)
        if (hit) { const data = await hit.json(); memory.set(url, data); return data }
      }
    } catch { /* Storage unavailable: the in-memory cache still works. */ }
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error('Could not load flashcards. Check your connection and try again.')
    const data = await response.clone().json()
    if (data.cards?.length || data.topics?.length || data.subjects?.length) memory.set(url, data)
    else memory.delete(url)
    // Empty libraries may gain content: do not persist empty responses.
    if (cache && (data.cards?.length || data.topics?.length || data.subjects?.length)) {
      try { await cache.put(url, response); const keys = await cache.keys(); for (const key of keys.slice(0, Math.max(0, keys.length - 80))) await cache.delete(key) } catch {}
    } else if (cache) { try { await cache.delete(url) } catch {} }
    return data
  })()
  pending.set(url, task)
  try { return await task } finally { pending.delete(url) }
}
