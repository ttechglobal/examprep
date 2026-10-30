'use client'
import ContentText from './ContentText'
import { questionTableBlocks } from '@/lib/questionTables'
import { contentText } from '@/lib/questionContent'
import s from './QuestionSourceText.module.css'

export default function QuestionSourceText({ text }) {
  return <div className={s.content}>{questionTableBlocks(contentText(text)).map((block, index) => block.type === 'text'
    ? <ContentText key={index} text={block.text} />
    : <div key={index} className={s.scroll} tabIndex={0} role="region" aria-label="Question data table">
      <table className={s.table}>
        <thead><tr>{block.headers.map((cell, column) => <th key={column} scope="col"><ContentText text={cell} /></th>)}</tr></thead>
        <tbody>{block.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => c === 0
          ? <th key={c} scope="row"><ContentText text={cell} /></th>
          : <td key={c}><ContentText text={cell} /></td>)}</tr>)}</tbody>
      </table>
    </div>)}</div>
}
