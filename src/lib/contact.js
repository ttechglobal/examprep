// src/lib/contact.js
// How students and schools reach us. One number for the whole app.

export const SUPPORT_WHATSAPP = '2348166528437'

/** A WhatsApp chat with us, the message already typed. */
export function whatsappLink(text) {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`
}

export const SCHOOL_PARTNERSHIP_URL = whatsappLink('Hi, I would like to explore an ExamPrep A1 partnership to help our students prepare for JAMB and WAEC. How can we get started?')

/** A WhatsApp chat with someone else (international digits, e.g. 23480…). */
export function whatsappTo(number, text) {
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** The ExamPrep & Career Quest WhatsApp channel: exam tips, scholarships,
 *  admissions. */
export const COMMUNITY_URL = 'https://whatsapp.com/channel/0029VbDQICiBvvsYtfZTms1H'

/** Career Quest, our careers app. */
export const CAREER_QUEST_URL = 'https://careerquestapp.vercel.app/'
