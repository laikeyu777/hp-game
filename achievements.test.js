const assert = require('assert');
const Achievements = require('./achievements.js');

const definitions = Achievements.getDefinitions();
assert.ok(definitions.length >= 9);
assert.equal(new Set(definitions.map(item => item.id)).size, definitions.length);

const summary = {
  won: true,
  weapon: 'staff',
  maxBuildCount: 4,
  shopHeals: 0,
  hpRatio: .22,
  bossesDefeated: 5,
  ascension: 5,
};
const unlocked = Achievements.evaluateRun(summary, []);
assert.ok(unlocked.includes('staff-clear'));
assert.ok(unlocked.includes('build-four'));
assert.ok(unlocked.includes('no-shop-heal'));
assert.ok(unlocked.includes('low-hp-clear'));
assert.ok(unlocked.includes('boss-hunter'));
assert.ok(unlocked.includes('ascension-3'));
assert.ok(unlocked.includes('ascension-5'));

const noDuplicates = Achievements.evaluateRun(summary, ['staff-clear', 'build-four']);
assert.ok(!noDuplicates.includes('staff-clear'));
assert.deepEqual(Achievements.mergeProgress(['staff-clear'], ['staff-clear', 'build-four']), ['staff-clear', 'build-four']);
assert.equal(Achievements.getReward(['staff-clear', 'build-four']), 75);

console.log('achievement tests passed');
