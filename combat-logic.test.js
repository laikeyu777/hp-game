const assert = require('assert');
const CombatLogic = require('./combat-logic.js');

assert.equal(CombatLogic.isEncounterCleared([{ hp: 0 }, { hp: -4 }]), true);
assert.equal(CombatLogic.isEncounterCleared([{ hp: 1 }, { hp: 0 }]), false);
assert.equal(CombatLogic.isEncounterCleared([{ hp: NaN }]), true);
assert.equal(CombatLogic.isEncounterCleared([]), false);
assert.equal(CombatLogic.shouldFinishEncounter({ running: true, finishing: false, enemies: [{ hp: 0 }] }), true);
assert.equal(CombatLogic.shouldFinishEncounter({ running: false, finishing: false, enemies: [{ hp: 0 }] }), false);
assert.equal(CombatLogic.shouldFinishEncounter({ running: true, finishing: true, enemies: [{ hp: 0 }] }), false);
assert.equal(CombatLogic.shouldFinishEncounter({ running: true, finishing: false, enemies: [{ hp: 1 }] }), false);

assert.equal(CombatLogic.shouldSubmitRunResult(true, 1), false);
assert.equal(CombatLogic.shouldSubmitRunResult(true, 49), false);
assert.equal(CombatLogic.shouldSubmitRunResult(true, 50), true);
assert.equal(CombatLogic.shouldSubmitRunResult(false, 12), true);
assert.equal(CombatLogic.getCompletedFloor(true, 1), 1);
assert.equal(CombatLogic.getCompletedFloor(true, 12), 12);
assert.equal(CombatLogic.getCompletedFloor(false, 12), 11);
assert.equal(CombatLogic.getCompletedFloor(false, 1), 0);

assert.equal(CombatLogic.getIncomingDamage(100, [], 1, 1), 100);
assert.equal(CombatLogic.getIncomingDamage(100, ['guard'], 1, 1), 88);
assert.equal(CombatLogic.getIncomingDamage(100, ['guard'], 0.9, 0.8), 63.36);

assert.equal(CombatLogic.getAttackInterval(1000, []), 1000);
assert.equal(CombatLogic.getAttackInterval(1000, ['speed']), 820);
assert.equal(CombatLogic.getComboMultiplier(0), 1);
assert.equal(CombatLogic.getComboMultiplier(20), 1.5);
assert.equal(CombatLogic.recoverAfterFloor(40, 100), 60);
assert.equal(CombatLogic.recoverAfterFloor(95, 100), 100);

const burningTarget = { hp: 100 };
assert.equal(CombatLogic.applyHitEffects({ target: burningTarget, perks: ['fire'], floor: 3, now: 1000, random: () => 0.24 })[0].type, 'burn-applied');
assert.equal(burningTarget.burnUntil, 5000);
const slowedTarget = { hp: 100 };
assert.equal(CombatLogic.applyHitEffects({ target: slowedTarget, perks: ['skill'], floor: 3, now: 1000, source: 'skill' })[0].type, 'slow-applied');
assert.equal(slowedTarget.slowedUntil, 4000);
const blastTarget = { hp: 0, burnUntil: 5000, x: 0, y: 0 };
const blastVictim = { hp: 50, x: 60, y: 0 };
const blastEvents = CombatLogic.resolveDefeat({ target: blastTarget, enemies: [blastTarget, blastVictim], perks: ['blast'], floor: 5 });
assert.equal(blastEvents[0].damage, 10);
assert.equal(blastVictim.hp, 40);

const first = CombatLogic.createSettlementGate();
assert.equal(first.claim(), true);
assert.equal(first.claim(), false);
assert.equal(first.isClaimed(), true);
console.log('combat settlement tests passed');
