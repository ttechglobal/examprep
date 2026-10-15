# Shared subject illustrations

Use `components/ui/SubjectIllustration.jsx` for illustrated subject icons on a new page:

```jsx
import SubjectIllustration from '@/components/ui/SubjectIllustration'

<SubjectIllustration name={subject.name} size={32} />
```

Use `size={null}` and a class with a width when the existing layout controls sizing. Use an em size for compact labels. Icons are decorative and must accompany a visible subject name.

The component reads `lib/subjectArtwork.js`, the same registry used by flashcards. Case, whitespace, aliases such as CRK, and exam suffixes are handled there. Extend that registry when adding a subject; do not add page-local subject-to-icon tables. The registry already covers all 24 supported illustration themes, even before flashcards exist for those subjects.

Battle passes `subject:<name>` through its existing IllustratedIcon adapter; topic-specific, exam, timer and other Battle illustrations retain their own design sprites. Profile's SubjectGlyph compatibility export delegates to SubjectIllustration, so all profile lists and subject-selection sheets use the same source.

Subject availability remains controlled by the existing subject API and exam configuration. Artwork never adds a subject to the catalog or changes exam selection limits.

Validation: `node --experimental-vm-modules --test tests/subject-icons.test.mjs tests/subject-artwork.test.mjs`.
