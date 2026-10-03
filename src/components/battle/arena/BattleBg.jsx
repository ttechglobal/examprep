// src/components/battle/arena/BattleBg.jsx
// The sky-and-sand battle background behind every battle screen.
import Image from 'next/image'
export default function BattleBg({ overlay = null }) {
  return (
    <div style={{ position:'absolute', inset:0, zIndex:0 }}>
      <Image
        src="/images/battle/design/courtyard.png"
        alt=""
        fill
        sizes="100vw"
        priority
        style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center bottom', display:'block' }}
      />
      {overlay && <div style={{ position:'absolute', inset:0, background:overlay }}/>}
    </div>
  )
}
