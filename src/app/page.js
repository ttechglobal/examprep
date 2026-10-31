import StudentLanding from '@/components/landing/StudentLanding'
import { TRIAL_DAYS } from '@/lib/plans'

export const metadata = {
  title: 'ExamPrep A1: Work towards your JAMB goal | JAMB & WAEC practice',
  description: `Game-like JAMB and WAEC past-question practice, focused weekly challenges, interactive learning and leaderboards. Try Pro free for ${TRIAL_DAYS} days.`,
  openGraph: {
    title: 'Your dream score starts with better practice | ExamPrep A1',
    description: `Practise with a purpose for JAMB and WAEC. Start with ${TRIAL_DAYS} days of Pro free.`,
    images: ['/images/examprep_logo.png'],
    type: 'website',
  },
}

export default function LandingPage() {
  return <StudentLanding />
}
