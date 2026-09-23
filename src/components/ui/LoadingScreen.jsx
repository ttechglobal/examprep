// src/components/ui/LoadingScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen "just a moment" state, used while the app checks who's signed in.
//
// Replaces DarkSplash, which kept the theme in React state: it rendered light
// first and switched to dark after mounting, so dark-mode users saw a light
// flash (and React warned about the style change). This version has no state.
// It's coloured by the theme tokens in globals.css, so it paints correctly on
// the very first frame, server-rendered or not.
//
// In the installed app the navy launch splash covers this completely; this is
// what browser-tab users see.
// ─────────────────────────────────────────────────────────────────────────────

export default function LoadingScreen() {
  return (
    <div className="ep-loading" role="status" aria-label="Loading">
      <style>{`
        .ep-loading {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background-color: var(--bg-base);
        }
        .ep-loading-mark {
          width: 88px; height: 88px;
          background: url('/icons/launch-mark.webp') center / contain no-repeat;
          animation: ep-loading-pulse 1.6s ease-in-out infinite;
        }
        @keyframes ep-loading-pulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%      { transform: scale(.94); opacity: .75; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ep-loading-mark { animation: none; }
        }
      `}</style>
      <div className="ep-loading-mark" />
    </div>
  )
}
