# Boss Beast Silhouettes

## Goal

Make each chapter boss immediately recognizable by body shape, not only by palette or armor overlays.

## Visual Direction

- Furnace Lord: quadruped magma drake with horns, short wings, furnace chest, and a heavy tail.
- Frost Queen: tall ice wyvern with a long neck, crystal crown, broad ice wings, and a blade-like tail.
- Root Mother: plant-beetle titan with a canopy crown, root legs, side tendrils, and a spore abdomen.
- Sky Executioner: griffin-like thunder bird with broad wings, hooked beak, talons, and a lightning crest.
- Void Pioneer: floating segmented void serpent with a large head, tentacles, multiple eyes, and a rift core.

## Implementation

- Add a dedicated pixel-part collection for each boss in `pixel-art.js`.
- Route boss rendering through a beast renderer before the shared humanoid enemy renderer.
- Keep existing boss ids, hit boxes, skills, damage values, and chapter progression unchanged.
- Preserve reduced-motion behavior and phase-two pulse effects.
- Keep the standalone `character-preview.html` page as the visual review surface.

## Acceptance Criteria

- The five boss render signatures are structurally distinct.
- Preview cards show different silhouettes without relying on color changes.
- Existing enemy, combat-effect, and floor-progression tests remain green.
- 390 x 844 preview has no horizontal overflow.
