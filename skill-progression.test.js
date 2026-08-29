const assert = require('assert');
const SkillProgression = require('./skill-progression.js');

const definition = SkillProgression.getSkillDefinition('sword', 'sword-slash');
assert.equal(definition.name, '裂地斩');
assert.equal(definition.branches.length, 2);

const base = { weapon: 'sword', skillId: 'sword-slash', level: 1, branch: null };
const levelTwo = SkillProgression.upgradeSkill(base);
assert.deepEqual(levelTwo, { weapon: 'sword', skillId: 'sword-slash', level: 2, branch: null });
assert.equal(base.level, 1, '升级不能修改原对象');

assert.throws(() => SkillProgression.upgradeSkill(levelTwo, 'unknown'), /invalid branch/);
const power = SkillProgression.upgradeSkill(levelTwo, 'quake');
const guard = SkillProgression.upgradeSkill(levelTwo, 'bulwark');
assert.equal(power.level, 3);
assert.equal(power.branch, 'quake');
assert.equal(guard.branch, 'bulwark');

const powerEffect = SkillProgression.getSkillEffect(power);
const guardEffect = SkillProgression.getSkillEffect(guard);
assert.ok(powerEffect.damageMultiplier > guardEffect.damageMultiplier);
assert.ok(guardEffect.reductionMultiplier > powerEffect.reductionMultiplier);
assert.deepEqual(SkillProgression.upgradeSkill(power, 'bulwark'), power);

const crossbow = SkillProgression.getSkillDefinition('crossbow', 'crossbow-volley');
assert.equal(crossbow.branches.length, 2);
assert.throws(() => SkillProgression.getSkillDefinition('sword', 'missing'), /unknown skill/);

console.log('skill progression tests passed');
