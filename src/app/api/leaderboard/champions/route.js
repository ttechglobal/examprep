// src/app/api/leaderboard/champions/route.js
//
// GET /api/leaderboard/champions?limit=12
//
// Returns real monthly champion records from the monthly_champions table.
// Returns { champions: [] } — never an error status — if the table doesn't
// exist yet, is empty, or any query fails. This means the UI always gets a
// clean response and shows the "no champions yet" empty state.
//
// ── Create the table once in Supabase SQL editor ─────────────────────────────
//
//   CREATE TABLE IF NOT EXISTS monthly_champions (
//     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     month       text NOT NULL,        -- 'September 2026'
//     month_sort  text NOT NULL,        -- '2026-09'  (for ORDER BY)
//     student_id  uuid,                 -- optional FK to auth.users
//     name        text NOT NULL,
//     school_name text,
//     xp          integer NOT NULL DEFAULT 0,
//     created_at  timestamptz DEFAULT now()
//   );
//   ALTER TABLE monthly_champions ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "public read" ON monthly_champions FOR SELECT USING (true);
//
// ── Insert a champion (admin SQL or Supabase table editor) ───────────────────
//
//   INSERT INTO monthly_champions (month, month_sort, name, school_name, xp)
//   VALUES ('September 2026', '2026-09', 'Oluwatobi A.', 'Kings College', 14320);

import { createClient } from '@supabase/supabase-js'
import { NextResponse }  from 'next/server'

const EMPTY = NextResponse.json(
  { champions: [] },
  { headers: { 'Cache-Control': 'public, s-maxage=60' } }
)

export async function GET(request) {
  // Defensive: return empty if env vars are missing (build time, etc.)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return EMPTY
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '12', 10), 24)

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await db
      .from('monthly_champions')
      .select('id, month, month_sort, name, school_name, xp, student_id')
      .order('month_sort', { ascending: false })
      .limit(limit)

    if (error) {
      // 42P01 = table doesn't exist yet — completely expected, return empty
      // PGRST116 = PostgREST "relation does not exist"
      // Any other error — log it but still return empty so the UI works
      const isTableMissing = (
        error.code === '42P01' ||
        error.code === 'PGRST116' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation')
      )
      if (!isTableMissing) {
        console.error('[champions] query error:', error.message)
      }
      return NextResponse.json(
        { champions: [], note: isTableMissing ? 'table_not_created' : 'query_error' },
        { headers: { 'Cache-Control': 'public, s-maxage=30' } }
      )
    }

    return NextResponse.json(
      { champions: data ?? [] },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
    )
  } catch (err) {
    // Never 500 — always return empty so the UI renders cleanly
    console.error('[champions] unexpected error:', err?.message)
    return NextResponse.json({ champions: [] })
  }
}