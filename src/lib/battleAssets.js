// src/lib/battleAssets.js
// The artwork the battle world shows, preloaded behind its loading screen
// (BattleExperience) so screens open fully drawn.
//
// Images are requested exactly as the screens request them: next/image specs
// go through getImageProps with the same width/height/sizes, so the browser
// picks the same optimized copy; CSS backgrounds and sprite sheets use their
// literal URLs. The service worker (public/sw.js) keeps every one of them on
// the phone after the first download, so later visits load from the device.
//
// Keep the specs in step with the components named beside them.

import { getImageProps } from 'next/image'
import { SPRITE_SHEETS, spriteUrl } from '@/components/battle/IllustratedIcon'
import { BATTLE_AUDIO_FILES } from '@/lib/battleAudioFiles'

const DESIGN = '/images/battle/design/'

const IMAGES = [
  { src: 'courtyard.png', fill: true, sizes: '100vw', quality: 75 },     // GameShell scenery, BattleBg
  { src: 'guide.png', width: 1317, height: 1194, sizes: '480px' },      // BattleGuide (desktop)
  { src: 'guide.png', width: 1317, height: 1194, sizes: '140px' },      // BattleGuide (phone strip)
  { src: 'crest.png', width: 1254, height: 1254, sizes: '220px' },      // BattleSign hero
  { src: 'robot-book.png', width: 1353, height: 1162, sizes: '150px' }, // hub Battle button
  { src: 'guide-fighter.png', width: 400, height: 470 },                // arena fighters
  { src: 'robot.png', width: 400, height: 470 },
  { src: 'guide-fighter.png', width: 120, height: 120 },                // score duel portraits
  { src: 'robot.png', width: 120, height: 120 },
]
const CSS_BACKGROUNDS = ['courtyard.png', 'title-board.png']           // loading screen, BattleSign board

function loadImage({ src, srcSet, sizes }) {
  return new Promise(resolve => {
    const image = new window.Image()
    image.onload = image.onerror = () => resolve()
    if (sizes) image.sizes = sizes
    if (srcSet) image.srcset = srcSet
    image.src = src
  })
}

function loadFile(url) {
  return fetch(url).then(res => res.arrayBuffer()).catch(() => {})
}

/** One promise per asset; each resolves (never rejects) when that asset is ready. */
export function preloadBattleAssets() {
  const images = IMAGES.map(({ src, ...spec }) => {
    const { props } = getImageProps({ src: DESIGN + src, alt: '', ...spec })
    return loadImage(props)
  })
  const backgrounds = CSS_BACKGROUNDS.map(file => loadImage({ src: DESIGN + file }))
  const sprites = SPRITE_SHEETS.map(file => loadImage({ src: spriteUrl(file) }))
  const audio = [...Object.values(BATTLE_AUDIO_FILES.music), ...Object.values(BATTLE_AUDIO_FILES.voice)]
    .filter(Boolean).map(loadFile)
  return [...images, ...backgrounds, ...sprites, ...audio]
}
