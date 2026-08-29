(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RoomLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const shopItems = {
    heal: { cost: 12, label: '星火药剂' },
    skill: { cost: 10, label: '冷却火种' },
    buff: { cost: 18, label: '裂隙棱镜' },
  };

  function getRouteRoom(routeId, random = Math.random) {
    if (routeId === 'left') return 'elite';
    if (routeId === 'right') return random() < 0.5 ? 'event' : 'shop';
    return 'battle';
  }

  function purchaseShopItem({ item, gold, hp, maxHp, skillReady, eventBuff }) {
    const offer = shopItems[item];
    if (!offer || gold < offer.cost) return { ok: false, gold, hp, skillReady, eventBuff };
    if (item === 'heal') hp = Math.min(maxHp, hp + maxHp * 0.35);
    if (item === 'skill') skillReady = true;
    if (item === 'buff') eventBuff = true;
    return { ok: true, gold: gold - offer.cost, hp, skillReady, eventBuff };
  }

  return { shopItems, getRouteRoom, purchaseShopItem };
});
