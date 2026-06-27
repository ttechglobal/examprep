// src/components/ui/SubjectIcon.jsx
//
// Canonical subject icon set — extracted from two byte-identical duplicates
// that had drifted into LearnPage.jsx (as `SubjectIcon`) and dashboard/page.js
// (as `SubjectSVGIcon`). Both should import from here instead of keeping a
// local copy, so the icon set has one source of truth going forward — same
// principle as the @/lib/subjectTheme.js and @/lib/useIsDark.js consolidation.
//
// Usage: <SubjectIcon name={subject.name} color={resolvedColor.text} size={20} />

export default function SubjectIcon({ name, color, size = 20 }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const icons = {
    'Mathematics':         <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M18 4H6l6 8-6 8h12"/></svg>,
    'Further Mathematics': <svg width={size} height={size} viewBox="0 0 24 24" {...s}><line x1="6" y1="4" x2="18" y2="4"/><line x1="9" y1="4" x2="9" y2="20"/><path d="M15 4v10a2 2 0 002 2"/></svg>,
    'Physics':             <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="2" fill={color} stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="3.5"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(120 12 12)"/></svg>,
    'Chemistry':           <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M9 3h6"/><path d="M10 3v5.5L5.5 17A2 2 0 007.3 20h9.4a2 2 0 001.8-2.9L14 8.5V3"/><line x1="7.5" y1="14" x2="16.5" y2="14"/></svg>,
    'Biology':             <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M7 3s3.5 3 3.5 9S7 21 7 21"/><path d="M17 3s-3.5 3-3.5 9 3.5 9 3.5 9"/><line x1="12" y1="3" x2="12" y2="21"/></svg>,
    'Economics':           <svg width={size} height={size} viewBox="0 0 24 24" {...s}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    'Government':          <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    'English Language':    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M4 6h16M4 12h16M4 18h10"/></svg>,
  }
  return icons[name] ?? (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}>
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
    </svg>
  )
}