// ─────────────────────────────────────────────────────────────
// Levenshtein distance — measures string similarity
// ─────────────────────────────────────────────────────────────
function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

function similarity(a, b) {
  const s1 = a.toLowerCase().trim()
  const s2 = b.toLowerCase().trim()
  if (s1 === s2) return 1
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(s1, s2) / maxLen
}

// ─────────────────────────────────────────────────────────────
// Normalise exam tag to uppercase DB format
// ─────────────────────────────────────────────────────────────
export function normaliseExamType(tag) {
  if (!tag) return 'BOTH'
  const t = tag.toUpperCase().trim()
  if (t === 'WAEC') return 'WAEC'
  if (t === 'JAMB') return 'JAMB'
  return 'BOTH'
}

// ─────────────────────────────────────────────────────────────
// Derive topic exam_type from its subtopics
// Topic is BOTH if it has subtopics from multiple exam types
// ─────────────────────────────────────────────────────────────
export function deriveTopicExamType(subtopics) {
  const types = new Set(subtopics.map(s => s.exam_type))
  if (types.has('BOTH')) return 'BOTH'
  if (types.has('WAEC') && types.has('JAMB')) return 'BOTH'
  if (types.has('WAEC')) return 'WAEC'
  if (types.has('JAMB')) return 'JAMB'
  return 'BOTH'
}

// ─────────────────────────────────────────────────────────────
// PASS 1 — Match topics across WAEC and JAMB
// Returns: array of topic match groups
// ─────────────────────────────────────────────────────────────
function matchTopics(waecTopics, jambTopics) {
  const matched = []
  const usedJamb = new Set()

  for (const waecTopic of waecTopics) {
    let bestMatch = null
    let bestScore = 0

    for (const jambTopic of jambTopics) {
      if (usedJamb.has(jambTopic.id ?? jambTopic.title)) continue
      const score = similarity(waecTopic.title, jambTopic.title)
      if (score > bestScore) {
        bestScore = score
        bestMatch = jambTopic
      }
    }

    if (bestScore >= 0.8 && bestMatch) {
      // Auto-merge
      usedJamb.add(bestMatch.id ?? bestMatch.title)
      matched.push({
        matchType: 'auto',
        score: bestScore,
        waec: waecTopic,
        jamb: bestMatch,
      })
    } else if (bestScore >= 0.6 && bestMatch) {
      // Suggested match — needs admin confirmation
      usedJamb.add(bestMatch.id ?? bestMatch.title)
      matched.push({
        matchType: 'suggested',
        score: bestScore,
        waec: waecTopic,
        jamb: bestMatch,
      })
    } else {
      // WAEC only
      matched.push({
        matchType: 'waec_only',
        score: 0,
        waec: waecTopic,
        jamb: null,
      })
    }
  }

  // Remaining JAMB topics not matched
  for (const jambTopic of jambTopics) {
    if (!usedJamb.has(jambTopic.id ?? jambTopic.title)) {
      matched.push({
        matchType: 'jamb_only',
        score: 0,
        waec: null,
        jamb: jambTopic,
      })
    }
  }

  return matched
}

// ─────────────────────────────────────────────────────────────
// PASS 2 — Match subtopics within a matched topic pair
// ─────────────────────────────────────────────────────────────
function matchSubtopics(waecSubs, jambSubs) {
  const result = []
  const usedJamb = new Set()

  for (const waecSub of waecSubs) {
    let bestMatch = null
    let bestScore = 0

    for (const jambSub of jambSubs) {
      if (usedJamb.has(jambSub.id ?? jambSub.title)) continue
      const score = similarity(waecSub.title, jambSub.title)
      if (score > bestScore) {
        bestScore = score
        bestMatch = jambSub
      }
    }

    if (bestScore >= 0.8 && bestMatch) {
      usedJamb.add(bestMatch.id ?? bestMatch.title)
      result.push({
        matchType: 'both',
        score: bestScore,
        title: waecSub.title,
        exam_type: 'BOTH',
        objectives: mergeObjectives(waecSub.objectives, bestMatch.objectives),
        waecId: waecSub.id,
        jambId: bestMatch.id,
      })
    } else if (bestScore >= 0.6 && bestMatch) {
      // Suggested — show to admin, default to 'both' but flagged
      usedJamb.add(bestMatch.id ?? bestMatch.title)
      result.push({
        matchType: 'suggested',
        score: bestScore,
        title: waecSub.title,
        exam_type: 'BOTH',
        objectives: mergeObjectives(waecSub.objectives, bestMatch.objectives),
        waecId: waecSub.id,
        jambId: bestMatch.id,
        needsReview: true,
      })
    } else {
      result.push({
        matchType: 'waec_only',
        score: 0,
        title: waecSub.title,
        exam_type: 'WAEC',
        objectives: waecSub.objectives ?? [],
        waecId: waecSub.id,
        jambId: null,
      })
    }
  }

  // Remaining JAMB subtopics
  for (const jambSub of jambSubs) {
    if (!usedJamb.has(jambSub.id ?? jambSub.title)) {
      result.push({
        matchType: 'jamb_only',
        score: 0,
        title: jambSub.title,
        exam_type: 'JAMB',
        objectives: jambSub.objectives ?? [],
        waecId: null,
        jambId: jambSub.id,
      })
    }
  }

  return result
}

// Merge objectives — deduplicate by similarity
function mergeObjectives(waecObjs = [], jambObjs = []) {
  const merged = [...waecObjs]
  for (const jObj of jambObjs) {
    const isDuplicate = waecObjs.some(wObj => similarity(wObj, jObj) > 0.75)
    if (!isDuplicate) merged.push(jObj)
  }
  return merged
}

// ─────────────────────────────────────────────────────────────
// MAIN MERGE FUNCTION
// Takes WAEC topics array + JAMB topics array
// Returns merged result ready for admin review
// ─────────────────────────────────────────────────────────────
export function mergeCurricula(waecTopics, jambTopics) {
  const topicMatches = matchTopics(waecTopics, jambTopics)
  const mergedTopics = []
  let needsReview = false

  for (const match of topicMatches) {
    if (match.matchType === 'waec_only') {
      // All subtopics are WAEC
      const subtopics = (match.waec.subtopics ?? []).map(s => ({
        matchType: 'waec_only',
        title: s.title,
        exam_type: 'WAEC',
        objectives: s.objectives ?? [],
        waecId: s.id,
        jambId: null,
        needsReview: false,
      }))

      mergedTopics.push({
        title: match.waec.title,
        exam_type: 'WAEC',
        matchType: 'waec_only',
        subtopics,
        needsReview: false,
      })

    } else if (match.matchType === 'jamb_only') {
      // All subtopics are JAMB
      const subtopics = (match.jamb.subtopics ?? []).map(s => ({
        matchType: 'jamb_only',
        title: s.title,
        exam_type: 'JAMB',
        objectives: s.objectives ?? [],
        waecId: null,
        jambId: s.id,
        needsReview: false,
      }))

      mergedTopics.push({
        title: match.jamb.title,
        exam_type: 'JAMB',
        matchType: 'jamb_only',
        subtopics,
        needsReview: false,
      })

    } else {
      // Matched topic (auto or suggested) — run Pass 2 on subtopics
      const waecSubs = match.waec?.subtopics ?? []
      const jambSubs = match.jamb?.subtopics ?? []
      const subtopics = matchSubtopics(waecSubs, jambSubs)

      const topicNeedsReview =
        match.matchType === 'suggested' ||
        subtopics.some(s => s.needsReview)

      if (topicNeedsReview) needsReview = true

      const derivedExamType = deriveTopicExamType(
        subtopics.map(s => ({ exam_type: s.exam_type }))
      )

      mergedTopics.push({
        title: match.matchType === 'suggested' ? match.waec.title : match.waec.title,
        exam_type: derivedExamType,
        matchType: match.matchType,
        topicScore: match.score,
        subtopics,
        needsReview: topicNeedsReview,
      })
    }
  }

  return {
    topics: mergedTopics,
    needsReview,
    stats: {
      totalTopics: mergedTopics.length,
      waecOnly: mergedTopics.filter(t => t.exam_type === 'WAEC').length,
      jambOnly: mergedTopics.filter(t => t.exam_type === 'JAMB').length,
      both: mergedTopics.filter(t => t.exam_type === 'BOTH').length,
      totalSubtopics: mergedTopics.reduce((a, t) => a + t.subtopics.length, 0),
      flaggedForReview: mergedTopics.reduce(
        (a, t) => a + t.subtopics.filter(s => s.needsReview).length, 0
      ),
    },
  }
}