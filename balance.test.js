const assert = require('assert');
const TowerData = require('./tower-data.js');

assert.deepEqual(TowerData.validate(), { valid: true, errors: [] });
let previous = TowerData.getDifficultyForFloor(1);
for (let floor = 1; floor <= 50; floor += 1) {
  assert.ok(TowerData.getChapterForFloor(floor));
  assert.ok(TowerData.getEnemyPool(floor).length >= 3);
  const current = TowerData.getDifficultyForFloor(floor);
  assert.ok(current.enemyHp >= previous.enemyHp || floor === 1);
  assert.ok(current.enemyDamage >= previous.enemyDamage || floor === 1);
  previous = current;
}
assert.equal(TowerData.getBossForFloor(10).id, 'furnace-lord');
assert.equal(TowerData.getBossForFloor(50).id, 'void-pioneer');
console.log('balance tests passed');
