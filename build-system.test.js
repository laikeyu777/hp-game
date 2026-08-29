const assert = require('assert');
const BuildSystem = require('./build-system.js');

assert.deepEqual(BuildSystem.getPerkTags('crit'), ['crit']);
assert.deepEqual(BuildSystem.getPerkTags('blast'), ['fire']);
assert.deepEqual(BuildSystem.getPerkTags('guard'), ['survival']);
assert.deepEqual(BuildSystem.getPerkTags('unknown'), []);

const state = BuildSystem.getBuildState(['crit', 'combo', 'crit', 'fire', 'blast', 'speed']);
assert.equal(state.counts.crit, 3);
assert.equal(state.counts.fire, 2);
assert.deepEqual(state.activated.crit, [2]);
assert.deepEqual(state.activated.fire, [2]);

const bonuses = BuildSystem.getBuildBonuses(['crit', 'combo', 'crit', 'crit', 'fire', 'blast', 'fire']);
assert.equal(bonuses.critDamage, 1.35);
assert.equal(bonuses.burnSpread, true);
assert.equal(bonuses.burnDamage, 1.25);

const empty = BuildSystem.getBuildBonuses([]);
assert.equal(empty.critDamage, 1);
assert.equal(empty.skillCooldown, 1);
assert.equal(empty.floorRecovery, 0);

console.log('build system tests passed');
