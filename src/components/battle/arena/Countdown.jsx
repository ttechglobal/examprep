'use client'
import { useState, useEffect, useRef } from 'react'
import { BattleWorld, BattleSign, styles } from '../BattleWorld'
import { DuelScore } from './BattleArena'
export default function Countdown({ endsAt, onDone, caption = 'Get ready!', children }) {
  const [now,setNow] = useState(()=>Date.now())
  const done = useRef(false)
  const callback = useRef(onDone)
  useEffect(()=>{callback.current=onDone},[onDone])
  useEffect(()=>{
    const interval = setInterval(()=>{
      const time = Date.now();setNow(time)
      if (time >= endsAt && !done.current) {done.current=true;callback.current?.()}
    },100)
    return ()=>clearInterval(interval)
  },[endsAt])
  const number = Math.min(3,Math.max(1,Math.ceil((endsAt-now)/1000)))
  return <BattleWorld centered bar={false} label="Battle starting">
    <BattleSign title="Enter|the arena">{caption}</BattleSign>
    <div className={styles.stack}>
      <DuelScore me={0} computer={0}/>
      <strong key={number} className={styles.countNumber} aria-live="assertive">{number}</strong>
      {children}
    </div>
  </BattleWorld>
}
