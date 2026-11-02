import PublicNav from './PublicNav'
import PublicFooter from './PublicFooter'
import s from './publicWebsite.module.css'

export default function PublicDocument({ title, children }) {
  return <div className={s.site}><PublicNav /><main id="main-content" className={`${s.wrap} ${s.document}`}><h1>{title}</h1>{children}</main><PublicFooter /></div>
}
