// src/components/landing/FaqList.jsx
// Native <details>, so it works without JavaScript.
import s from './landing.module.css'

export default function FaqList({ items }) {
  return (
    <div className={s.faq}>
      {items.map(f => (
        <details key={f.q} className={s.faqItem}>
          <summary>
            {f.q}
            <span className={s.faqPlus} aria-hidden="true"><span>+</span></span>
          </summary>
          <div className={s.faqAnswer}><p>{f.a}</p></div>
        </details>
      ))}
    </div>
  )
}