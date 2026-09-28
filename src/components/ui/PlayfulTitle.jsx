// src/components/ui/PlayfulTitle.jsx
// The playful heading: a darker lead ("How do you want to") and a bigger blue
// accent ("practice?") in Baloo 2, slightly tilted, with three gold strokes.
// Used by the Practice hero and the practice setup sheet.
//
// Props: lead · accent · stacked (lead on its own line) · as ('h1' | 'h2') ·
//        className (size and spacing come from the caller via font-size)

import { playfulFont } from '@/lib/fonts'
import s from './PlayfulTitle.module.css'

export default function PlayfulTitle({ lead, accent, stacked = false, as: Tag = 'h1', className = '' }) {
  return (
    <Tag className={[playfulFont.className, s.title, stacked && s.stacked, className].filter(Boolean).join(' ')}>
      {lead && <><span className={s.lead}>{lead}</span>{stacked ? null : ' '}</>}
      <span className={s.accent}>
        {accent}
        <svg className={s.spark} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 8 1.5 4.5M9.5 5.5 9.8 1M14.5 8.5 18 5.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </span>
    </Tag>
  )
}
