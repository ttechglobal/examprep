'use client'
// src/app/student/downloads/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Uses the existing offlineSync.js infrastructure (IndexedDB: 'examprep',
// stores: 'questions' + 'sync_meta'). triggerSync() handles the actual
// download; this page just shows status, drives per-subject downloads,
// and lets students delete individual packs or clear everything.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/contexts/UserContext'
import {
  openDB,
  getCacheStatus,
  clearCache,
} from '@/lib/offlineSync'

// ── Colour / icon map ─────────────────────────────────────────────────────────
const ACCENT = {
  'Chemistry':'#9b7ae0','Physics':'#18B7F2','Biology':'#4ade80',
  'Mathematics':'#FFB800','Further Mathematics':'#FFB800',
  'English Language':'#a78bfa','Use of English':'#a78bfa',
  'Economics':'#fcd34d','Government':'#f87171','Geography':'#34d399',
  'Literature in English':'#f9a8d4','Agricultural Science':'#86efac',
  'Commerce':'#818cf8','Accounting':'#fde68a','default':'#9b7ae0',
}
const ICON = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getAccent = n => ACCENT[n] ?? ACCENT.default
const getIcon   = n => ICON[n]   ?? ICON.default

// ── Delete a single subject's cached questions from IndexedDB ─────────────────
async function deleteSubjectCache(examType, subjectId) {
  const db = await openDB()
  // Delete all questions for this subject
  await new Promise((resolve, reject) => {
    const tx    = db.transaction('questions', 'readwrite')
    const store = tx.objectStore('questions')
    const idx   = store.index('subject_id')
    const req   = idx.openCursor(subjectId)
    req.onsuccess = e => {
      const cursor = e.target.result
      if (cursor) { cursor.delete(); cursor.continue() }
      else resolve()
    }
    req.onerror = e => reject(e.target.error)
    tx.onerror  = e => reject(e.target.error)
  })
  // Delete the sync_meta entry
  await new Promise((resolve, reject) => {
    const tx  = db.transaction('sync_meta', 'readwrite')
    const req = tx.objectStore('sync_meta').delete(`${examType}__${subjectId}`)
    req.onsuccess = () => resolve()
    req.onerror   = e => reject(e.target.error)
  })
}

// ── Download a single subject ─────────────────────────────────────────────────
async function downloadSubject(examType, subject, onProgress) {
  onProgress(1)

  // Fetch and store via the existing offline API
  const tick = setInterval(() => onProgress(p => Math.min((p ?? 1) + 10, 80)), 500)
  try {
    const db = await openDB()

    // Get existing meta for delta sync
    const metaKey = `${examType}__${subject.id}`
    const meta    = await new Promise(res => {
      const req = db.transaction('sync_meta').objectStore('sync_meta').get(metaKey)
      req.onsuccess = () => res(req.result ?? null)
      req.onerror   = () => res(null)
    })
    const since = meta?.last_synced_at ?? null

    const params = new URLSearchParams({
      subject_id: subject.id,
      exam_type:  examType,
      limit:      '300',
    })
    if (since) params.set('since', since)

    const res = await fetch(`/api/offline/questions?${params}`)
    clearInterval(tick)
    if (!res.ok) throw new Error(`Server error ${res.status}`)

    onProgress(85)
    const { questions, count } = await res.json()

    // Store questions
    if (questions?.length) {
      await new Promise((resolve, reject) => {
        const tx    = db.transaction('questions', 'readwrite')
        const store = tx.objectStore('questions')
        questions.forEach(q => store.put(q))
        tx.oncomplete = resolve
        tx.onerror    = () => reject(tx.error)
      })
    }

    // Update sync meta
    const newCount = (meta?.question_count ?? 0) + (count ?? questions?.length ?? 0)
    await new Promise((resolve, reject) => {
      const tx  = db.transaction('sync_meta', 'readwrite')
      const req = tx.objectStore('sync_meta').put({
        key:            metaKey,
        subject_id:     subject.id,
        exam_type:      examType,
        last_synced_at: new Date().toISOString(),
        question_count: newCount,
      })
      req.onsuccess = resolve
      req.onerror   = e => reject(e.target.error)
    })

    onProgress(100)
    return { ok: true, count: newCount }
  } catch (err) {
    clearInterval(tick)
    throw err
  }
}

// ── Subject pack card ─────────────────────────────────────────────────────────
function PackCard({ subject, exam, meta, onDownload, onDelete, downloading, progress }) {
  const accent      = getAccent(subject.name)
  const icon        = getIcon(subject.name)
  const isDownloaded = !!meta
  const qCount      = meta?.question_count ?? 0
  const lastSynced  = meta?.last_synced_at
    ? new Date(meta.last_synced_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : null
  const estKB = Math.round(qCount * 2.5)

  return (
    <div style={{
      borderRadius: 16, background: 'var(--bg-card)',
      border: `1.5px solid ${isDownloaded ? `${accent}40` : 'var(--border)'}`,
      overflow: 'hidden', transition: 'border-color .2s',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
        {/* Icon */}
        <div style={{ width:44, height:44, borderRadius:13, background:`${accent}15`, border:`1.5px solid ${accent}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
          {icon}
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:2 }}>{subject.name}</p>
          {downloading ? (
            <p style={{ fontSize:11, color:'#18B7F2', fontWeight:700 }}>Downloading… {progress}%</p>
          ) : isDownloaded ? (
            <>
              <p style={{ fontSize:11, color:'#4ade80', fontWeight:700 }}>✓ {qCount} questions ready offline</p>
              {lastSynced && <p style={{ fontSize:10, color:'var(--text-tert)', marginTop:1 }}>Updated {lastSynced} · ~{estKB} KB</p>}
            </>
          ) : (
            <p style={{ fontSize:11, color:'var(--text-tert)' }}>Not downloaded · ~{subject.question_count > 0 ? `${subject.question_count} questions` : 'questions available'}</p>
          )}
        </div>

        {/* Action */}
        {downloading ? (
          <div style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <div style={{ width:20, height:20, borderRadius:'50%', border:`2.5px solid ${accent}`, borderTopColor:'transparent', animation:'spin .7s linear infinite' }}/>
          </div>
        ) : isDownloaded ? (
          <button onClick={() => onDelete(subject)} style={{ width:36, height:36, borderRadius:11, background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.25)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, fontSize:15 }}>
            🗑️
          </button>
        ) : (
          <button onClick={() => onDownload(subject)} style={{ height:36, padding:'0 14px', borderRadius:11, background:accent, border:'none', color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer', flexShrink:0, fontFamily:'inherit', boxShadow:`0 3px 0 ${accent}90` }}>
            📥 Get
          </button>
        )}
      </div>

      {/* Progress bar */}
      {downloading && (
        <div style={{ height:3, background:'var(--bg-inset)', margin:'0 16px 12px', borderRadius:999, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progress}%`, background:accent, borderRadius:999, transition:'width .3s' }}/>
        </div>
      )}

      {/* Downloaded footer */}
      {isDownloaded && !downloading && (
        <div style={{ borderTop:'1px solid var(--border)', padding:'8px 16px', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10, color:'#4ade80' }}>●</span>
          <p style={{ fontSize:10, color:'var(--text-tert)', flex:1 }}>Available offline · tap 🗑️ to free up space</p>
          <button onClick={() => onDownload(subject)} style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>
            Refresh ↻
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DownloadsPage() {
  const { userId } = useUser()

  const [exam,        setExam]       = useState('WAEC')
  const [subjects,    setSubjects]   = useState([])
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [cacheMeta,   setCacheMeta]  = useState([])   // from getCacheStatus()
  const [downloading, setDownloading] = useState({})  // subjectId → progress
  const [toast,       setToast]      = useState(null)
  const [isOnline,    setIsOnline]   = useState(true)
  const [clearing,    setClearing]   = useState(false)

  // Online status
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const on = () => setIsOnline(true), off = () => setIsOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Load cache status from IndexedDB
  const refreshMeta = useCallback(async () => {
    try { setCacheMeta(await getCacheStatus()) } catch { setCacheMeta([]) }
  }, [])

  useEffect(() => { refreshMeta() }, [refreshMeta])

  // Load subjects for selected exam tab
  useEffect(() => {
    setLoadingSubs(true)
    fetch(`/api/student/subjects?exam=${exam}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setSubjects(d ?? []); setLoadingSubs(false) })
      .catch(() => setLoadingSubs(false))
  }, [exam])

  function showToast(msg, color = '#4ade80') {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Download one subject ──────────────────────────────────────────────────
  async function handleDownload(subject) {
    if (!isOnline) { showToast('Connect to the internet to download', '#f87171'); return }
    if (downloading[subject.id]) return

    setDownloading(d => ({ ...d, [subject.id]: 1 }))
    try {
      const { count } = await downloadSubject(exam, subject, pct => {
        setDownloading(d => ({ ...d, [subject.id]: typeof pct === 'function' ? pct(d[subject.id]) : pct }))
      })
      await refreshMeta()
      showToast(`${subject.name} ready — ${count} questions offline`)
    } catch (e) {
      showToast(`Failed: ${e.message}`, '#f87171')
    } finally {
      setDownloading(d => { const n = { ...d }; delete n[subject.id]; return n })
    }
  }

  // ── Download all subjects at once ─────────────────────────────────────────
  async function handleDownloadAll() {
    if (!isOnline) { showToast('Connect to the internet to download', '#f87171'); return }
    const toDownload = subjects.filter(s => !metaFor(s.id))
    for (const sub of toDownload) await handleDownload(sub)
  }

  // ── Delete one subject ─────────────────────────────────────────────────────
  async function handleDelete(subject) {
    try {
      await deleteSubjectCache(exam, subject.id)
      await refreshMeta()
      showToast(`${subject.name} removed`, '#FFB800')
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, '#f87171')
    }
  }

  // ── Clear all ──────────────────────────────────────────────────────────────
  async function handleClearAll() {
    if (!confirm('Delete all downloaded questions? You can re-download anytime.')) return
    setClearing(true)
    try {
      await clearCache()
      await refreshMeta()
      showToast('All downloads cleared', '#FFB800')
    } catch (e) {
      showToast(`Failed: ${e.message}`, '#f87171')
    } finally {
      setClearing(false)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function metaFor(subjectId) {
    return cacheMeta.find(m => m.subject_id === subjectId && m.exam_type === exam) ?? null
  }

  const totalQ       = cacheMeta.reduce((s, m) => s + (m.question_count ?? 0), 0)
  const totalPacks   = cacheMeta.length
  const estMB        = (totalQ * 2.5 / 1024).toFixed(1)
  const notDownloaded = subjects.filter(s => !metaFor(s.id) && !downloading[s.id])

  return (
    <div style={{ paddingBottom: 96, maxWidth: 600, margin: '0 auto' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes toast-in { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:88, left:'50%', transform:'translateX(-50%)', zIndex:400, padding:'10px 20px', borderRadius:14, background:'#12172a', border:`1px solid ${toast.color}30`, color:toast.color, fontSize:13, fontWeight:700, boxShadow:'0 8px 32px rgba(0,0,0,.4)', whiteSpace:'nowrap', animation:'toast-in .25s ease', maxWidth:'90vw', textAlign:'center' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--text-tert)', marginBottom:3 }}>Offline access</p>
        <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-0.025em' }}>Downloads</h1>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.25)', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:14 }}>📡</span>
          <p style={{ fontSize:12, fontWeight:600, color:'#f87171' }}>You're offline. Downloaded packs are still available for practice.</p>
        </div>
      )}

      {/* Explainer */}
      <div style={{ padding:'14px 16px', borderRadius:16, background:'linear-gradient(135deg,rgba(18,100,229,.08),rgba(24,183,242,.05))', border:'1px solid rgba(18,100,229,.18)', marginBottom:16 }}>
        <p style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)', marginBottom:4 }}>📥 Practise anywhere, even offline</p>
        <p style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.6 }}>Download past questions for your subjects. Once saved, you can practise on the bus, at school, anywhere — no internet needed. Your results sync automatically when you reconnect.</p>
      </div>

      {/* Storage summary */}
      {totalPacks > 0 && (
        <div style={{ padding:'12px 16px', borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border)', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>💾</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--text-prim)' }}>
              {totalPacks} pack{totalPacks !== 1 ? 's' : ''} · {totalQ} questions · ~{estMB} MB
            </p>
            <p style={{ fontSize:10, color:'var(--text-tert)' }}>Stored on your device</p>
          </div>
          <button onClick={handleClearAll} disabled={clearing} style={{ fontSize:11, fontWeight:700, color:'#f87171', background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.25)', borderRadius:9, padding:'5px 11px', cursor:'pointer', fontFamily:'inherit', opacity:clearing?0.5:1 }}>
            {clearing ? 'Clearing…' : 'Clear all'}
          </button>
        </div>
      )}

      {/* WAEC / JAMB tabs */}
      <div style={{ display:'flex', background:'var(--bg-subtle)', borderRadius:13, padding:4, marginBottom:16, border:'1px solid var(--border)' }}>
        {['WAEC','JAMB'].map(e => (
          <button key={e} onClick={() => setExam(e)}
            style={{ flex:1, padding:'9px 0', borderRadius:10, fontSize:13, fontWeight:800, border:'none', cursor:'pointer', fontFamily:'inherit', background:exam===e?'#1264E5':'transparent', color:exam===e?'#fff':'var(--text-tert)', boxShadow:exam===e?'0 2px 8px rgba(18,100,229,.4)':'none', transition:'all .15s' }}>
            {e}
          </button>
        ))}
      </div>

      {/* Download all button */}
      {!loadingSubs && isOnline && notDownloaded.length > 0 && (
        <button
          onClick={handleDownloadAll}
          disabled={Object.keys(downloading).length > 0}
          style={{ width:'100%', padding:'12px 0', borderRadius:14, background:'var(--bg-card)', border:'2px dashed var(--border)', color:'var(--text-sec)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:10, opacity:Object.keys(downloading).length>0?0.5:1 }}>
          📥 Download all {exam} subjects ({notDownloaded.length} remaining)
        </button>
      )}

      {/* Subject list */}
      {loadingSubs ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height:76, borderRadius:16, background:'var(--bg-subtle)', border:'1px solid var(--border)' }}/>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)' }}>
          <p style={{ fontSize:28, marginBottom:12 }}>📚</p>
          <p style={{ fontSize:14, fontWeight:700, color:'var(--text-prim)', marginBottom:6 }}>No {exam} subjects yet</p>
          <p style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5 }}>Add your {exam} subjects from your profile to see downloads here.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {subjects.map(subject => (
            <PackCard
              key={subject.id}
              subject={subject}
              exam={exam}
              meta={metaFor(subject.id)}
              onDownload={handleDownload}
              onDelete={handleDelete}
              downloading={subject.id in downloading}
              progress={downloading[subject.id] ?? 0}
            />
          ))}
        </div>
      )}

      {/* Info footer */}
      <div style={{ marginTop:24, padding:'14px 16px', borderRadius:14, background:'var(--bg-subtle)', border:'1px solid var(--border)' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-sec)', marginBottom:6 }}>ℹ️ How it works</p>
        <ul style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.8, paddingLeft:16, margin:0 }}>
          <li>Each pack = up to 300 past questions for that subject</li>
          <li>~1–3 MB per subject — safe to download on mobile data</li>
          <li>Practice works offline once downloaded — results sync when you reconnect</li>
          <li>Tap Refresh ↻ on any pack to get the latest questions</li>
        </ul>
      </div>
    </div>
  )
}