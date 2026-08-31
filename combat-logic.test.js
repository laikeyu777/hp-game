const assert = require('assert');
const CombatLogic = require('./combat-logic.js');

assert.equal(CombatLogic.isEncounterCleared([{ hp: 0 }, { hp: -4 }]), true);
assert.equal(CombatLogic.isEncounterCleared([{ hp: 1 }, { hp: 0 }]), false);
assert.equal(CombatLogic.isEncounterCleared([{ hp: NaN }]), true);
assert.equal(CombatLogic.isEncounterCleared([]), false);

const first = CombatLogic.createSettlementGate();
assert.equal(first.claim(), true);
assert.equal(first.claim(), false);
assert.equal(first.isClaimed(), true);
console.log('combat settlement tests passed');
