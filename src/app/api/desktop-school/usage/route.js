import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { rateLimited } from '@/lib/server/rateLimit'
import { verifySchoolUsageProof } from '@/lib/server/schoolUsageProof.mjs'
import { schoolUsageHandlers } from '@/lib/server/schoolUsageHandlers.mjs'

export const runtime = 'nodejs'
export const POST = schoolUsageHandlers({ supabaseAdmin, rateLimited, verifyProof: verifySchoolUsageProof })
