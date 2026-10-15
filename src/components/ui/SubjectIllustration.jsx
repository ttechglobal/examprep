import { getSubjectArtwork } from '@/lib/subjectArtwork'

// One illustrated icon for subject lists throughout the app. The registry
// handles aliases and exam variants; no page maintains its own subject map.
// Use size=null with an existing CSS class, or size="1em" for compact labels.
export default function SubjectIllustration({ name, size = 40, className = '' }) {
  const artwork = getSubjectArtwork(name)
  return <span className={className} aria-hidden="true" style={{
    display: 'inline-block', flexShrink: 0, width: size ?? undefined,
    aspectRatio: '1', borderRadius: '22%', verticalAlign: 'middle',
    backgroundImage: `url('${artwork.url}')`, backgroundPosition: artwork.position,
    backgroundSize: '200% 200%', backgroundRepeat: 'no-repeat',
  }} />
}
