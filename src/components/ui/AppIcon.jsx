// Small, crisp interface symbols shared by Home cards and the mobile shell.
export default function AppIcon({ name, size = 22 }) {
  const shapes = {
    book: <><path d="M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/><path d="M6 8h3M15 8h3M6 11h3M15 11h3"/></>,
    controller: <><path d="M8 7h8c3 0 4 2 5 6l.5 3a2.5 2.5 0 0 1-4.3 2L14 15h-4l-3.2 3a2.5 2.5 0 0 1-4.3-2l.5-3c1-4 2-6 5-6Z"/><path d="M7 10v4M5 12h4"/><circle cx="15" cy="11" r=".7" fill="currentColor"/><circle cx="18" cy="13" r=".7" fill="currentColor"/></>,
    bolt: <path d="m13 2-8 11h6l-1 9 9-12h-6l1-8Z" fill="currentColor" strokeWidth="1"/>,
    trophy: <><path d="M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H3v4c0 3 2 4 5 4m9-8h4v4c0 3-2 4-5 4M12 15v6M8 21h8"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></>,
    moon: <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>
}
