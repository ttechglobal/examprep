import { adminContext, actorOf } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { memo, forget } from '@/lib/server/memo'
import { schoolDeviceAdminHandlers } from '@/lib/server/schoolDeviceAdmin.mjs'

const handlers = schoolDeviceAdminHandlers({ adminContext, actorOf, supabaseAdmin, memo, forget })
export const GET = handlers.GET
export const POST = handlers.POST
