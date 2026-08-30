const assert = require('assert');
const BossMechanics = require('./boss-mechanics.js');

const ids = ['furnace-lord', 'frost-queen', 'root-mother', 'sky-executioner', 'void-pioneer'];
const mechanics = ids.map(id => BossMechanics.getBossMechanic(id, 2));
assert.equal(new Set(mechanics.map(item => item.type)).size, 5);
mechanics.forEach(item => {
  assert.ok(item.telegraphMs >= 700);
  assert.ok(item.intervalMs >= 3000);
});

const first = BossMechanics.createBossEvent('sky-executioner', 3, 1000, 42);
const second = BossMechanics.createBossEvent('sky-executioner', 3, 1000, 42);
assert.deepEqual(first, second);
assert.equal(first.resolvesAt, 1000 + first.telegraphMs);
assert.ok(first.target.radius > 0);

const furnace = BossMechanics.resolveBossEvent(BossMechanics.createBossEvent('furnace-lord', 1, 0, 1), { maxHp: 100 }, { damage: 20 });
assert.ok(furnace.damage > 0);
const frost = BossMechanics.resolveBossEvent(BossMechanics.createBossEvent('frost-queen', 2, 0, 1), { maxHp: 100 }, { damage: 20 });
assert.ok(frost.skillLockMs > 0);
const roots = BossMechanics.resolveBossEvent(BossMechanics.createBossEvent('root-mother', 2, 0, 1), { maxHp: 100 }, { damage: 20 });
assert.equal(roots.summons.length, 1);
const voidResult = BossMechanics.resolveBossEvent(BossMechanics.createBossEvent('void-pioneer', 3, 0, 1), { maxHp: 100 }, { damage: 20 });
assert.equal(voidResult.clone, true);

console.log('boss mechanics tests passed');
