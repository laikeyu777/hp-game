# Task 1 brief

Implement the animation math and effect lifecycle foundation in `pixel-art.js` with tests in `pixel-art.test.js`.

Required API: `frameAt(now, start, fps, frameCount)`, `normalizedProgress(now, start, duration)`, `appendEffect(effects, effect, maxEffects)`, `pruneEffects(effects, now)`.

Expected behavior:
- frameAt(0,0,12,4) = 0; frameAt(250,0,12,4) = 3; frameAt(350,0,12,4) = 0.
- normalizedProgress clamps to 0..1 and handles duration <= 0 as 1.
- appendEffect is immutable, caps to maxEffects (default 32), dropping oldest entries.
- pruneEffects retains only effects where now < startTime + duration.
- UMD wrapper: CommonJS export for Node and `globalThis.PixelArt` in browser.

Use Node built-in assert tests and watch them fail before implementation, then pass.

Report: `.superpowers/sdd/task-1-report.md` with status, commit, command and result.
