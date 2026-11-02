import Image from 'next/image'
import Link from 'next/link'
import { whatsappLink } from '@/lib/contact'
import s from './publicWebsite.module.css'

export default function PublicFooter() {
  return <footer className={s.footer}>
    <div className={`${s.wrap} ${s.footerTop}`}>
      <div><Link href="/" className={s.brand}><Image src="/images/website/logo.webp" width={38} height={38} alt="" /><span>ExamPrep <b>A1</b></span></Link><p>Practise smarter. Build exam confidence.</p></div>
      <nav aria-label="Product links"><Link href="/download">Start practising</Link><Link href="/#practice">Practice</Link><Link href="/#battles">Battles</Link><Link href="/#lessons">Lessons</Link><Link href="/schools">For schools</Link></nav>
      <nav aria-label="Help and legal links"><a href={whatsappLink('Hello, I need help with ExamPrep A1.')}>Contact support</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/ambassador">Teacher ambassadors</Link></nav>
    </div>
    <div className={`${s.wrap} ${s.footerBottom}`}><span>© {new Date().getFullYear()} ExamPrep A1</span><span>WAEC &amp; JAMB preparation</span></div>
  </footer>
}
