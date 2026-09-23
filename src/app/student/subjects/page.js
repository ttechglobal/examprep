// src/app/student/subjects/page.js
// Retired: exams and subjects are set on the profile page.
// Kept as a redirect for old notification links.
import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/student/profile?setup=1')
}
