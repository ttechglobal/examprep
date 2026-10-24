// Admin content catalogue. Student availability is configured separately below.
export const EXAM_TYPES = {
  WAEC:  'WAEC',
  JAMB:  'JAMB',
  NECO: 'NECO',
}

// Human-readable labels for UI display
export const EXAM_LABELS = {
  WAEC:  'WAEC',
  JAMB:  'JAMB / UTME',
  NECO: 'NECO',
}

// All supported exams as an ordered array — add new exams here only
export const ALL_EXAMS = ['WAEC', 'JAMB', 'NECO']

export const STUDENT_EXAMS = ['WAEC', 'JAMB']

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

