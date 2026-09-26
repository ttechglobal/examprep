// src/components/battle/arena/BattleBg.jsx
// The sky-and-sand battle background behind every battle screen.
export default function BattleBg({ overlay = null }) {
  return (
    <div style={{ position:'absolute', inset:0, zIndex:0 }}>
      <img
        src="/images/battle/session-bg.png"
        alt=""
        style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center bottom', display:'block' }}
      />
      {overlay && <div style={{ position:'absolute', inset:0, background:overlay }}/>}
    </div>
  )
}
