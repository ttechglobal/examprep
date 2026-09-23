// src/app/register/page.js
// Retired: the student sign-up / sign-in screen lives at /onboarding.
// Kept as a redirect so existing links keep working.
import { redirectToOnboarding } from '@/lib/auth/redirectToOnboarding'

export default async function Page({ searchParams }) {
  await redirectToOnboarding(searchParams, 'signup')
}
