import PublicDocument from '@/components/landing/PublicDocument'
import { publicMetadata } from '@/lib/publicWebsite'
import { whatsappLink } from '@/lib/contact'

export const metadata = publicMetadata({title:'Terms of use | ExamPrep A1',description:'Information about responsible use, learning results and feature availability in ExamPrep A1.',path:'/terms'})

export default function TermsPage() {
  return <PublicDocument title="Terms of use">
    <p>ExamPrep A1 provides tools for WAEC and JAMB preparation, including past-question practice, learning tools and quiz battles.</p>
    <h2>Learning results</h2>
    <p>Practice scores, XP and leaderboard positions describe activity in the app. They are not official examination results or a guarantee of a particular grade, score or admission outcome.</p>
    <h2>Responsible use</h2>
    <p>Keep your account credentials private. Do not attempt to access another person’s account, disrupt the service or manipulate practice records and rankings.</p>
    <h2>Access and availability</h2>
    <p>Features and access can vary by platform and plan. Review the information displayed in the app before choosing a plan. Features labelled coming soon are not currently offered as public downloads or live actions on this website.</p>
    <h2>Shared school mode</h2>
    <p>Desktop school activity is scoped to the computer used for practice. School previews do not promise cross-device reporting, individual learner identification or automatic activation.</p>
    <h2>Support</h2>
    <p>If you have an account, access or payment question, <a href={whatsappLink('Hello, I need help with ExamPrep A1 access or account terms.')}>contact the ExamPrep A1 support team</a>.</p>
  </PublicDocument>
}
