import { requireAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { appDay } from '@/lib/dates'
import { rateLimited } from '@/lib/server/rateLimit'
import { analyticsSnapshotLoader, analyticsHandler } from '@/lib/server/analyticsSnapshot.mjs'

const snapshot = analyticsSnapshotLoader({ load: async args => {
  const result = await supabaseAdmin().rpc('admin_analytics_snapshot', args).abortSignal(AbortSignal.timeout(12_000))
  if (result.error) throw result.error
  return result.data
} })
export const GET = analyticsHandler({ requireAdmin, rateLimited, appDay, snapshot })
