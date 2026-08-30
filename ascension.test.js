const assert = require('assert');
const Ascension = require('./ascension.js');

assert.deepEqual(Ascension.getAscensionModifiers(0), { enemyHp: 1, enemyDamage: 1, recovery: 1, shopCost: 1, bossPower: 1 });
const levelFive = Ascension.getAscensionModifiers(5);
assert.ok(levelFive.enemyHp > 1);
assert.ok(levelFive.enemyDamage > 1);
assert.ok(levelFive.recovery < 1);
assert.ok(levelFive.bossPower > levelFive.enemyDamage);
assert.deepEqual(Ascension.getAscensionModifiers(99), Ascension.getAscensionModifiers(10));
assert.equal(Ascension.getNextAscension(0, true), 1);
assert.equal(Ascension.getNextAscension(5, true), 6);
assert.equal(Ascension.getNextAscension(5, false), 5);
assert.equal(Ascension.getNextAscension(10, true), 10);
assert.equal(Ascension.getAscensionLabel(0), '普通冒险');
assert.equal(Ascension.getAscensionLabel(3), '深渊 III');

console.log('ascension tests passed');
