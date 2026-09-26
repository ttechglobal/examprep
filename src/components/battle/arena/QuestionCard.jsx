// src/components/battle/arena/QuestionCard.jsx
// The question card with the subject pill on top. `timer` (e.g. a TimerRing)
// sits inside the pill; `passage` is shown above the question when a question
// belongs to a comprehension passage.
import { MathText } from '@/lib/mathRenderer'
import { NAVY, GOLD2, subjectEmoji } from './theme'

export default function QuestionCard({ subject, text, passage, timer }) {
  return (
    <div style={{ position:'relative', marginTop:14 }}>
      <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#F59E0B,#FBBF24)', border:'3px solid #D5E5F5', borderRadius:999, padding:'5px 18px', display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:900, color:NAVY, whiteSpace:'nowrap', boxShadow:`0 4px 0 ${GOLD2},0 6px 14px rgba(245,158,11,.35)`, zIndex:5 }}>
        <span>{subjectEmoji(subject)}</span>
        <span>{subject || 'Question'}</span>
        {timer}
      </div>
      <div style={{ background:'#FAFBFF', border:'3px solid #1A2468', borderRadius:24, boxShadow:'0 10px 0 rgba(26,36,104,.2),0 14px 32px rgba(26,36,104,.14),inset 0 1px 0 rgba(255,255,255,.9)', position:'relative', overflow:'visible' }}>
        {[{left:'-10px'},{right:'-10px'}].map((s,i)=>(
          <div key={i} style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', width:18, height:18, borderRadius:'50%', background:'#3B5BDB', border:'3px solid #D5E5F5', boxShadow:'0 2px 6px rgba(0,0,0,.25)', ...s }}/>
        ))}
        <div style={{ padding:'clamp(32px,5vw,52px) clamp(22px,4vw,38px) clamp(24px,4vw,40px)' }}>
          {passage && (
            <div style={{ fontSize:14, fontWeight:600, color:'#374151', lineHeight:1.65, background:'#EEF2FF', borderRadius:14, padding:'12px 14px', marginBottom:16, maxHeight:220, overflowY:'auto', wordBreak:'break-word' }}>
              <MathText text={passage} as="div" className=""/>
            </div>
          )}
          <div style={{ fontSize:'clamp(17px,2.4vw,26px)', fontWeight:900, color:'#1A1F5E', lineHeight:1.65, wordBreak:'break-word' }}>
            <MathText text={text ?? ''} as="span" className=""/>
          </div>
        </div>
      </div>
    </div>
  )
}
