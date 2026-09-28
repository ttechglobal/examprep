// src/lib/network.js
// Telling "no connection" apart from a real error, so screens can say
// "You're offline" instead of showing a browser message like "Failed to fetch".
// Used by the session error screens (practice, mock, battle).

// Chrome: "Failed to fetch" · Safari: "Load failed" · Firefox: "NetworkError…"
const CONNECTION_MESSAGE = /failed to fetch|load failed|networkerror|network request failed/i

/** True when the device is offline or `error` (an Error or message) is a connection failure. */
export function isConnectionProblem(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = typeof error === 'string' ? error : error?.message
  return CONNECTION_MESSAGE.test(message ?? '')
}
