# Pixel Combat Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace circular combat markers with detailed pixel characters and add meaningful pixel animations for basic attacks, skills, statuses, enemy telegraphs, and the boss phase.

**Architecture:** Add a pure `pixel-art.js` renderer and a pure `combat-visual-state.js` state bridge. `game.js` remains authoritative for combat outcomes and only emits visual events; `requestAnimationFrame` renders snapshots without advancing damage or rewards.

**Tech Stack:** Native HTML, CSS, JavaScript, Canvas 2D, Node.js built-in `assert`, IndexedDB, Service Worker.

## Global Constraints

- Keep the game fully offline and add no external images, fonts, libraries, or network calls.
- Keep the Canvas internal resolution at exactly 360 x 390 and scale it through the existing responsive container.
- Use a 32 x 48 logical pixel body and integer coordinates with `imageSmoothingEnabled = false`.
- Animate at a 12 FPS frame-snapped visual cadence while leaving the 90 ms combat logic timer unchanged.
- Cap short-lived visual effects at 32 objects and discard the oldest decorative effect first.
- Under `prefers-reduced-motion`, disable breathing, cloak motion, and decorative debris while preserving attack telegraphs and hit feedback.
- Do not change damage, attack rate, enemy count, rewards, save schema, or floor progression.

---

## File Structure

- Create `pixel-art.js`: pure Canvas drawing API, sprite rectangle data, animation math, effect lifecycle, and draw functions.
- Create `pixel-art.test.js`: Node tests for frame math, fallbacks, effect limits, and drawing behavior using a recording context.
- Create `combat-visual-state.js`: pure bridge that records attacks, hits, skills, pause offsets, and reduced-motion filtering.
- Create `combat-visual-state.test.js`: Node tests for event creation, pause/resume time, and reduced-motion filtering.
- Modify `game.js`: emit visual events from existing attack and skill paths, maintain enemy visual metadata, and run the rendering loop.
- Modify `index.html`: load visual modules before `game.js` and bump resource versions.
- Modify `sw.js`: cache both new modules and replace the old cache version.

---

### Task 1: Animation Math and Effect Lifecycle

**Files:**
- Create: `pixel-art.js`
- Create: `pixel-art.test.js`

**Interfaces:**
- Consumes: Canvas-compatible contexts supplied later by `game.js`.
- Produces: `PixelArt.frameAt(now, start, fps, frameCount)`, `PixelArt.normalizedProgress(now, start, duration)`, `PixelArt.appendEffect(effects, effect, maxEffects)`, and `PixelArt.pruneEffects(effects, now)`.

- [ ] **Step 1: Write failing tests for frame selection and effect lifetime**

```js
const assert = require('assert');
const PixelArt = require('./pixel-art.js');

assert.equal(PixelArt.frameAt(0, 0, 12, 4), 0);
assert.equal(PixelArt.frameAt(250, 0, 12, 4), 3);
assert.equal(PixelArt.frameAt(350, 0, 12, 4), 0);
assert.equal(PixelArt.normalizedProgress(50, 100, 200), 0);
assert.equal(PixelArt.normalizedProgress(200, 100, 200), 0.5);
assert.equal(PixelArt.normalizedProgress(400, 100, 200), 1);

let effects = [];
for (let i = 0; i < 35; i++) {
  effects = PixelArt.appendEffect(effects, { id: i, startTime: i, duration: 1000 }, 32);
}
assert.equal(effects.length, 32);
assert.equal(effects[0].id, 3);
assert.deepEqual(PixelArt.pruneEffects(effects, 1031).map(effect => effect.id), [32, 33, 34]);
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run:

```powershell
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' pixel-art.test.js
```

Expected: FAIL with `Cannot find module './pixel-art.js'`.

- [ ] **Step 3: Implement the UMD module and minimal pure helpers**

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PixelArt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function frameAt(now, start, fps, frameCount) {
    const elapsed = Math.max(0, now - start);
    return Math.floor(elapsed / (1000 / fps)) % frameCount;
  }

  function normalizedProgress(now, start, duration) {
    if (duration <= 0) return 1;
    return clamp((now - start) / duration, 0, 1);
  }

  function appendEffect(effects, effect, maxEffects = 32) {
    return [...effects, effect].slice(-maxEffects);
  }

  function pruneEffects(effects, now) {
    return effects.filter(effect => now < effect.startTime + effect.duration);
  }

  return { frameAt, normalizedProgress, appendEffect, pruneEffects };
});
```

- [ ] **Step 4: Run the tests and confirm all assertions pass**

Run the Step 2 command.

Expected: exit code 0 with no assertion output.

- [ ] **Step 5: Commit the pure animation foundation**

```powershell
git add pixel-art.js pixel-art.test.js
git commit -m "feat: add pixel animation foundation"
```

---

### Task 2: Detailed Adventurer and Weapon Rendering

**Files:**
- Modify: `pixel-art.js`
- Modify: `pixel-art.test.js`

**Interfaces:**
- Consumes: `{ x, y, scale, weapon, frame, pose, hitFlash, reducedMotion }`.
- Produces: `PixelArt.drawHero(ctx, model)`, `PixelArt.drawBasicAttack(ctx, effect, now)`, `PixelArt.drawSkillEffect(ctx, effect, now)`, and `PixelArt.drawEffect(ctx, effect, now)`.

- [ ] **Step 1: Add a recording Canvas context and failing hero tests**

```js
function recordingContext() {
  const operations = [];
  return {
    operations,
    imageSmoothingEnabled: true,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect(x, y, width, height) {
      operations.push(['fillRect', x, y, width, height, this.fillStyle]);
    },
    beginPath() { operations.push(['beginPath']); },
    arc(x, y, radius, from, to) { operations.push(['arc', x, y, radius, from, to]); },
    stroke() { operations.push(['stroke', this.strokeStyle]); },
    save() {},
    restore() {},
  };
}

for (const weapon of ['sword', 'staff', 'crossbow']) {
  const ctx = recordingContext();
  PixelArt.drawHero(ctx, { x: 80, y: 250, scale: 2, weapon, frame: 0, pose: 'idle' });
  assert.equal(ctx.imageSmoothingEnabled, false);
  assert.ok(ctx.operations.filter(operation => operation[0] === 'fillRect').length >= 30);
}

const fallback = recordingContext();
PixelArt.drawHero(fallback, { x: 80, y: 250, scale: 2, weapon: 'unknown', frame: 0 });
assert.ok(fallback.operations.some(operation => operation.includes('#e7ece7')));
```

- [ ] **Step 2: Run the tests and verify `drawHero` is undefined**

Run the Task 1 test command.

Expected: FAIL with `PixelArt.drawHero is not a function`.

- [ ] **Step 3: Add rectangle sprites and the shared integer renderer**

Use named palette keys so the hit-flash palette can replace body and armor colors without mutating sprite geometry:

```js
const HERO_PARTS = [
  [8, 0, 12, 2, 'hairLight'], [5, 2, 18, 3, 'hair'],
  [3, 5, 22, 3, 'hairShadow'], [6, 9, 13, 10, 'skin'],
  [15, 10, 4, 3, 'emberEye'], [19, 9, 6, 10, 'mask'],
  [1, 19, 8, 7, 'brass'], [22, 19, 8, 7, 'brass'],
  [8, 19, 15, 16, 'armor'], [11, 21, 9, 8, 'armorShadow'],
  [0, 21, 7, 20, 'cloak'], [9, 37, 6, 8, 'trousers'],
  [18, 37, 6, 8, 'trousers'], [8, 44, 8, 4, 'boot'],
  [18, 44, 8, 4, 'boot'],
];

function drawParts(ctx, parts, x, y, scale, palette, offsetY = 0) {
  ctx.imageSmoothingEnabled = false;
  for (const [px, py, width, height, color] of parts) {
    ctx.fillStyle = palette[color] || color;
    ctx.fillRect(
      Math.round(x + px * scale),
      Math.round(y + (py + offsetY) * scale),
      width * scale,
      height * scale
    );
  }
}
```

Add separate `SWORD_PARTS`, `STAFF_PARTS`, and `CROSSBOW_PARTS`. `drawHero` selects the weapon with `WEAPON_PARTS[model.weapon] || SWORD_PARTS`, uses one-pixel breathing offsets, offsets the torn cloak on frames 2 and 3, and swaps armor/skin to warm white for `hitFlash`.

- [ ] **Step 4: Implement weapon-specific basic attack effects**

```js
function drawBasicAttack(ctx, effect, now) {
  const progress = normalizedProgress(now, effect.startTime, effect.duration);
  const type = ['sword', 'staff', 'crossbow'].includes(effect.weapon) ? effect.weapon : 'sword';
  if (type === 'sword') drawSwordArc(ctx, effect, progress);
  if (type === 'staff') drawRuneProjectile(ctx, effect, progress);
  if (type === 'crossbow') drawBoltTrail(ctx, effect, progress);
}
```

Use warm-white and orange concentric arcs for the sword, cyan square runes plus a purple impact ring for the staff, and a brass arrow with two cyan trail segments for the crossbow.

- [ ] **Step 5: Implement the five-stage skill effect and effect router**

```js
function drawSkillEffect(ctx, effect, now) {
  const progress = normalizedProgress(now, effect.startTime, effect.duration);
  if (progress < 0.2) return drawGroundRune(ctx, effect, progress / 0.2);
  if (progress < 0.4) return drawHandCharge(ctx, effect, (progress - 0.2) / 0.2);
  if (progress < 0.72) return drawFireLance(ctx, effect, (progress - 0.4) / 0.32);
  if (progress < 0.84) return drawImpactCore(ctx, effect, (progress - 0.72) / 0.12);
  return drawShockwave(ctx, effect, (progress - 0.84) / 0.16);
}

function drawEffect(ctx, effect, now) {
  if (effect.type === 'basic-attack') drawBasicAttack(ctx, effect, now);
  if (effect.type === 'skill') drawSkillEffect(ctx, effect, now);
  if (effect.type === 'debris') drawDebris(ctx, effect, now);
}

function drawDebris(ctx, effect, now) {
  const progress = normalizedProgress(now, effect.startTime, effect.duration);
  for (let index = 0; index < 6; index++) {
    const direction = index % 2 === 0 ? -1 : 1;
    ctx.fillStyle = index % 2 === 0 ? '#fff0c7' : '#f58b4a';
    ctx.fillRect(
      Math.round(effect.x + direction * progress * (8 + index * 2)),
      Math.round(effect.y - progress * (10 + index * 2) + index * 2),
      3,
      3
    );
  }
}
```

The five skill stages use ground cyan runes, a warm-white hand charge, an orange fire lance, a white impact core, and a purple/orange square shockwave. Every stage reads `progress`; none schedules timers or damage.

- [ ] **Step 6: Run tests and add explicit weapon-difference assertions**

```js
const signatures = ['sword', 'staff', 'crossbow'].map(weapon => {
  const ctx = recordingContext();
  PixelArt.drawHero(ctx, { x: 0, y: 0, scale: 2, weapon, frame: 0 });
  return JSON.stringify(ctx.operations);
});
assert.equal(new Set(signatures).size, 3);
```

Run the Task 1 test command. Expected: exit code 0.

- [ ] **Step 7: Commit adventurer, weapon, and skill art**

```powershell
git add pixel-art.js pixel-art.test.js
git commit -m "feat: draw pixel hero and weapon attacks"
```

---

### Task 3: Enemy, Status, Telegraph, and Boss Rendering

**Files:**
- Modify: `pixel-art.js`
- Modify: `pixel-art.test.js`

**Interfaces:**
- Consumes: `{ kind, x, y, scale, frame, hitFlash, burn, slowed, telegraph, bossPhase }`.
- Produces: `PixelArt.drawEnemy(ctx, model)`, `PixelArt.drawStatusEffects(ctx, model, now)`, and `PixelArt.drawTelegraph(ctx, model, now)`.

- [ ] **Step 1: Write failing tests for all enemy silhouettes and fallback behavior**

```js
const enemyKinds = ['servant', 'hound', 'guard', 'boss'];
const enemySignatures = enemyKinds.map(kind => {
  const ctx = recordingContext();
  PixelArt.drawEnemy(ctx, { kind, x: 200, y: 150, scale: 2, frame: 0 });
  return JSON.stringify(ctx.operations);
});
assert.equal(new Set(enemySignatures).size, 4);

const unknownEnemy = recordingContext();
PixelArt.drawEnemy(unknownEnemy, { kind: 'unknown', x: 0, y: 0, scale: 2, frame: 0 });
const servantEnemy = recordingContext();
PixelArt.drawEnemy(servantEnemy, { kind: 'servant', x: 0, y: 0, scale: 2, frame: 0 });
assert.deepEqual(unknownEnemy.operations, servantEnemy.operations);
```

- [ ] **Step 2: Run tests and verify `drawEnemy` is undefined**

Run the Task 1 test command.

Expected: FAIL with `PixelArt.drawEnemy is not a function`.

- [ ] **Step 3: Implement four enemy rectangle maps**

Create `SERVANT_PARTS`, `HOUND_PARTS`, `GUARD_PARTS`, and `BOSS_PARTS` with these required identifying colors and shapes:

```js
const ENEMY_PALETTES = {
  servant: { body: '#604139', eye: '#f3c95a', core: '#d35e43', weapon: '#b5aea0' },
  hound: { body: '#4d4058', mane: '#9770b8', eye: '#f3c95a', claw: '#d7c9df' },
  guard: { armor: '#6f6950', brass: '#a08247', eye: '#f3c95a', spear: '#c6b178' },
  boss: { armor: '#44384d', rift: '#b68cff', eye: '#f3c95a', staff: '#a675b7' },
};
```

The servant must include a short blade and glowing chest core; the hound must be horizontally wider than tall; the guard must include a left tower shield and right spear; the boss must include horned crown, detached shoulders, core, and staff.

- [ ] **Step 4: Add status and telegraph rendering**

```js
function drawStatusEffects(ctx, model, now) {
  if (model.burnUntil > now) drawPixelFlames(ctx, model.x, model.y, model.scale, frameAt(now, 0, 12, 4));
  if (model.slowedUntil > now) drawCyanRuneRing(ctx, model.x, model.y, model.scale, frameAt(now, 0, 12, 4));
}

function drawTelegraph(ctx, model, now) {
  if (!model.telegraph || model.telegraph.endsAt <= now) return;
  const progress = normalizedProgress(now, model.telegraph.startsAt, model.telegraph.endsAt - model.telegraph.startsAt);
  drawDangerPixels(ctx, model.telegraph, progress);
}
```

Use red for servant slashes, purple forward silhouettes for hound leaps, yellow spear-tip lines for guard thrusts, and expanding orange squares for the boss area burst.

- [ ] **Step 5: Add tests that status and boss-phase colors are emitted**

```js
const statusCtx = recordingContext();
PixelArt.drawStatusEffects(statusCtx, { x: 100, y: 100, scale: 2, burnUntil: 5000, slowedUntil: 5000 }, 1000);
assert.ok(statusCtx.operations.some(operation => operation.includes('#f58b4a')));
assert.ok(statusCtx.operations.some(operation => operation.includes('#66d3c2')));

const bossPhaseCtx = recordingContext();
PixelArt.drawEnemy(bossPhaseCtx, { kind: 'boss', x: 0, y: 0, scale: 2, frame: 0, bossPhase: 2 });
assert.ok(bossPhaseCtx.operations.some(operation => operation.includes('#f58b4a')));
```

Run the Task 1 test command. Expected: exit code 0.

- [ ] **Step 6: Commit enemy and status art**

```powershell
git add pixel-art.js pixel-art.test.js
git commit -m "feat: draw pixel enemies and status cues"
```

---

### Task 4: Pure Combat Visual State Bridge

**Files:**
- Create: `combat-visual-state.js`
- Create: `combat-visual-state.test.js`

**Interfaces:**
- Consumes: combat events emitted by `game.js`.
- Produces: `CombatVisualState.create(now, reducedMotion)`, `recordAttack(state, event)`, `recordSkill(state, event)`, `recordHit(state, event)`, `pause(state, now)`, `resume(state, now)`, and `visualNow(state, now)`.

- [ ] **Step 1: Write failing tests for event shape, effect cap, and pause offsets**

```js
const assert = require('assert');
const Visuals = require('./combat-visual-state.js');

let visual = Visuals.create(1000, false);
visual = Visuals.recordAttack(visual, {
  weapon: 'staff', from: { x: 82, y: 252 }, to: { x: 240, y: 125 }, now: 1100,
});
assert.equal(visual.effects[0].type, 'basic-attack');
assert.equal(visual.effects[0].weapon, 'staff');
assert.equal(visual.effects[0].duration, 420);

visual = Visuals.recordSkill(visual, {
  from: { x: 82, y: 252 }, to: { x: 240, y: 125 }, now: 1150,
});
assert.equal(visual.effects[1].type, 'skill');
assert.equal(visual.effects[1].duration, 700);

visual = Visuals.pause(visual, 1200);
assert.equal(Visuals.visualNow(visual, 1700), 1200);
visual = Visuals.resume(visual, 1800);
assert.equal(Visuals.visualNow(visual, 1900), 1300);

let reduced = Visuals.create(0, true);
reduced = Visuals.recordHit(reduced, { targetId: '1-0', x: 200, y: 120, now: 100 });
assert.equal(reduced.effects.filter(effect => effect.type === 'debris').length, 0);
assert.equal(reduced.effects.filter(effect => effect.type === 'hit-flash').length, 1);
```

- [ ] **Step 2: Run the tests and verify the bridge module is missing**

Run:

```powershell
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' combat-visual-state.test.js
```

Expected: FAIL with `Cannot find module './combat-visual-state.js'`.

- [ ] **Step 3: Implement immutable state transitions**

```js
function create(now = 0, reducedMotion = false) {
  return { effects: [], startedAt: now, pausedAt: null, pausedDuration: 0, reducedMotion };
}

function visualNow(state, now) {
  const end = state.pausedAt === null ? now : state.pausedAt;
  return end - state.pausedDuration;
}

function pause(state, now) {
  return state.pausedAt === null ? { ...state, pausedAt: now } : state;
}

function resume(state, now) {
  if (state.pausedAt === null) return state;
  return { ...state, pausedDuration: state.pausedDuration + now - state.pausedAt, pausedAt: null };
}
```

Wrap the module for Node and the browser, accepting `PixelArt` as its only dependency:

```js
(function (root, factory) {
  const pixelArt = typeof module === 'object' && module.exports ? require('./pixel-art.js') : root.PixelArt;
  const api = factory(pixelArt);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CombatVisualState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (PixelArt) {
  function add(state, effect) {
    return { ...state, effects: PixelArt.appendEffect(state.effects, effect, 32) };
  }

  return { create, visualNow, pause, resume, recordAttack, recordSkill, recordHit };
});
```

Use a shared `add(state, effect)` helper that delegates to `PixelArt.appendEffect`. Convert every incoming `event.now` to `visualNow(state, event.now)` before assigning `startTime`, so effects created after a pause share the same timeline as existing effects. Use these exact effect records:

```js
function recordAttack(state, event) {
  return add(state, {
    type: 'basic-attack', weapon: event.weapon,
    from: event.from, to: event.to,
    startTime: visualNow(state, event.now), duration: 420,
  });
}

function recordSkill(state, event) {
  return add(state, {
    type: 'skill', from: event.from, to: event.to,
    startTime: visualNow(state, event.now), duration: 700,
  });
}

function recordHit(state, event) {
  const startTime = visualNow(state, event.now);
  let next = add(state, {
    type: 'hit-flash', targetId: event.targetId,
    startTime, duration: 90,
  });
  if (!state.reducedMotion) {
    next = add(next, { type: 'debris', x: event.x, y: event.y, startTime, duration: 260 });
  }
  return next;
}
```

- [ ] **Step 4: Add the browser UMD wrapper and run both test files**

Run:

```powershell
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' pixel-art.test.js
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' combat-visual-state.test.js
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit the visual state bridge**

```powershell
git add combat-visual-state.js combat-visual-state.test.js
git commit -m "feat: add combat visual event state"
```

---

### Task 5: Integrate Pixel Rendering With Existing Combat

**Files:**
- Modify: `game.js:5-36`
- Modify: `index.html:31-53`

**Interfaces:**
- Consumes: `PixelArt` and `CombatVisualState` globals from Tasks 1-4.
- Produces: animated battle rendering while preserving all existing combat outcomes.

- [ ] **Step 1: Add stable enemy kind identifiers and visual state initialization**

Extend `enemyKinds` with `kind: 'servant'`, `kind: 'hound'`, and `kind: 'guard'`; keep each runtime enemy's existing `id` as its unique instance identifier. Set the boss enemy `kind: 'boss'`. Add visual state without changing saved data:

```js
let save = { ...defaultSave };
let state = {
  floor: 1, route: null, weapon: 'sword', hp: 100, maxHp: 100,
  gold: 0, enemies: [], running: false, paused: false, skillReady: true,
  perks: [], visuals: CombatVisualState.create(performance.now(), matchMedia('(prefers-reduced-motion: reduce)').matches),
};
```

Recreate `state.visuals` inside `startRun` so effects from the previous run cannot survive into a new challenge:

```js
visuals: CombatVisualState.create(
  performance.now(),
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
),
```

- [ ] **Step 2: Emit visual events from existing damage paths**

In `autoAttack`, record one basic attack before damage is settled:

```js
state.visuals = CombatVisualState.recordAttack(state.visuals, {
  weapon: state.weapon,
  from: { x: 82, y: 252 },
  to: { x: target.x, y: target.y },
  now,
});
```

In `damageEnemy`, record `hit-flash` only for damage greater than zero:

```js
if (damage > 0) {
  state.visuals = CombatVisualState.recordHit(state.visuals, {
    targetId: target.id,
    x: target.x,
    y: target.y,
    now,
  });
}
```

In `castSkill`, record one skill effect with `from`, `to`, and `now` before `damageEnemy`. Do not call combat damage from an animation callback.

- [ ] **Step 3: Represent enemy attack timing as visual telegraphs**

Initialize `state.lastEnemyHit = performance.now()` in `beginBattle`, which preserves the existing 1100 ms attack interval while giving the first attack the same warning as later attacks. During each tick, create a telegraph only when the attacker is within 450 ms of its existing attack threshold. Keep the existing damage interval authoritative:

```js
const enemyInterval = CombatLogic.getEnemyAttackInterval(attacker, now);
const elapsed = now - state.lastEnemyHit;
const visualTime = CombatVisualState.visualNow(state.visuals, now);
if (elapsed >= enemyInterval - 450 && elapsed < enemyInterval && !attacker.telegraph) {
  attacker.telegraph = {
    startsAt: visualTime,
    endsAt: visualTime + (enemyInterval - elapsed),
    shape: attacker.kind === 'hound' ? 'leap' : attacker.boss ? 'boss-area' : 'strike',
  };
}
```

Clear `attacker.telegraph` immediately after the existing damage subtraction. Do not delay or duplicate damage to fit the animation.

- [ ] **Step 4: Replace circle rendering with layered pixel drawing**

Keep the tower background and call the renderer in this order:

```js
const visualTime = CombatVisualState.visualNow(state.visuals, performance.now());
PixelArt.drawHero(ctx, {
  x: 54, y: 210, scale: 2, weapon: state.weapon,
  frame: PixelArt.frameAt(visualTime, state.visuals.startedAt, 12, 4),
  pose: state.visuals.effects.some(effect => effect.type === 'basic-attack') ? 'attack' : 'idle',
  reducedMotion: state.visuals.reducedMotion,
});

for (const enemy of state.enemies) {
  if (enemy.hp <= 0) continue;
  PixelArt.drawEnemy(ctx, {
    kind: enemy.boss ? 'boss' : enemy.kind,
    x: enemy.x - 18, y: enemy.y - 42, scale: enemy.boss ? 2 : 1,
    frame: PixelArt.frameAt(visualTime, state.visuals.startedAt, 12, 4),
    hitFlash: state.visuals.effects.some(effect => effect.type === 'hit-flash' && effect.targetId === enemy.id && visualTime < effect.startTime + effect.duration),
    bossPhase: enemy.boss && enemy.hp / enemy.maxHp <= 0.5 ? 2 : 1,
  });
  PixelArt.drawStatusEffects(ctx, enemy, visualTime);
  PixelArt.drawTelegraph(ctx, enemy, visualTime);
}

state.visuals.effects = PixelArt.pruneEffects(state.visuals.effects, visualTime);
state.visuals.effects.forEach(effect => PixelArt.drawEffect(ctx, effect, visualTime));
```

Draw health bars and the yellow priority ring after sprites so they stay readable.

Remove the old generic timer-based red circle from `drawArenaSignals`; enemy-specific telegraphs now provide the red danger language. Preserve the blue buff area, purple rift, and yellow priority target.

- [ ] **Step 5: Move visual animation to `requestAnimationFrame`**

Leave `setInterval(tick, 90)` for combat logic. Add one animation loop per active battle:

```js
function renderCombatFrame() {
  if (!state.running) return;
  if (!state.paused) {
    drawArena();
    drawArenaSignals();
  }
  state.animationFrame = requestAnimationFrame(renderCombatFrame);
}
```

Cancel `state.animationFrame` in `finish` and before starting another battle. Remove the duplicate `drawArena()` calls from `tick`.

- [ ] **Step 6: Wire pause and resume to visual time only**

```js
state.visuals = CombatVisualState.pause(state.visuals, performance.now());
state.paused = true;
```

On resume, call `CombatVisualState.resume` before clearing `state.paused`. Leave the existing skill cooldown behavior unchanged because cooldown rules are outside this art scope.

- [ ] **Step 7: Load modules in browser order**

Update the scripts at the end of `index.html`:

```html
<script src="combat-logic.js?v=8"></script>
<script src="pixel-art.js?v=8"></script>
<script src="combat-visual-state.js?v=8"></script>
<script src="game.js?v=8"></script>
```

- [ ] **Step 8: Run syntax checks and all unit tests**

```powershell
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check pixel-art.js
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check combat-visual-state.js
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check game.js
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' pixel-art.test.js
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' combat-visual-state.test.js
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' combat-effects.test.js
```

Expected: all syntax commands exit 0 and all three test files pass.

- [ ] **Step 9: Commit combat integration**

```powershell
git add game.js index.html
git commit -m "feat: integrate animated pixel combat"
```

---

### Task 6: Offline Cache and Mobile Browser Verification

**Files:**
- Modify: `sw.js`
- Verify: `index.html`, `styles.css`, `game.js`, `pixel-art.js`, `combat-visual-state.js`

**Interfaces:**
- Consumes: final versioned static assets from Task 5.
- Produces: an offline-capable V8 build verified at 390 x 844.

- [ ] **Step 1: Update the Service Worker cache manifest**

```js
const CACHE = 'ash-corridor-v8';
const ASSETS = [
  './', './index.html', './styles.css?v=5', './combat-logic.js?v=8',
  './pixel-art.js?v=8', './combat-visual-state.js?v=8', './game.js?v=8',
  './manifest.json',
];
```

Keep the existing cache cleanup and network fallback behavior.

- [ ] **Step 2: Run the complete command-line verification suite**

Run all commands from Task 5 Step 8 and add:

```powershell
& 'C:\Users\LENOVO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check sw.js
```

Expected: every command exits 0.

- [ ] **Step 3: Verify all static assets return HTTP 200**

With the existing server at `http://127.0.0.1:4173/`, request:

```powershell
$assets = 'index.html','styles.css','combat-logic.js','pixel-art.js','combat-visual-state.js','game.js','manifest.json','sw.js'
$assets | ForEach-Object {
  $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:4173/$_"
  [PSCustomObject]@{ Asset = $_; Status = $response.StatusCode }
}
```

Expected: status 200 for all eight files.

- [ ] **Step 4: Run browser interaction checks at 390 x 844**

Use the in-app browser viewport capability and verify:

- Select each weapon and start a middle-route battle; the header retains the selected weapon.
- The Canvas is nonblank and two screenshots 500 ms apart differ while combat is active.
- Each weapon produces a visually distinct basic attack.
- Casting the skill shows charge, projectile, and impact without applying damage twice.
- Enemy red telegraphs appear before enemy damage logs.
- Burning and slowed status visuals remain visible with the yellow target outline.
- Pause freezes visual motion; resume restarts it.
- `document.documentElement.scrollWidth === document.documentElement.clientWidth`.
- Browser console contains no errors or warnings during one complete floor.

- [ ] **Step 5: Verify reduced-motion behavior through the pure state tests**

Run `combat-visual-state.test.js` and confirm its explicit `create(0, true)` assertions remove decorative debris while retaining `hit-flash`. Run `pixel-art.test.js` and confirm a hero rendered with `reducedMotion: true` uses frame 0 for breathing and cloak offsets while telegraph and skill draw calls still emit operations.

- [ ] **Step 6: Verify offline reload**

After the V8 Service Worker activates, stop the local HTTP server, reload the open page, and confirm the menu and all four versioned JavaScript files load from cache. Restart the server at `http://127.0.0.1:4173/` before handoff.

- [ ] **Step 7: Commit cache changes**

```powershell
git add sw.js
git commit -m "chore: cache pixel combat assets offline"
```

- [ ] **Step 8: Final review**

Run `git status --short`, inspect `git diff 50b67a6..HEAD`, and confirm no `.superpowers/` visual-companion files, exported screenshots, or unrelated user files were committed.
