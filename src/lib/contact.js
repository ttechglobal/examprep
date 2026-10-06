// src/lib/contact.js
// How students and schools reach us. One number for the whole app.

export const SUPPORT_WHATSAPP = '2348166528437'

/** A WhatsApp chat with us, the message already typed. */
export function whatsappLink(text) {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`
}

/** A WhatsApp chat with someone else (international digits, e.g. 23480…). */
export function whatsappTo(number, text) {
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
