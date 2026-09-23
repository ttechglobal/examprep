// src/lib/heldQuestionsStore.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin import pages "hold back" questions that need a diagram we don't have
// yet. Those used to be appended to localStorage as full question objects and
// were never pruned, so after enough imports they filled the ~5 MB localStorage
// quota for the whole site. Every later write then failed: theme toggle, guest
// profile, practice sync queue, and the held groups themselves, silently.
//
// They now live in IndexedDB (quota in the hundreds of MB), one record per
// group, keyed by group key. On first use each store moves any legacy
// localStorage data across and deletes the old key, freeing that space.
//
// Usage:
//   const store = heldQuestionsStore('sdash')          // or 'myquest'
//   const groups = await store.list()
//   await store.putGroup({ key, subject, exam, year, questions, savedAt })
//   await store.deleteGroup(key)                         → groups
//   await store.deleteQuestion(groupKey, index)          → groups
//   await store.updateQuestion(groupKey, index, patch)   → groups
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME    = 'ep_admin'
const DB_VERSION = 1
const STORES = {
  sdash:   { name: 'held_sdash',   legacyKey: 'ep_diagram_held' },
  myquest: { name: 'held_myquest', legacyKey: 'ep_mq_diagram_held' },
}

let dbPromise = null
function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const { name } of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => { dbPromise = null; reject(req.error) }
  })
  return dbPromise
}

function run(storeName, mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const result = fn(tx.objectStore(storeName))
    tx.oncomplete = () => resolve(result?.result ?? result)
    tx.onerror    = () => reject(tx.error)
    tx.onabort    = () => reject(tx.error)
  }))
}

const byNewest = (a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? ''))

export function heldQuestionsStore(namespace) {
  const cfg = STORES[namespace]
  if (!cfg) throw new Error(`Unknown held-questions store: ${namespace}`)
  let migrated = false

  async function migrateLegacy() {
    if (migrated) return
    migrated = true
    let legacy = null
    try { legacy = JSON.parse(localStorage.getItem(cfg.legacyKey) || 'null') } catch {}
    if (Array.isArray(legacy) && legacy.length) {
      await run(cfg.name, 'readwrite', os => {
        for (const g of legacy) if (g?.key) os.put(g)
      })
    }
    try { localStorage.removeItem(cfg.legacyKey) } catch {}
  }

  async function list() {
    await migrateLegacy()
    const all = await run(cfg.name, 'readonly', os => os.getAll())
    return (all ?? []).sort(byNewest)
  }

  async function putGroup(group) {
    await migrateLegacy()
    await run(cfg.name, 'readwrite', os => os.put(group))
    return list()
  }

  async function deleteGroup(key) {
    await run(cfg.name, 'readwrite', os => os.delete(key))
    return list()
  }

  async function editGroup(key, change) {
    const group = await run(cfg.name, 'readonly', os => os.get(key))
    if (!group) return list()
    const questions = change([...(group.questions ?? [])])
    await run(cfg.name, 'readwrite', os => (
      questions.length ? os.put({ ...group, questions }) : os.delete(key)
    ))
    return list()
  }

  return {
    list,
    putGroup,
    deleteGroup,
    deleteQuestion: (key, index) => editGroup(key, qs => { qs.splice(index, 1); return qs }),
    updateQuestion: (key, index, patch) => editGroup(key, qs => { qs[index] = { ...qs[index], ...patch }; return qs }),
  }
}
