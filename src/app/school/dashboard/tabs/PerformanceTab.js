'use client'
// src/app/school/dashboard/tabs/PerformanceTab.js

import { useState, useEffect } from 'react'
import { pct, sIcon, sBg, perfCol, perfBg, perfLabel } from './shared'

export default function PerformanceTab({ subjectTopics = [] }) {
  const [activeSubj, setActiveSubj] = useState(null)
  const [topicSort,  setTopicSort]  = useState('worst')
  const [showAll,    setShowAll]    = useState(false)

  useEffect(() => {
    if (subjectTopics.length && !activeSubj) setActiveSubj(subjectTopics[0].subjectName)
  }, [subjectTopics])

  const subject = subjectTopics.find(s => s.subjectName === activeSubj)
  let topics = [...(subject?.topics || [])]
  if (topicSort === 'best') topics.sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))
  else if (topicSort === 'name') topics.sort((a, b) => (a.topicName || '').localeCompare(b.topicName || ''))
  else topics.sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))

  const strong = (subject?.topics || []).filter(t => t.accuracy != null && t.accuracy >= 70).sort((a, b) => b.accuracy - a.accuracy)
  const weak   = (subject?.topics || []).filter(t => t.accuracy != null && t.accuracy < 50 ).sort((a, b) => a.accuracy - b.accuracy)

  const displayedTopics = showAll ? topics : topics.slice(0, 12)

  if (!subjectTopics.length) return (
    <div className="sd-content">
      <div className="sd-page-title">Performance</div>
      <div className="panel" style={{ padding:'48px 24px', textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
        <div style={{ fontSize:14, fontWeight:700, color:'#071B49', marginBottom:6 }}>No performance data yet</div>
        <div style={{ fontSize:12, color:'#7a8aaa' }}>Data appears once students start practising.</div>
      </div>
    </div>
  )

  return (
    <div className="sd-content">
      <div className="sd-page-header">
        <div>
          <div className="sd-page-title">Performance</div>
          <div className="sd-page-sub">Subject and topic breakdown · last 30 days</div>
        </div>
      </div>

      {/* ── Subject summary cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
        {subjectTopics.map(s => (
          <button
            key={s.subjectName}
            onClick={() => setActiveSubj(s.subjectName)}
            style={{
              padding:'14px 16px', borderRadius:14, border:`2px solid ${activeSubj === s.subjectName ? '#1264E5' : '#e4eaf5'}`,
              background: activeSubj === s.subjectName ? '#EBF1FE' : '#fff',
              cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .13s',
            }}
          >
            <div style={{ fontSize:22, marginBottom:8 }}>{sIcon(s.subjectName)}</div>
            <div style={{ fontSize:11, fontWeight:700, color:'#071B49', marginBottom:4, lineHeight:1.3 }}>
              {s.subjectName.replace('English Language','English').replace('Further Mathematics','Further Maths')}
            </div>
            <div style={{ fontSize:18, fontWeight:800, color: s.accuracy != null ? perfCol(s.accuracy) : '#b0bada' }}>
              {pct(s.accuracy)}
            </div>
            <div style={{ height:3, background:'#f0f2f8', borderRadius:99, marginTop:6, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${s.accuracy ?? 0}%`, background: perfCol(s.accuracy), borderRadius:99 }}/>
            </div>
          </button>
        ))}
      </div>

      {/* ── Strong / Weak panels ── */}
      {subject && (
        <div className="two-col">
          {/* Strong topics */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">
                💪 Strong topics
                <span style={{ fontSize:11, color:'#059669', fontWeight:700 }}>&nbsp;{strong.length} ≥ 70%</span>
              </div>
            </div>
            <div style={{ padding:'8px 0' }}>
              {!strong.length ? (
                <div style={{ padding:'24px 18px', textAlign:'center', color:'#b0bada', fontSize:12 }}>No topics at 70%+ yet</div>
              ) : strong.map((t, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 18px', borderBottom: i < strong.length - 1 ? '1px solid #f9faff' : 'none' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:'#071B49', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.topicName}</div>
                    <div style={{ height:4, background:'#f0f2f8', borderRadius:99, marginTop:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${t.accuracy}%`, background:'#059669', borderRadius:99 }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'#059669', flexShrink:0 }}>{t.accuracy}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weak topics */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">
                ⚠ Weak topics
                <span style={{ fontSize:11, color:'#dc2626', fontWeight:700 }}>&nbsp;{weak.length} &lt; 50%</span>
              </div>
            </div>
            <div style={{ padding:'8px 0' }}>
              {!weak.length ? (
                <div style={{ padding:'24px 18px', textAlign:'center', color:'#b0bada', fontSize:12 }}>No topics below 50%. Great!</div>
              ) : weak.map((t, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 18px', borderBottom: i < weak.length - 1 ? '1px solid #f9faff' : 'none' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:'#071B49', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.topicName}</div>
                    <div style={{ height:4, background:'#f0f2f8', borderRadius:99, marginTop:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${t.accuracy}%`, background:'#dc2626', borderRadius:99 }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'#dc2626', flexShrink:0 }}>{t.accuracy}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Full topic list ── */}
      {subject && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">All topics — {activeSubj}</div>
            <select
              value={topicSort}
              onChange={e => setTopicSort(e.target.value)}
              style={{ padding:'5px 8px', borderRadius:7, border:'1px solid #e4eaf5', fontSize:11, color:'#3a4870', outline:'none', fontFamily:'inherit' }}
            >
              <option value="worst">Weakest first</option>
              <option value="best">Strongest first</option>
              <option value="name">A → Z</option>
            </select>
          </div>
          <div className="th-row" style={{ gridTemplateColumns:'1fr 90px 80px 80px' }}>
            <div className="th" style={{ textAlign:'left' }}>Topic</div>
            <div className="th">Accuracy</div>
            <div className="th">Questions</div>
            <div className="th">Status</div>
          </div>
          {!topics.length ? (
            <div style={{ padding:'32px', textAlign:'center', color:'#b0bada', fontSize:12 }}>No topic data yet</div>
          ) : (
            <>
              {displayedTopics.map((t, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 90px 80px 80px', gap:8, padding:'10px 18px', borderBottom: i < displayedTopics.length - 1 ? '1px solid #f9faff' : 'none', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:12, color:'#071B49', fontWeight:600 }}>{t.topicName}</div>
                    <div style={{ height:3, background:'#f0f2f8', borderRadius:99, marginTop:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${t.accuracy ?? 0}%`, background: perfCol(t.accuracy), borderRadius:99 }}/>
                    </div>
                  </div>
                  <div style={{ textAlign:'center', fontSize:12, fontWeight:700, color: perfCol(t.accuracy) }}>{pct(t.accuracy)}</div>
                  <div style={{ textAlign:'center', fontSize:12, color:'#3a4870' }}>{t.total ?? 0}</div>
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <span className="badge" style={{ background: perfBg(t.accuracy), color: perfCol(t.accuracy) }}>{perfLabel(t.accuracy)}</span>
                  </div>
                </div>
              ))}
              {topics.length > 12 && (
                <button
                  onClick={() => setShowAll(o => !o)}
                  style={{ display:'block', width:'100%', padding:'11px', background:'none', border:'none', borderTop:'1px solid #f4f7ff', fontSize:11, fontWeight:700, color:'#1264E5', cursor:'pointer', fontFamily:'inherit' }}
                >
                  {showAll ? '↑ Show less' : `+ Show all ${topics.length} topics`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}