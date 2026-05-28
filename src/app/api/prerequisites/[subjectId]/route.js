// src/app/api/admin/prerequisites/[subjectId]/route.js
// GET    — fetch current prerequisite map for a subject (all topic deps)
// POST   — save/replace the full map from AI-generated JSON
// PATCH  — approve map, update depth/threshold settings, or edit individual edges
// DELETE — remove a single prerequisite edge (body: { topicId, requiresTopicId })

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── GET — load full map ───────────────────────────────────────────────────────
export async function GET(request, { params }) {
  const { subjectId } = await params
  const db = service()

  // Get all topics for this subject
  const { data: topics } = await db
    .from('topics')
    .select('id, name, slug, exam_type, order_index')
    .eq('subject_id', subjectId)
    .order('order_index')

  if (!topics?.length) {
    return NextResponse.json({ topics: [], edges: [], settings: null })
  }

  const topicIds = topics.map(t => t.id)

  // Get all prerequisite edges for these topics
  const { data: edges } = await db
    .from('topic_prerequisites')
    .select(`
      id,
      topic_id,
      requires_topic_id
    `)
    .in('topic_id', topicIds)

  // Get subject settings
  const { data: subject } = await db
    .from('subjects')
    .select('prereq_map_status, prereq_depth, prereq_pass_threshold, prereq_reviewed_at')
    .eq('id', subjectId)
    .single()

  return NextResponse.json({
    topics:   topics ?? [],
    edges:    edges ?? [],
    settings: subject ?? null,
  })
}

// ── POST — save full AI-generated map (replaces existing) ────────────────────
export async function POST(request, { params }) {
  const { subjectId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topics: aiTopics } = await request.json()

  if (!Array.isArray(aiTopics) || !aiTopics.length) {
    return NextResponse.json({ error: 'topics array is required' }, { status: 400 })
  }

  const db = service()

  // Load existing topics to resolve names → IDs
  const { data: dbTopics } = await db
    .from('topics')
    .select('id, name')
    .eq('subject_id', subjectId)

  if (!dbTopics?.length) {
    return NextResponse.json({ error: 'No topics found for this subject' }, { status: 404 })
  }

  // Build name → id map (case-insensitive)
  const nameToId = {}
  dbTopics.forEach(t => { nameToId[t.name.toLowerCase().trim()] = t.id })

  const topicIds = dbTopics.map(t => t.id)

  // Delete existing edges for this subject's topics
  await db
    .from('topic_prerequisites')
    .delete()
    .in('topic_id', topicIds)

  // Detect cycles before saving
  const edgesToInsert = []
  const errors = []

  for (const aiTopic of aiTopics) {
    if (aiTopic.foundational || !aiTopic.prerequisites?.length) continue

    const topicId = nameToId[aiTopic.name?.toLowerCase().trim()]
    if (!topicId) {
      errors.push(`Topic not found in DB: "${aiTopic.name}"`)
      continue
    }

    for (const prereqName of aiTopic.prerequisites) {
      const prereqId = nameToId[prereqName?.toLowerCase().trim()]
      if (!prereqId) {
        errors.push(`Prerequisite topic not found: "${prereqName}" (for "${aiTopic.name}")`)
        continue
      }
      if (prereqId === topicId) {
        errors.push(`Self-reference skipped: "${aiTopic.name}"`)
        continue
      }
      edgesToInsert.push({ topic_id: topicId, requires_topic_id: prereqId })
    }
  }

  // Cycle detection (simple DFS)
  const cycleError = detectCycles(edgesToInsert)
  if (cycleError) {
    return NextResponse.json({
      error: `Circular dependency detected: ${cycleError}. Fix the map before saving.`,
    }, { status: 400 })
  }

  // Insert edges
  let saved = 0
  if (edgesToInsert.length > 0) {
    const { error: insertError } = await db
      .from('topic_prerequisites')
      .insert(edgesToInsert)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    saved = edgesToInsert.length
  }

  // Mark subject map as draft (needs approval)
  await db
    .from('subjects')
    .update({ prereq_map_status: 'draft' })
    .eq('id', subjectId)

  return NextResponse.json({ saved, errors, status: 'draft' })
}

// ── PATCH — approve, add/remove single edge, or update settings ───────────────
export async function PATCH(request, { params }) {
  const { subjectId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const db = service()

  // ── Approve map ──
  if (body.action === 'approve') {
    await db
      .from('subjects')
      .update({
        prereq_map_status: 'approved',
        prereq_reviewed_by: user.id,
        prereq_reviewed_at: new Date().toISOString(),
      })
      .eq('id', subjectId)
    return NextResponse.json({ success: true, status: 'approved' })
  }

  // ── Revoke approval (back to draft) ──
  if (body.action === 'revoke_approval') {
    await db
      .from('subjects')
      .update({ prereq_map_status: 'draft', prereq_reviewed_by: null, prereq_reviewed_at: null })
      .eq('id', subjectId)
    return NextResponse.json({ success: true, status: 'draft' })
  }

  // ── Update settings (depth, threshold) ──
  if (body.action === 'update_settings') {
    const updates = {}
    if (body.depth !== undefined)     updates.prereq_depth = body.depth
    if (body.threshold !== undefined) updates.prereq_pass_threshold = body.threshold
    await db.from('subjects').update(updates).eq('id', subjectId)
    return NextResponse.json({ success: true })
  }

  // ── Add a single prerequisite edge ──
  if (body.action === 'add_edge') {
    const { topicId, requiresTopicId } = body
    if (!topicId || !requiresTopicId) {
      return NextResponse.json({ error: 'topicId and requiresTopicId required' }, { status: 400 })
    }
    if (topicId === requiresTopicId) {
      return NextResponse.json({ error: 'A topic cannot be its own prerequisite' }, { status: 400 })
    }

    // Fetch existing edges to check for cycle
    const { data: existing } = await db
      .from('topic_prerequisites')
      .select('topic_id, requires_topic_id')
      .or(`topic_id.eq.${topicId},requires_topic_id.eq.${topicId}`)

    const allEdges = [
      ...(existing ?? []).map(e => ({ topic_id: e.topic_id, requires_topic_id: e.requires_topic_id })),
      { topic_id: topicId, requires_topic_id: requiresTopicId },
    ]

    const cycleError = detectCycles(allEdges)
    if (cycleError) {
      return NextResponse.json({ error: `This would create a circular dependency: ${cycleError}` }, { status: 400 })
    }

    const { error } = await db
      .from('topic_prerequisites')
      .insert({ topic_id: topicId, requires_topic_id: requiresTopicId })

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'This prerequisite already exists' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reset approval when map is edited
    await db.from('subjects').update({ prereq_map_status: 'draft' }).eq('id', subjectId)

    return NextResponse.json({ success: true })
  }

  // ── Remove a single prerequisite edge ──
  if (body.action === 'remove_edge') {
    const { edgeId } = body
    if (!edgeId) return NextResponse.json({ error: 'edgeId required' }, { status: 400 })

    await db.from('topic_prerequisites').delete().eq('id', edgeId)

    // Reset approval when map is edited
    await db.from('subjects').update({ prereq_map_status: 'draft' }).eq('id', subjectId)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// ── Cycle detection (DFS) ─────────────────────────────────────────────────────
function detectCycles(edges) {
  // Build adjacency list
  const graph = {}
  for (const edge of edges) {
    if (!graph[edge.topic_id]) graph[edge.topic_id] = []
    graph[edge.topic_id].push(edge.requires_topic_id)
  }

  const visited  = new Set()
  const inStack  = new Set()

  function dfs(node, path) {
    if (inStack.has(node)) {
      return `cycle detected at topic ${node} (path: ${path.join(' → ')})`
    }
    if (visited.has(node)) return null

    visited.add(node)
    inStack.add(node)
    path.push(node)

    for (const neighbour of (graph[node] ?? [])) {
      const result = dfs(neighbour, [...path])
      if (result) return result
    }

    inStack.delete(node)
    return null
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      const result = dfs(node, [])
      if (result) return result
    }
  }

  return null
}