// src/lib/server/adminPasswords.js
// Team member passwords (admin_users.password_hash): scrypt with a random salt,
// stored as "scrypt$<salt hex>$<hash hex>". Server only.

import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

export const MIN_PASSWORD_LENGTH = 10

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(String(password), salt, KEY_LENGTH)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored ?? '').split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scryptAsync(String(password ?? ''), Buffer.from(saltHex, 'hex'), expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
