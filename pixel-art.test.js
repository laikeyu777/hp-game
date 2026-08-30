const assert = require('assert');
const PixelArt = require('./pixel-art.js');

assert.equal(PixelArt.frameAt(0, 0, 12, 4), 0);
assert.equal(PixelArt.frameAt(250, 0, 12, 4), 3);
assert.equal(PixelArt.frameAt(350, 0, 12, 4), 0);
assert.equal(PixelArt.normalizedProgress(50, 100, 200), 0);
assert.equal(PixelArt.normalizedProgress(200, 100, 200), 0.5);
assert.equal(PixelArt.normalizedProgress(400, 100, 200), 1);
assert.equal(PixelArt.normalizedProgress(100, 100, 0), 1);

let effects = [];
for (let index = 0; index < 35; index += 1) {
  effects = PixelArt.appendEffect(effects, { id: index, startTime: index, duration: 1000 }, 32);
}
assert.equal(effects.length, 32);
assert.equal(effects[0].id, 3);
assert.deepEqual(PixelArt.pruneEffects(effects, 1031).map(effect => effect.id), [32, 33, 34]);

const prioritized = Array.from({ length: 32 }, (_, id) => ({ id, type: id === 10 ? 'debris' : 'skill' }));
const prioritizedNext = PixelArt.appendEffect(prioritized, { id: 32, type: 'hit-flash' }, 32);
assert.equal(prioritizedNext.some(effect => effect.id === 10), false);
assert.equal(prioritizedNext.some(effect => effect.id === 0), true);

function recordingContext() {
  const operations = [];
  return {
    operations,
    imageSmoothingEnabled: true,
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    fillRect(x, y, width, height) { operations.push(['fillRect', x, y, width, height, this.fillStyle]); },
    strokeRect(x, y, width, height) { operations.push(['strokeRect', x, y, width, height, this.strokeStyle]); },
    beginPath() { operations.push(['beginPath']); },
    arc(x, y, radius, from, to) { operations.push(['arc', x, y, radius, from, to]); },
    moveTo(x, y) { operations.push(['moveTo', x, y]); },
    lineTo(x, y) { operations.push(['lineTo', x, y]); },
    closePath() { operations.push(['closePath']); },
    stroke() { operations.push(['stroke', this.strokeStyle]); },
    fill() { operations.push(['fill', this.fillStyle]); },
    save() { operations.push(['save']); },
    restore() { operations.push(['restore']); },
  };
}

const heroSignatures = ['sword', 'staff', 'crossbow'].map(weapon => {
  const ctx = recordingContext();
  PixelArt.drawHero(ctx, { x: 80, y: 250, scale: 2, weapon, frame: 0, pose: 'idle' });
  assert.equal(ctx.imageSmoothingEnabled, false);
  assert.ok(ctx.operations.filter(operation => operation[0] === 'fillRect').length >= 30);
  assert.ok(ctx.operations.some(operation => operation.includes('#d8b071')));
  return JSON.stringify(ctx.operations);
});
assert.equal(new Set(heroSignatures).size, 3);

const fallback = recordingContext();
PixelArt.drawHero(fallback, { x: 80, y: 250, scale: 2, weapon: 'unknown', frame: 0 });
assert.ok(fallback.operations.some(operation => operation.includes('#e7ece7')));

for (const weapon of ['sword', 'staff', 'crossbow']) {
  const ctx = recordingContext();
  PixelArt.drawBasicAttack(ctx, { weapon, from: { x: 82, y: 252 }, to: { x: 240, y: 125 }, startTime: 0, duration: 420 }, 210);
  assert.ok(ctx.operations.length > 3);
}

for (const now of [50, 180, 390, 550, 670]) {
  const ctx = recordingContext();
  PixelArt.drawSkillEffect(ctx, { from: { x: 82, y: 252 }, to: { x: 240, y: 125 }, startTime: 0, duration: 700 }, now);
  assert.ok(ctx.operations.length > 0);
}

const attackKinds = ['servant', 'hound', 'guard', 'boss'];
const attackSignatures = attackKinds.map(kind => {
  const ctx = recordingContext();
  PixelArt.drawEnemyAttack(ctx, { kind, from: { x: 220, y: 150 }, to: { x: 82, y: 252 }, startTime: 0, duration: 420 }, 210);
  assert.ok(ctx.operations.length > 0);
  return JSON.stringify(ctx.operations);
});
assert.equal(new Set(attackSignatures).size, 4);

const reducedAttack = recordingContext();
PixelArt.drawEnemyAttack(reducedAttack, { kind: 'hound', from: { x: 220, y: 150 }, to: { x: 82, y: 252 }, startTime: 0, duration: 320, reducedMotion: true }, 160);
assert.equal(reducedAttack.operations.some(operation => operation.includes('afterimage')), false);
assert.ok(reducedAttack.operations.length > 0);

const enemySignatures = ['servant', 'hound', 'guard', 'boss'].map(kind => {
  const ctx = recordingContext();
  PixelArt.drawEnemy(ctx, { kind, x: 200, y: 150, scale: 2, frame: 0, bossPhase: kind === 'boss' ? 2 : 1 });
  assert.ok(ctx.operations.filter(operation => operation[0] === 'fillRect').length >= 12);
  assert.ok(ctx.operations.some(operation => operation.includes('#d8b071')));
  return JSON.stringify(ctx.operations);
});
assert.equal(new Set(enemySignatures).size, 4);

for (const kind of ['ice-wraith', 'frost-wolf', 'cold-guard', 'furnace-lord', 'frost-queen', 'root-mother', 'sky-executioner', 'void-pioneer']) {
  const ctx = recordingContext();
  PixelArt.drawEnemy(ctx, { kind, x: 200, y: 150, scale: 1, frame: 0, bossPhase: 1 });
  assert.ok(ctx.operations.filter(operation => operation[0] === 'fillRect').length >= 12);
}

const unknownEnemy = recordingContext();
PixelArt.drawEnemy(unknownEnemy, { kind: 'unknown', x: 0, y: 0, scale: 2, frame: 0 });
const servantEnemy = recordingContext();
PixelArt.drawEnemy(servantEnemy, { kind: 'servant', x: 0, y: 0, scale: 2, frame: 0 });
assert.deepEqual(unknownEnemy.operations, servantEnemy.operations);

const statusCtx = recordingContext();
PixelArt.drawStatusEffects(statusCtx, { x: 100, y: 100, scale: 2, burnUntil: 5000, slowedUntil: 5000 }, 1000);
assert.ok(statusCtx.operations.some(operation => operation.includes('#f58b4a')));
assert.ok(statusCtx.operations.some(operation => operation.includes('#66d3c2')));

const telegraphCtx = recordingContext();
PixelArt.drawTelegraph(telegraphCtx, { x: 200, y: 100, scale: 2, telegraph: { startsAt: 0, endsAt: 500, shape: 'strike' } }, 250);
assert.ok(telegraphCtx.operations.some(operation => operation.includes('#e76864')));
