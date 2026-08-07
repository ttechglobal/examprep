// src/lib/constants.js

// Exam types — no BOTH. Students select each exam independently.
// Multi-exam students (e.g. WAEC + IGCSE) have separate subject entries per exam.
// Topics and questions carry an exam_types[] array (e.g. ['WAEC'], ['JAMB'], ['WAEC','JAMB'], ['IGCSE'])
// so content shared across exams is naturally represented without a magic "BOTH" value.
export const EXAM_TYPES = {
  WAEC:  'WAEC',
  JAMB:  'JAMB',
  IGCSE: 'IGCSE',
}

// Human-readable labels for UI display
export const EXAM_LABELS = {
  WAEC:  'WAEC',
  JAMB:  'JAMB / UTME',
  IGCSE: 'Cambridge IGCSE',
}

// All supported exams as an ordered array — add new exams here only
export const ALL_EXAMS = ['WAEC', 'JAMB', 'IGCSE']

export const ROLES = {
  SUPERADMIN:   'superadmin',
  ADMIN:        'admin',
  REVIEWER:     'reviewer',
  SCHOOL_ADMIN: 'school_admin',
  STUDENT:      'student',
}

export const DIFFICULTY = {
  EASY:   'easy',
  MEDIUM: 'medium',
  HARD:   'hard',
}

export const QUESTION_TYPE = {
  RECALL:      'recall',
  APPLICATION: 'application',
  REASONING:   'reasoning',
}

export const QUESTION_FORMAT = {
  MCQ:         'mcq',
  TRUE_FALSE:  'true_false',
  FILL_BLANK:  'fill_blank',
}

export const QUESTION_CONTEXT = {
  DIAGNOSTIC: 'diagnostic',
  PRACTICE:   'practice',
  EXAM:       'exam',
}