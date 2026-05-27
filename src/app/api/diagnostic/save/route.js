import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { examType, subjects, answers, questions } = await request.json()

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Update profile with exam type and subjects from diagnostic
  await service
    .from('profiles')
    .update({
      exam_type: examType,
      subjects: subjects,
    })
    .eq('id', user.id)

  // Get subject IDs
  const { data: subjectRows } = await service
    .from('subjects')
    .select('id, name')
    .in('name', subjects)

  // Save diagnostic results and learning paths per subject
  for (const subjectRow of (subjectRows ?? [])) {
    // Find weak subtopics for this subject
    const subjectQuestions = questions.filter(q => q.subject_name === subjectRow.name)
    const weakSubtopicIds = subjectQuestions
      .filter(q => answers[q.id] && !answers[q.id].is_correct)
      .map(q => q.subtopic_id)
      .filter((id, i, arr) => id && arr.indexOf(id) === i) // unique

    const totalForSubject = subjectQuestions.length
    const correctForSubject = subjectQuestions.filter(q => answers[q.id]?.is_correct).length
    const score = totalForSubject > 0
      ? Math.round((correctForSubject / totalForSubject) * 100)
      : 0

    // Save diagnostic result
    await service
      .from('diagnostic_results')
      .insert({
        student_id: user.id,
        subject_id: subjectRow.id,
        exam_type: examType,
        weak_subtopic_ids: weakSubtopicIds,
        score,
      })

    // Build learning path — weak subtopics first, ordered by exam_frequency
    const { data: allSubtopics } = await service
      .from('subtopics')
      .select('id, exam_frequency, topic_id, topics!inner(subject_id)')
      .eq('topics.subject_id', subjectRow.id)
      .order('exam_frequency', { ascending: false })

    if (allSubtopics?.length) {
      // Weak subtopics first, then the rest
      const weakFirst = [
        ...allSubtopics.filter(s => weakSubtopicIds.includes(s.id)),
        ...allSubtopics.filter(s => !weakSubtopicIds.includes(s.id)),
      ]

      await service
        .from('student_learning_paths')
        .upsert({
          student_id: user.id,
          subject_id: subjectRow.id,
          ordered_subtopic_ids: weakFirst.map(s => s.id),
          last_calculated_at: new Date().toISOString(),
        }, { onConflict: 'student_id,subject_id' })
    }
  }

  return NextResponse.json({ success: true })
}