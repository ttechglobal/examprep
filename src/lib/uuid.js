// src/lib/uuid.js
// The one check for an id that must be a uuid (validate before touching the database).
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
