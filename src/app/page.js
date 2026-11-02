import PublicHome from '@/components/landing/PublicHome'
import { publicMetadata } from '@/lib/publicWebsite'

export const metadata = publicMetadata({
  title: 'ExamPrep A1 | Better prepared for JAMB & WAEC',
  description: 'Work towards your JAMB goal with engaging past-question practice, learning tools and quiz battles. Build understanding, speed and exam confidence for JAMB and WAEC.',
  path: '/',
})

export default function LandingPage() {
  return <PublicHome />
}
