const assert = require('assert');
const TowerData = require('./tower-data.js');

assert.equal(TowerData.getChapterForFloor(1).id, 'ember');
assert.equal(TowerData.getChapterForFloor(19).id, 'frost');
assert.equal(TowerData.getChapterForFloor(20).id, 'frost');
assert.equal(TowerData.getBossForFloor(10).id, 'furnace-lord');
assert.equal(TowerData.getBossForFloor(20).id, 'frost-queen');
assert.equal(TowerData.getBossForFloor(11), null);
assert.equal(TowerData.getEnemyPool(12).length, 3);
assert.notEqual(TowerData.getEnemyPool(2)[0].id, TowerData.getEnemyPool(12)[0].id);

console.log('tower data tests passed');
