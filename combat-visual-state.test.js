const assert = require('assert');
const Visuals = require('./combat-visual-state.js');

let visual = Visuals.create(1000, false);
visual = Visuals.recordAttack(visual, { weapon: 'staff', from: { x: 82, y: 252 }, to: { x: 240, y: 125 }, now: 1100 });
assert.equal(visual.effects[0].type, 'basic-attack');
assert.equal(visual.effects[0].weapon, 'staff');
assert.equal(visual.effects[0].duration, 420);

visual = Visuals.recordSkill(visual, { from: { x: 82, y: 252 }, to: { x: 240, y: 125 }, now: 1150 });
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

let capped = Visuals.create(0, false);
for (let index = 0; index < 40; index += 1) {
  capped = Visuals.recordAttack(capped, { weapon: 'sword', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, now: index });
}
assert.equal(capped.effects.length, 32);

let enemyAttack = Visuals.recordEnemyAttack(Visuals.create(0, false), { kind: 'guard', from: { x: 220, y: 150 }, to: { x: 82, y: 252 }, now: 50 });
assert.equal(enemyAttack.effects[0].type, 'enemy-attack');
assert.equal(enemyAttack.effects[0].kind, 'guard');
assert.equal(enemyAttack.effects[0].duration, 280);
enemyAttack = Visuals.recordEnemyAttack(enemyAttack, { kind: 'boss', from: { x: 220, y: 150 }, to: { x: 82, y: 252 }, now: 80 });
assert.equal(enemyAttack.effects[1].duration, 420);
