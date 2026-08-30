const assert = require('assert');
const RoomLogic = require('./room-logic.js');

assert.equal(RoomLogic.getRouteRoom('left', () => 0.9), 'elite');
assert.equal(RoomLogic.getRouteRoom('middle', () => 0.1), 'battle');
assert.equal(RoomLogic.getRouteRoom('right', () => 0.1), 'event');
assert.equal(RoomLogic.getRouteRoom('right', () => 0.9), 'shop');

const healed = RoomLogic.purchaseShopItem({
  item: 'heal', gold: 20, hp: 40, maxHp: 100, skillReady: false, eventBuff: false,
});
assert.deepEqual(healed, { ok: true, gold: 8, hp: 75, skillReady: false, eventBuff: false });

const charged = RoomLogic.purchaseShopItem({
  item: 'skill', gold: 10, hp: 100, maxHp: 100, skillReady: false, eventBuff: false,
});
assert.deepEqual(charged, { ok: true, gold: 0, hp: 100, skillReady: true, eventBuff: false });

const buffed = RoomLogic.purchaseShopItem({
  item: 'buff', gold: 18, hp: 100, maxHp: 100, skillReady: true, eventBuff: false,
});
assert.deepEqual(buffed, { ok: true, gold: 0, hp: 100, skillReady: true, eventBuff: true });

const refused = RoomLogic.purchaseShopItem({
  item: 'heal', gold: 11, hp: 20, maxHp: 100, skillReady: false, eventBuff: false,
});
assert.deepEqual(refused, { ok: false, gold: 11, hp: 20, skillReady: false, eventBuff: false });

console.log('room logic tests passed');
