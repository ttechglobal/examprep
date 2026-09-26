// src/lib/adminAuth.js
// Route-level admin guard. Middleware already rejects unsigned /api/admin/*
// requests; this is the second check inside each handler that calls it.
//
//   const authError = await requireAdmin(request)
//   if (authError) return authError
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/adminSession'

export async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  if (await verifyAdminToken(token)) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
