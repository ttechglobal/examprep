// Shared by the admin preview and Edge sender. Replace the complete token so
// double braces never leave literal braces around a student's name.
const NAME_TOKEN = /\{\{\s*name\s*\}\}|\{\s*name\s*\}/gi

export function hasNameToken(text) {
  return /\{\{\s*name\s*\}\}|\{\s*name\s*\}/i.test(text ?? '')
}

export function fillName(text, name) {
  const firstName = typeof name === 'string' ? name.trim().split(/\s+/)[0] : ''
  // A callback treats characters such as "$&" in a name as literal text.
  return text.replace(NAME_TOKEN, () => firstName || 'there')
}

export const PERSONALIZATION_VERSION = 1
