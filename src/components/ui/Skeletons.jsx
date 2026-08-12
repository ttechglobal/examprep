// src/components/ui/Skeletons.jsx — EXL ExamPrep v2
// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loaders that match the real page structure exactly.
// Uses the .skeleton CSS class (shimmer animation in globals.css).
// All structural colours via CSS tokens so dark/light mode works automatically.
//
// USAGE: render immediately while data loads, swap to real content on arrival.
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  // Skeleton block
  block: (h = 40, br = 12, mb = 0, w = '100%') => ({
    height: h, borderRadius: br, marginBottom: mb,
    width: w, display: 'block',
  }),
  // Flex row
  row: (gap = 10, mb = 0, align = 'center') => ({
    display: 'flex', alignItems: align, gap, marginBottom: mb,
  }),
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100 }}>
      {/* Greeting */}
      <div style={S.row(0, 4, 'flex-start')}>
        <div>
          <div className="skeleton" style={S.block(10, 6, 6, 80)} />
          <div className="skeleton" style={S.block(22, 8, 0, 200)} />
        </div>
      </div>
      {/* Zara banner */}
      <div className="skeleton" style={S.block(64, 14)} />
      {/* Quest card */}
      <div className="skeleton" style={S.block(160, 20)} />
      {/* Weak topics */}
      <div className="skeleton" style={S.block(10, 6, 4, 120)} />
      {[1, 2].map(i => <div key={i} className="skeleton" style={S.block(62, 13)} />)}
      {/* Subject rows */}
      <div className="skeleton" style={S.block(10, 6, 4, 120)} />
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '0 14px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ ...S.row(11), padding: '11px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={S.block(12, 6, 6, '60%')} />
              <div className="skeleton" style={S.block(5, 99)} />
            </div>
            <div className="skeleton" style={S.block(14, 6, 0, 36)} />
          </div>
        ))}
      </div>
      {/* Target strip */}
      <div className="skeleton" style={S.block(60, 14)} />
    </div>
  )
}

// ── Practice landing ───────────────────────────────────────────────────────────
export function PracticePageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 100 }}>
      <div>
        <div className="skeleton" style={S.block(10, 6, 6, 80)} />
        <div className="skeleton" style={S.block(22, 8, 0, 160)} />
      </div>
      <div className="skeleton" style={S.block(64, 14)} />
      <div className="skeleton" style={S.block(10, 6, 4, 140)} />
      <div className="skeleton" style={S.block(148, 18)} />
      <div className="skeleton" style={S.block(10, 6, 4, 140)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={S.block(110, 14)} />)}
      </div>
      <div className="skeleton" style={S.block(10, 6, 4, 80)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={S.block(52, 13)} />)}
      </div>
    </div>
  )
}

// ── Learn ──────────────────────────────────────────────────────────────────────
export function LearnHubSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 100 }}>
      <div>
        <div className="skeleton" style={S.block(10, 6, 6, 80)} />
        <div className="skeleton" style={S.block(22, 8, 0, 120)} />
      </div>
      <div className="skeleton" style={S.block(64, 14)} />
      {/* EXL Learning World card */}
      <div className="skeleton" style={S.block(164, 18)} />
      <div className="skeleton" style={S.block(10, 6, 4, 120)} />
      {[1, 2].map(i => <div key={i} className="skeleton" style={S.block(70, 13)} />)}
      <div className="skeleton" style={S.block(10, 6, 4, 120)} />
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '0 14px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ ...S.row(11), padding: '11px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={S.block(12, 6, 6, '55%')} />
              <div className="skeleton" style={S.block(5, 99)} />
            </div>
            <div className="skeleton" style={S.block(14, 6, 0, 36)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Leaderboard / Community ────────────────────────────────────────────────────
export function CommunityPageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 100 }}>
      <div style={S.row(0, 0, 'flex-start')}>
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={S.block(10, 6, 6, 80)} />
          <div className="skeleton" style={S.block(22, 8, 0, 140)} />
        </div>
        <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 999 }} />
      </div>
      <div className="skeleton" style={S.block(64, 14)} />
      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[80, 70, 90].map((w, i) => <div key={i} className="skeleton" style={{ width: w, height: 30, borderRadius: 999 }} />)}
      </div>
      {/* Podium */}
      <div className="skeleton" style={S.block(180, 18)} />
      {/* Rows */}
      {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={S.block(48, 12)} />)}
      {/* Challenge */}
      <div className="skeleton" style={S.block(100, 15)} />
    </div>
  )
}

// ── Progress ───────────────────────────────────────────────────────────────────
export function ProgressPageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 100 }}>
      <div style={{ ...S.row(0, 0, 'flex-start'), justifyContent: 'space-between' }}>
        <div>
          <div className="skeleton" style={S.block(10, 6, 6, 80)} />
          <div className="skeleton" style={S.block(22, 8, 0, 120)} />
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <div className="skeleton" style={{ width: 70, height: 30, borderRadius: 999 }} />
          <div className="skeleton" style={{ width: 80, height: 30, borderRadius: 999 }} />
        </div>
      </div>
      <div className="skeleton" style={S.block(64, 14)} />
      {/* 3 stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={S.block(72, 14)} />)}
      </div>
      {/* Activity chart */}
      <div className="skeleton" style={S.block(110, 16)} />
      {/* Subject mastery */}
      <div className="skeleton" style={S.block(10, 6, 4, 140)} />
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '0 14px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ ...S.row(11), padding: '11px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
            <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={S.block(12, 6, 5, '50%')} />
              <div className="skeleton" style={S.block(5, 99)} />
            </div>
            <div className="skeleton" style={S.block(14, 6, 0, 40)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Profile ────────────────────────────────────────────────────────────────────
export function ProfilePageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 100 }}>
      <div className="skeleton" style={S.block(64, 14)} />
      {/* Hero card */}
      <div className="skeleton" style={S.block(200, 20)} />
      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={S.block(80, 13)} />)}
      </div>
      {/* Settings rows */}
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={S.block(50, 13)} />)}
    </div>
  )
}

// ── Generic full-page ──────────────────────────────────────────────────────────
export function PageSkeleton({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 100 }}>
      <div className="skeleton" style={S.block(22, 8, 0, 160)} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={S.block(60 + (i % 2) * 20, 14)} />
      ))}
    </div>
  )
}

// Legacy exports (used in existing pages)
export function SubjectPageSkeleton() { return <PageSkeleton rows={6} /> }
export function VideoPageSkeleton()   { return <PageSkeleton rows={5} /> }
export function CardSkeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} style={{ borderRadius: 14, minHeight: 60 }} />
}
export function ListSkeleton({ rows = 4, rowHeight = 56 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: rowHeight, borderRadius: 14 }} />
      ))}
    </div>
  )
}