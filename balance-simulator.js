(function (root, factory) {
  const tower = typeof module === 'object' && module.exports ? require('./tower-data.js') : root.TowerData;
  const api = factory(tower);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BalanceSimulator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (TowerData) {
  const weapons = {
    sword: { damage: 18, rateMs: 850, critMultiplier: 1, splashMultiplier: 1, hp: 120 },
    staff: { damage: 13, rateMs: 1050, critMultiplier: 1, splashMultiplier: 1.35, hp: 88 },
    crossbow: { damage: 11, rateMs: 520, critMultiplier: 1.22, splashMultiplier: 1, hp: 96 },
  };

  function simulateWeapon(id, options = {}) {
    const weapon = weapons[id];
    if (!weapon) throw new Error(`Unknown weapon: ${id}`);
    const route = options.route || 'middle';
    let totalMs = 0;
    let incomingDamage = 0;
    let floors = 0;
    for (let floor = 1; floor <= 50; floor += 1) {
      const difficulty = TowerData.getDifficultyForFloor(floor);
      const boss = TowerData.getBossForFloor(floor);
      const pool = TowerData.getEnemyPool(floor);
      const count = boss ? 1 : route === 'left' ? 3 : route === 'right' ? 1 : 2;
      const enemies = boss ? [boss] : Array.from({ length: count }, (_, index) => pool[(floor + index) % pool.length]);
      const dps = weapon.damage * 1000 / weapon.rateMs * weapon.critMultiplier * weapon.splashMultiplier;
      enemies.forEach(enemy => {
        const hp = enemy.hp * difficulty.enemyHp * (boss ? 1.08 : 1);
        totalMs += hp / dps * 1000;
        incomingDamage += enemy.damage * difficulty.enemyDamage * (boss ? 1.25 : 1) * Math.max(1, hp / dps / 1000 / 2.8);
      });
      floors += 1;
    }
    const expectedHp = weapon.hp + 50 * 3;
    return {
      weapon: id,
      floors,
      totalSeconds: Math.round(totalMs / 100) / 10,
      incomingDamage: Math.round(incomingDamage * 10) / 10,
      survivalRatio: Math.max(0.05, Math.min(1, Math.round((expectedHp / (expectedHp + incomingDamage)) * 100) / 100)),
    };
  }

  function simulateAll(options = {}) {
    return Object.fromEntries(Object.keys(weapons).map(id => [id, simulateWeapon(id, options)]));
  }

  return { weapons, simulateWeapon, simulateAll };
});
