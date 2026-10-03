'use client'
import { MathText } from '@/lib/mathRenderer'
import { LETTERS, NAVY2, optionText } from './theme'
import s from './AnswerTiles.module.css'
import Image from 'next/image'

export function PickBadge({ who, opponent, size = 36 }) {
  const look = who === 'both' ? {bg:NAVY2,label:'Both'} : who === 'me' ? {bg:'#087cff',label:'You',art:'guide-fighter'} : {bg:opponent?.color || '#c3212b',label:opponent?.label || 'Computer',art:opponent?.label === 'Computer' ? 'robot' : null}
  return <span className={s.pickBadge} style={{background:look.bg,fontSize:Math.max(11,size/3)}}>{look.art && <Image src={`/images/battle/design/${look.art}.png`} alt="" width={20} height={20}/>} {look.label}</span>
}
export function pickedBy(index,mine,theirs) {
  return index === mine && index === theirs ? 'both' : index === mine ? 'me' : index === theirs ? 'them' : null
}
export default function AnswerTiles({ options, selectedIdx, reveal, opponent, onSelect, disabled = false }) {
  return <div className={`btiles ${s.grid}`} aria-label="Answer choices">
    {options.map((option,index) => {
      const selected = selectedIdx === index
      const correct = reveal && index === reveal.correctIdx
      const wrong = reveal && selected && !correct
      const who = reveal ? pickedBy(index,selectedIdx,reveal.theirsIdx) : null
      return <button key={index} type="button" disabled={!!reveal || disabled} aria-pressed={selected} onClick={() => onSelect?.(index)} className={`${s.answer} ${selected && !reveal ? s.selected : ''} ${correct ? s.correct : ''} ${wrong ? s.wrong : ''} ${reveal && !selected && !correct ? s.muted : ''}`}>
        <span className={s.letter} aria-hidden="true">{correct ? '✓' : wrong ? '✗' : LETTERS[index]}</span>
        <span className={s.text}><MathText text={optionText(option)} as="span" className=""/></span>
        {who && <span className={s.pick}><PickBadge who={who} opponent={opponent}/></span>}
      </button>
    })}
  </div>
}
