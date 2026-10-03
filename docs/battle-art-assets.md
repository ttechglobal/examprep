# Battle art assets

All production assets below are in `public/images/battle/design/`. Supplied reference sheets remain unchanged. These individual assets were created with ImageGen from the supplied mockups; they are reconstructions rather than original exports.

| Asset | Reference brief | Background |
| --- | --- | --- |
| courtyard.png | Reconstruct the bright cartoon castle courtyard: blue roof towers, foliage and left tree, right battle banner, stone path, purple floor crest. Remove UI, characters, text and controls. | Opaque |
| guide.png | Isolate the smiling pointing A1 boy with dark spiky hair, gold goggles, white and blue jacket, gloves and backpack. Preserve the reference character and remove surrounding interface. | Transparent |
| guide-fighter.png | Isolate the A1 boy's raised-fist arena pose, matching the supplied arena character. | Transparent |
| robot.png | Isolate the white and blue arena robot with cyan eyes and raised fist, preserving its design. | Transparent |
| robot-book.png | Isolate the small white and blue robot in a graduation hat, reading the orange book from the Battle button. | Transparent |
| logo.png | Isolate the horizontal ExamPrepA1 illustrated logo from the supplied designs. | Transparent |
| title-board.png | Reconstruct the blank wood plank title sign and attached curved cream ribbon without any text or surrounding scenery. | Transparent |
| crest.png | Extract the crossed silver/white swords with gold handles over the brown wood and gold backing crest from the hub reference. | Transparent |

The original generated PNGs are retained in the Codex generated-images directory. The public copies are the paths used by the app. The reference icons are CSS sprite windows into the supplied `reference-*.png` files and are served through Next image optimization.

Exact crest generation prompt:

> Extract only the crossed sword crest centered near the top of the wooden welcome sign in this reference design. Preserve its exact visual character: two large crossed white/silver blade swords with dark blue shaded outlines and gold orange handles, mounted over a golden orange shield-like brown wood backing crest. Output one tightly framed isolated UI illustration on a transparent background, no text, no sign, no scenery, no mascot, no other elements. Crisp polished mobile game cartoon art matching the reference precisely. Keep generous transparency only 3% around crest, aspect ratio approximately square.
