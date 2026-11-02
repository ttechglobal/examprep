import PublicDocument from '@/components/landing/PublicDocument'
import { publicMetadata } from '@/lib/publicWebsite'
import { whatsappLink } from '@/lib/contact'

export const metadata = publicMetadata({title:'Privacy | ExamPrep A1',description:'How ExamPrep A1 uses account details, practice activity and device storage.',path:'/privacy'})

export default function PrivacyPage() {
  return <PublicDocument title="Privacy">
    <p>This notice describes the account and practice information used by ExamPrep A1.</p>
    <h2>Account and practice information</h2>
    <p>Creating an account asks for your name and a phone number or email address, together with a password. Authentication is handled through Supabase. Your profile, practice activity, progress and plan information support your learning experience.</p>
    <h2>On your device</h2>
    <p>The browser app uses local storage and caching for preferences, referral codes and practice data. An ambassador link can save a referral code on your device for up to 30 days before signup. Signing up with a valid teacher code links your account to that ambassador.</p>
    <h2>Leaderboards and referrals</h2>
    <p>Practice rewards and leaderboard features use learning activity. Teacher ambassadors can see a limited list of students linked to them and referral earnings; their student view uses first names and last initials. Administrators can access account and referral information to operate the service.</p>
    <h2>Service providers</h2>
    <p>The website uses Supabase for account and backend services, and Vercel Analytics and Speed Insights for website usage and performance measurement.</p>
    <h2>Shared school computers</h2>
    <p>The desktop school experience keeps shared practice activity on each computer. Local session totals do not identify distinct learners. Screenshots on this website use example data.</p>
    <h2>Questions about your information</h2>
    <p><a href={whatsappLink('Hello, I have a question about my ExamPrep A1 account information.')}>Contact support</a> for help with your account information or a deletion request.</p>
  </PublicDocument>
}
