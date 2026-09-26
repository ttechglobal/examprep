'use client'
// src/components/battle/RecentForm.jsx
// Football-style form guide for battles: last 10 results as W / D / L chips,
// oldest → newest left to right, latest ringed, plus a line reacting to the
// run and optional totals. Used for vs Computer and vs friends.
//
//   <RecentForm form="WWLDW" played={14} totals={[{ l:'Won', v:8, c:'#4ADE80' }]} title="vs friends"/>
import { FORM_LENGTH } from '@/lib/battleAI'

const GOLD = '#FFB800'

const FORM_STYLE = {
  W: { bg: '#16A34A', press: '#15803D', label: 'Win'  },
  D: { bg: '#64748B', press: '#475569', label: 'Draw' },
  L: { bg: '#DC2626', press: '#B91C1C', label: 'Loss' },
}

function formHeadline(form) {
  if (!form) return null
  const lead = form[0]
  let run = 0
  while (run < form.length && form[run] === lead) run++
  if (lead === 'W' && run >= 2) return { icon: '🔥', text: `${run}-win streak — keep it going!` }
  if (lead === 'W')             return { icon: '⚡', text: 'Won your last battle. Make it two!' }
  if (lead === 'L' && run >= 2) return { icon: '💪', text: 'Tough run. Your comeback starts now.' }
  if (lead === 'L')             return { icon: '🎯', text: 'Lost the last one. Time for revenge.' }
  return { icon: '🤝', text: 'Drew your last battle. Break the tie!' }
}

export default function RecentForm({ form: rawForm, played = 0, totals = [], title = 'Your recent form' }) {
  const form    = (rawForm ?? '').slice(0, FORM_LENGTH)   // newest first
  const shown   = [...form].reverse()                               // oldest → newest
  const empty   = Math.max(0, Math.min(FORM_LENGTH, 5) - shown.length)
  const counts  = { W: 0, D: 0, L: 0 }
  for (const c of form) counts[c] = (counts[c] ?? 0) + 1
  const head    = formHeadline(form)

  return (
    <div style={{
      background: 'rgba(12,20,90,.75)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      border: '1px solid rgba(255,255,255,.13)', borderRadius: 24, padding: '18px 20px 20px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-.01em' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
            {form ? `Last ${form.length} battle${form.length === 1 ? '' : 's'}` : played ? 'Your form starts with your next battle' : 'Play a battle to start your form'}
          </div>
        </div>
        {form && (
          <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.7)', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#4ADE80' }}>{counts.W}W</span>
            <span style={{ margin: '0 6px', color: 'rgba(255,255,255,.3)' }}>·</span>
            <span style={{ color: '#CBD5E1' }}>{counts.D}D</span>
            <span style={{ margin: '0 6px', color: 'rgba(255,255,255,.3)' }}>·</span>
            <span style={{ color: '#F87171' }}>{counts.L}L</span>
          </div>
        )}
      </div>

      {/* Chips */}
      <div role="list" aria-label="Recent battle results, oldest to newest"
        style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        {shown.map((c, i) => {
          const st = FORM_STYLE[c] ?? FORM_STYLE.D
          const latest = i === shown.length - 1
          return (
            <div key={i} role="listitem" aria-label={`${st.label}${latest ? ' (latest)' : ''}`}
              style={{ flex: '1 1 0', maxWidth: 36, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: '100%', aspectRatio: '1', borderRadius: 9, background: st.bg,
                boxShadow: latest ? `0 0 0 3px ${GOLD}, 0 3px 0 ${st.press}` : `0 3px 0 ${st.press}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(11px, 3.4vw, 14px)', fontWeight: 900, color: '#fff',
              }}>{c}</div>
              {latest && <div style={{ fontSize: 8, fontWeight: 900, color: GOLD, textTransform: 'uppercase', letterSpacing: '.08em' }}>Latest</div>}
            </div>
          )
        })}
        {Array.from({ length: empty }).map((_, i) => (
          <div key={`e${i}`} aria-hidden="true" style={{
            flex: '1 1 0', maxWidth: 36, minWidth: 0, aspectRatio: '1', borderRadius: 9,
            border: '2px dashed rgba(255,255,255,.18)', boxSizing: 'border-box',
          }}/>
        ))}
      </div>

      {head && (
        <div style={{ marginTop: 14, fontSize: 13, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{head.icon}</span>{head.text}
        </div>
      )}

      {/* Totals */}
      {played > 0 && totals.length > 0 && (
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: `repeat(${totals.length},1fr)`, gap: 10 }}>
          {totals.map(({ l, v, c }) => (
            <div key={l} style={{ textAlign: 'center', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '10px 6px' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.09em', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

