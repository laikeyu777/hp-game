const assert = require('assert');
const CombatLogic = require('./combat-logic.js');

function enemy(overrides = {}) {
  return { id: 1, hp: 40, maxHp: 40, damage: 8, ...overrides };
}

const burned = enemy();
const burnEvents = CombatLogic.applyHitEffects({
  target: burned,
  enemies: [burned],
  perks: ['fire'],
  floor: 3,
  now: 1000,
  random: () => 0.1,
});
assert.equal(burned.burnUntil, 5000);
assert.ok(burnEvents.some(event => event.type === 'burn-applied'));

CombatLogic.applyHitEffects({
  target: burned,
  enemies: [burned],
  perks: ['fire'],
  floor: 3,
  now: 1500,
  random: () => 0.1,
});
assert.equal(burned.nextBurnAt, 2000, '重复点燃不应推迟下一次燃烧伤害');

const burnTick = CombatLogic.tickBurn(burned, 5000, 3);
assert.equal(burned.hp, 34);
assert.ok(burnTick.some(event => event.type === 'burn-tick'));

const empoweredBurn = enemy({ burnUntil: 6000, nextBurnAt: 2000 });
const empoweredTick = CombatLogic.tickBurn(empoweredBurn, 2000, 3, 1.25);
assert.equal(empoweredBurn.hp, 32.5);
assert.equal(empoweredTick[0].damage, 7.5);

const slowed = enemy();
CombatLogic.applyHitEffects({
  target: slowed,
  enemies: [slowed],
  perks: ['skill'],
  floor: 1,
  now: 1000,
  source: 'skill',
  random: () => 0.9,
});
assert.equal(slowed.slowedUntil, 4000);

const blastTarget = enemy({ id: 2, x: 100, y: 100, hp: 10 });
burned.hp = 0;
const blastEvents = CombatLogic.resolveDefeat({
  target: burned,
  enemies: [burned, blastTarget],
  perks: ['blast'],
  floor: 3,
  now: 5000,
});
assert.equal(blastTarget.hp, 2);
assert.ok(blastEvents.some(event => event.type === 'blast'));

assert.equal(CombatLogic.getAttackInterval(1000, ['speed']), 820);
assert.equal(CombatLogic.getEnemyAttackInterval(slowed, 2000), 1540);
assert.equal(CombatLogic.getComboMultiplier(20), 1.5);
assert.equal(CombatLogic.recoverAfterFloor(60, 100), 80);
assert.equal(CombatLogic.recoverAfterFloor(90, 100), 100);
assert.equal(CombatLogic.recoverAfterFloor(60, 120), 84);
assert.equal(CombatLogic.getEnemyDamage(10, 1, false, 0), 10);
assert.equal(CombatLogic.getEnemyDamage(10, 5, false, 0), 12.4);
assert.equal(CombatLogic.getEnemyDamage(10, 5, true, 0), 16.74);
assert.equal(CombatLogic.getEnemyDamage(10, 5, false, 2), 11.16);

const swordSkill = CombatLogic.resolveWeaponSkill({ skill: 'sword-slash', floor: 3, targetHp: 100 });
assert.equal(swordSkill.name, '裂地斩');
assert.equal(swordSkill.damage, 62);
assert.equal(swordSkill.reductionMs, 2200);
const staffSkill = CombatLogic.resolveWeaponSkill({ skill: 'staff-meteor', floor: 3, targetHp: 100 });
assert.equal(staffSkill.name, '星陨术');
assert.equal(staffSkill.splash, true);
const crossbowSkill = CombatLogic.resolveWeaponSkill({ skill: 'crossbow-pierce', floor: 3, targetHp: 100 });
assert.equal(crossbowSkill.name, '穿心矢');
assert.equal(crossbowSkill.damage, 87);
assert.equal(CombatLogic.getBossPhase(800, 1000), 1);
assert.equal(CombatLogic.getBossPhase(500, 1000), 2);
assert.equal(CombatLogic.getBossPhase(300, 1000), 3);
assert.equal(CombatLogic.getBossAction('furnace-lord', 1).type, 'lava-crack');
assert.equal(CombatLogic.getBossAction('frost-queen', 2).type, 'frost-chain');

console.log('combat effects tests passed');
