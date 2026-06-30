// src/lib/lessonCssVars.js
//
// Canonical --lesson-* CSS custom property definitions — extracted from
// LessonViewer.jsx's module-scoped `lessonCssVars` template string, which
// was :root/.dark scoped and therefore not safely reusable outside the
// full-screen student lesson view (it would collide with the rest of an
// admin page that doesn't want its whole <html> repainted).
//
// Two exports:
//   - LESSON_CSS_VARS_ROOT  → original :root/.dark scoping, for full-page
//     contexts like LessonViewer.jsx itself.
//   - LESSON_CSS_VARS_SCOPED(className) → same variable set, scoped to a
//     wrapper class instead of :root, safe to drop into an admin panel
//     preview pane without affecting anything outside it.
//
// getAccentOverride(color) computes the inline-style override object
// (--lesson-accent, --lesson-accent-shadow, --lesson-option-sel*) from a
// resolveSubjectColors() result — same logic LessonViewer.jsx uses, now
// callable from anywhere that wants subject-coloured lesson rendering
// (e.g. the admin lesson editor's live preview).

const VARS_LIGHT = `
    --lesson-bg:          #faf7f2;
    --lesson-header:      #f5f1ea;
    --lesson-card:        #ffffff;
    --lesson-border:      #e8e2d9;
    --lesson-text:        #1a1612;
    --lesson-text-muted:  #7c6f5e;
    --lesson-track:       #e8e2d9;
    --lesson-highlight:   #fef3c7;
    --lesson-accent:      #4f46e5;
    --lesson-surface:     #f0ece4;
    --lesson-correct-bg:  #f0fdf4;
    --lesson-correct-bd:  #86efac;
    --lesson-correct-tx:  #15803d;
    --lesson-wrong-bg:    #fef2f2;
    --lesson-wrong-bd:    #fca5a5;
    --lesson-wrong-tx:    #b91c1c;
    --lesson-option-bg:   #ffffff;
    --lesson-option-bd:   #e8e2d9;
    --lesson-option-tx:   #1a1612;
    --lesson-option-sel:  #eef2ff;
    --lesson-option-selbd:#6366f1;
    --lesson-option-seltx:#4338ca;
`

const VARS_DARK = `
    --lesson-bg:          #0f1729;
    --lesson-header:      #0d1525;
    --lesson-card:        #1a2744;
    --lesson-border:      #263352;
    --lesson-text:        #f0f4ff;
    --lesson-text-muted:  #8899bb;
    --lesson-track:       #263352;
    --lesson-highlight:   rgba(251,191,36,0.15);
    --lesson-accent:      #6366f1;
    --lesson-surface:     #162038;
    --lesson-correct-bg:  rgba(16,185,129,0.12);
    --lesson-correct-bd:  #059669;
    --lesson-correct-tx:  #6ee7b7;
    --lesson-wrong-bg:    rgba(239,68,68,0.12);
    --lesson-wrong-bd:    #dc2626;
    --lesson-wrong-tx:    #fca5a5;
    --lesson-option-bg:   #1a2744;
    --lesson-option-bd:   #263352;
    --lesson-option-tx:   #f0f4ff;
    --lesson-option-sel:  rgba(99,102,241,0.2);
    --lesson-option-selbd:#818cf8;
    --lesson-option-seltx:#c7d2fe;
`

// Original :root/.dark scoping — for full-page contexts (LessonViewer.jsx).
export const LESSON_CSS_VARS_ROOT = `
  :root {${VARS_LIGHT}}
  .dark {${VARS_DARK}}
`

// Scoped to a wrapper class instead of :root — safe inside an admin panel
// or any page that doesn't want global :root vars overwritten.
// Usage: <style>{LESSON_CSS_VARS_SCOPED('lesson-preview-scope')}</style>
//        <div className="lesson-preview-scope"> ...SlideRenderer... </div>
//        <div className="lesson-preview-scope dark"> ...for dark mode... </div>
export function LESSON_CSS_VARS_SCOPED(className) {
  return `
  .${className} {${VARS_LIGHT}}
  .${className}.dark {${VARS_DARK}}
`
}

// Computes the subject-colour inline-style override object — same logic
// LessonViewer.jsx uses inline. Pass a resolveSubjectColors() result.
export function getAccentOverride(color) {
  return {
    '--lesson-accent':        color.solid,
    '--lesson-accent-shadow': `${color.text}40`, // ~25% opacity via hex alpha
    '--lesson-option-sel':    color.bg,
    '--lesson-option-selbd':  color.solid,
    '--lesson-option-seltx':  color.text,
  }
}