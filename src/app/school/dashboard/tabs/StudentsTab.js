'use client'
// src/app/school/dashboard/tabs/StudentsTab.js

import { useState }                                                      from 'react'
import { pct, initials, lastLabel, statusOf, needsAttention, perfCol, avColor, TIER_META } from './shared'

const PER_PAGE = 10

export default function StudentsTab({ students = [], cohortName = '', atRiskSegmented = [] }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort,   setSort]   = useState('name')
  const [page,   setPage]   = useState(1)

  // Build a quick lookup of tier by student id
  const tierById = {}
  atRiskSegmented.forEach(s => { tierById[s.id] = s.tier })

  // Filter counts — all using daysSinceLastPractice (now fixed in API)
  const counts = {
    all:       students.length,
    active:    students.filter(s => (s.daysSinceLastPractice ?? 999) <= 7).length,
    slipping:  students.filter(s => { const d = s.daysSinceLastPractice ?? 999; return d >= 8 && d < 21 }).length,
    inactive:  students.filter(s => (s.daysSinceLastPractice ?? 999) >= 21).length,
    attention: students.filter(needsAttention).length,
  }

  let list = [...students]
  if (filter === 'active')    list = list.filter(s => (s.daysSinceLastPractice ?? 999) <= 7)
  if (filter === 'slipping')  list = list.filter(s => { const d = s.daysSinceLastPractice ?? 999; return d >= 8 && d < 21 })
  if (filter === 'inactive')  list = list.filter(s => (s.daysSinceLastPractice ?? 999) >= 21)
  if (filter === 'attention') list = list.filter(needsAttention)
  if (search) list = list.filter(s => (s.full_name || '').toLowerCase().includes(search.toLowerCase()))

  if (sort === 'accuracy')  list.sort((a, b) => (b.accuracy  ?? -1) - (a.accuracy  ?? -1))
  else if (sort === 'questions') list.sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
  else if (sort === 'recent')    list.sort((a, b) => (a.daysSinceLastPractice ?? 999) - (b.daysSinceLastPractice ?? 999))
  else list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const FILTERS = [
    { id: 'all',       l: `All (${counts.all})`              },
    { id: 'active',    l: `Active (${counts.active})`        },
    { id: 'slipping',  l: `Slipping (${counts.slipping})`    },
    { id: 'inactive',  l: `Inactive (${counts.inactive})`    },
    { id: 'attention', l: `⚠ Attention (${counts.attention})` },
  ]

  function changePage(p) { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="sd-content">
      <div className="sd-page-header">
        <div>
          <div className="sd-page-title">Students</div>
          <div className="sd-page-sub">
            {students.length} students{cohortName ? ` · ${cohortName}` : ''} · questions shown are last 30 days
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <div className="sd-search-bar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="#b0bada" strokeWidth="1.3"/>
              <path d="M10 10l2.5 2.5" stroke="#b0bada" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search students…"
            />
          </div>
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1) }}
            style={{ padding:'7px 10px', borderRadius:9, border:'1px solid #e4eaf5', background:'#fff', fontSize:12, color:'#3a4870', outline:'none', fontFamily:'inherit', cursor:'pointer' }}
          >
            <option value="name">Sort: Name</option>
            <option value="recent">Sort: Most recent</option>
            <option value="accuracy">Sort: Accuracy</option>
            <option value="questions">Sort: Questions</option>
          </select>
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
        {FILTERS.map(f => (
          <button key={f.id} className={`pill${filter === f.id ? ' active' : ''}`} onClick={() => { setFilter(f.id); setPage(1) }}>
            {f.l}
          </button>
        ))}
      </div>

      {/* ── Attention tier breakdown (shown when attention filter is active) ── */}
      {filter === 'attention' && atRiskSegmented.length > 0 && (
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {['dropped', 'inactive', 'struggling'].map(tier => {
            const meta  = TIER_META[tier]
            const count = atRiskSegmented.filter(s => s.tier === tier).length
            if (!count) return null
            return (
              <div key={tier} style={{ flex:'1 1 160px', padding:'12px 14px', borderRadius:12, background: meta.bg, border:`1px solid ${meta.border}` }}>
                <div style={{ fontSize:13, fontWeight:800, color: meta.color }}>{count} {meta.label}</div>
                <div style={{ fontSize:11, color: meta.color, opacity:.8, marginTop:2 }}>{meta.desc}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Student table ── */}
      <div className="panel">
        <div className="th-row" style={{ gridTemplateColumns:'1fr 80px 80px 90px 70px' }}>
          <div className="th" style={{ textAlign:'left' }}>Student</div>
          <div className="th">Accuracy</div>
          <div className="th">Questions</div>
          <div className="th">Last active</div>
          <div className="th">Status</div>
        </div>

        {!shown.length ? (
          <div style={{ padding:'48px', textAlign:'center', color:'#b0bada', fontSize:12 }}>
            {search ? `No students matching "${search}"` : 'No students in this filter'}
          </div>
        ) : shown.map((s, i) => {
          const st   = statusOf(s)
          const tier = tierById[s.id]
          const tierMeta = tier ? TIER_META[tier] : null
          return (
            <div key={s.id} className="st-row" style={{ gridTemplateColumns:'1fr 80px 80px 90px 70px', borderBottom: i < shown.length - 1 ? '1px solid #f9faff' : 'none' }}>
              {/* Name + avatar */}
              <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                <div className="st-av" style={{ background: avColor(s.full_name) }}>{initials(s.full_name)}</div>
                <div style={{ minWidth:0 }}>
                  <div className="st-name">{s.full_name}</div>
                  <div className="st-sub">
                    {s.exam_type ?? ''}
                    {tierMeta && (
                      <span style={{ marginLeft:6, fontSize:9, fontWeight:700, color: tierMeta.color }}>● {tierMeta.label}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Accuracy */}
              <div className="st-center" style={{ color: s.accuracy != null ? perfCol(s.accuracy) : '#b0bada', fontWeight:700 }}>
                {pct(s.accuracy)}
              </div>

              {/* Questions (30d) */}
              <div className="st-center" style={{ color:'#3a4870' }}>
                {(s.total || 0).toLocaleString()}
              </div>

              {/* Last active */}
              <div className="st-center" style={{ fontSize:11, color:'#8896b3' }}>
                {lastLabel(s.daysSinceLastPractice)}
              </div>

              {/* Status badge */}
              <div style={{ display:'flex', justifyContent:'center' }}>
                <span className="badge" style={{ background:st.bg, color:st.c, border:`1px solid ${st.border}` }}>{st.l}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:11, color:'#7a8aaa' }}>
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, list.length)} of {list.length}
          </span>
          <div style={{ display:'flex', gap:5 }}>
            <button
              onClick={() => changePage(Math.max(1, page - 1))}
              disabled={page === 1}
              style={{ width:28, height:28, borderRadius:7, border:'1px solid #e4eaf5', background:'#fff', color:'#7a8aaa', fontSize:11, fontWeight:700, cursor:'pointer', opacity: page === 1 ? .4 : 1 }}
            >‹</button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i-1] > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) => p === '…'
                ? <span key={`dots-${i}`} style={{ width:28, textAlign:'center', fontSize:11, color:'#b0bada', lineHeight:'28px' }}>…</span>
                : <button key={p} onClick={() => changePage(p)} style={{ width:28, height:28, borderRadius:7, border:`1px solid ${p===page?'#1264E5':'#e4eaf5'}`, background:p===page?'#1264E5':'#fff', color:p===page?'#fff':'#7a8aaa', fontSize:11, fontWeight:700, cursor:'pointer' }}>{p}</button>
              )
            }
            <button
              onClick={() => changePage(Math.min(pages, page + 1))}
              disabled={page === pages}
              style={{ width:28, height:28, borderRadius:7, border:'1px solid #e4eaf5', background:'#fff', color:'#7a8aaa', fontSize:11, fontWeight:700, cursor:'pointer', opacity: page === pages ? .4 : 1 }}
            >›</button>
          </div>
        </div>
      )}
    </div>
  )
}