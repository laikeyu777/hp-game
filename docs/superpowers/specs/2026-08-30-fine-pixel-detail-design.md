# Fine Pixel Character Detail

## Goal

Increase the visual granularity of heroes, chapter enemies, and bosses while preserving the existing pixel-art Canvas pipeline and mobile performance.

## Design

- Keep the existing silhouette and gameplay coordinates stable.
- Add a second fine-detail layer after each base silhouette.
- Use mostly 1x1 and 2x1 logical pixel parts for facial features, armor seams, cloth weave, joints, claws, scales, feathers, roots, and segmented bodies.
- Keep `imageSmoothingEnabled = false` so every logical pixel remains crisp.
- Use the same detail layer in the standalone character preview and in combat rendering.

## Coverage

- Heroes: eyes, face highlights, armor seams, belt and boot texture.
- Normal enemies: eyes, joints, claws, shell plates, and weapon details.
- Beast bosses: magma cracks, ice facets, bark grain, feather bars, tentacle eyes, and body segments.

## Constraints

- No external image assets.
- No changes to damage, hit boxes, progression, skills, save data, or controls.
- Preserve reduced-motion rendering and phase-two boss pulse effects.

## Acceptance Criteria

- Each hero and enemy render contains fine-grain rectangles no larger than two screen pixels at combat scale.
- Hero and boss geometry signatures remain distinct.
- Existing automated tests pass.
- The 390 x 844 preview has no horizontal overflow and all canvases render.
