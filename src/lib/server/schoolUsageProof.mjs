// Same P-256 device identity format as the desktop activation service.
// Usage has its own endpoint and action so it cannot mutate activation grants.
import { webcrypto } from 'node:crypto'

function decode(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding')
  return Buffer.from(value, 'base64url')
}
export async function verifySchoolUsageProof(payload, signature) {
  const bytes = decode(payload)
  if (bytes.length > 32000) throw new Error('Report too large')
  const proof = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (proof.version !== 1 || proof.action !== 'usage' || !/^[0-9a-f-]{36}$/.test(proof.nonce) ||
      !proof.input || Array.isArray(proof.input) || typeof proof.input !== 'object') throw new Error('Invalid usage proof')
  const raw = decode(proof.device?.public_key), fingerprint = decode(proof.device?.fingerprint), sig = decode(signature)
  const digest = Buffer.from(await webcrypto.subtle.digest('SHA-256', Buffer.concat([raw, fingerprint]))).toString('hex')
  if (raw.length !== 65 || raw[0] !== 4 || fingerprint.length !== 32 || sig.length !== 64 || digest !== proof.device?.device_id) throw new Error('Invalid device identity')
  const key = await webcrypto.subtle.importKey('raw', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  if (!await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, bytes)) throw new Error('Invalid device signature')
  return proof
}
