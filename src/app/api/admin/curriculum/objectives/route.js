// src/app/api/admin/curriculum/objectives/route.js
//
// PATCH /api/admin/curriculum/objectives
//
// Updates ONLY the `objectives` column on existing subtopics.
// Matches subtopics by (topic_id, slug). Touches nothing else —
// lesson_status, lesson_content, lesson_generated, exam_frequency
// are all preserved exactly as they are.
//
// Body:
//   { subjectId: uuid, topics: [...] }   ← same shape as /api/admin/curriculum POST
//
// Use this when you re-import a curriculum that now has objectives
// without risking overwriting lesson content or resetting frequencies.

import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function slugify(str) {
  return (str ?? '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

export async function PATCH(request) {
  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { subjectId, topics } = body
  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })
  if (!Array.isArray(topics) || !topics.length) {
    return NextResponse.json({ error: 'topics array required' }, { status: 400 })
  }

  const db = svc()

  // Load all topics for this subject so we can resolve topic_id by name/slug
  const { data: dbTopics, error: topicsErr } = await db
    .from('topics')
    .select('id, name, slug')
    .eq('subject_id', subjectId)

  if (topicsErr) return NextResponse.json({ error: topicsErr.message }, { status: 500 })

  const topicBySlug = {}
  const topicByName = {}
  for (const t of (dbTopics ?? [])) {
    topicBySlug[t.slug] = t
    topicByName[t.name.toLowerCase().trim()] = t
  }

  const results = {
    subtopics_updated: 0,
    subtopics_not_found: 0,
    subtopics_skipped_empty: 0,
    errors: [],
    not_found: [],
  }

  for (const topic of topics) {
    const topicTitle = (topic.title ?? topic.name ?? '').trim()
    if (!topicTitle) continue

    const topicSlug = slugify(topicTitle)
    const dbTopic   = topicBySlug[topicSlug] || topicByName[topicTitle.toLowerCase().trim()]

    if (!dbTopic) {
      results.errors.push(`Topic "${topicTitle}" not found in DB — run a full import first`)
      continue
    }

    // Load existing subtopics for this topic
    const { data: dbSubs } = await db
      .from('subtopics')
      .select('id, slug, name')
      .eq('topic_id', dbTopic.id)

    const subBySlug = {}
    const subByName = {}
    for (const s of (dbSubs ?? [])) {
      subBySlug[s.slug] = s
      subByName[s.name.toLowerCase().trim()] = s
    }

    for (let si = 0; si < (topic.subtopics ?? []).length; si++) {
      const sub      = topic.subtopics[si]
      const subTitle = (sub.title ?? sub.name ?? '').trim()
      if (!subTitle) continue

      // Normalise objectives — must be a non-empty string[] array
      const rawObj = sub.objectives
      let objectives = []
      if (Array.isArray(rawObj)) {
        objectives = rawObj.filter(o => typeof o === 'string' && o.trim().length > 0).map(o => o.trim())
      } else if (typeof rawObj === 'string' && rawObj.trim()) {
        objectives = rawObj.split(/[\n;]+/).map(o => o.trim()).filter(Boolean)
      }

      // Skip subtopics with no objectives — don't wipe existing ones
      if (!objectives.length) {
        results.subtopics_skipped_empty++
        continue
      }

      const subSlug = slugify(subTitle)
      const dbSub   = subBySlug[subSlug] || subByName[subTitle.toLowerCase().trim()]

      if (!dbSub) {
        results.subtopics_not_found++
        results.not_found.push(`${topicTitle} → ${subTitle}`)
        continue
      }

      // UPDATE only the objectives column — everything else untouched
      const { error } = await db
        .from('subtopics')
        .update({ objectives })
        .eq('id', dbSub.id)

      if (error) {
        results.errors.push(`${topicTitle} → ${subTitle}: ${error.message}`)
      } else {
        results.subtopics_updated++
      }
    }
  }

  return NextResponse.json({
    ok: results.errors.length === 0,
    ...results,
  })
}