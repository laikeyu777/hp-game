(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CombatLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyHitEffects({ target, perks, floor, now, source = 'attack', random = Math.random }) {
    const events = [];
    if (perks.includes('fire') && random() < 0.25) {
      target.burnUntil = now + 4000;
      target.nextBurnAt = target.nextBurnAt && target.nextBurnAt > now ? target.nextBurnAt : now + 1000;
      events.push({ type: 'burn-applied', target });
    }
    if (source === 'skill' && perks.includes('skill')) {
      target.slowedUntil = now + 3000;
      events.push({ type: 'slow-applied', target });
    }
    return events;
  }

  function tickBurn(target, now, floor, burnMultiplier = 1) {
    if (!target.burnUntil || now > target.burnUntil || now < (target.nextBurnAt || 0) || target.hp <= 0) return [];
    const damage = (3 + floor) * Math.max(0, burnMultiplier);
    target.hp -= damage;
    target.nextBurnAt = now + 1000;
    return [{ type: 'burn-tick', target, damage }];
  }

  function resolveDefeat({ target, enemies, perks, floor }) {
    if (!perks.includes('blast') || !target.burnUntil) return [];
    const damage = 5 + floor;
    const victims = enemies.filter(enemy => {
      if (enemy === target || enemy.hp <= 0) return false;
      if (![target.x, target.y, enemy.x, enemy.y].every(Number.isFinite)) return true;
      return Math.hypot(enemy.x - target.x, enemy.y - target.y) <= 100;
    });
    victims.forEach(enemy => { enemy.hp -= damage; });
    return [{ type: 'blast', target, victims, damage }];
  }

  function getAttackInterval(baseRate, perks) {
    return Math.round(baseRate * (perks.includes('speed') ? 0.82 : 1));
  }

  function getEnemyAttackInterval(target, now) {
    return Math.round(1100 * (target.slowedUntil > now ? 1.4 : 1));
  }

  function getComboMultiplier(streak) {
    return 1 + Math.min(0.5, streak * 0.04);
  }

  function recoverAfterFloor(currentHp, maxHp, ratio = 0.2) {
    if (!Number.isFinite(currentHp) || !Number.isFinite(maxHp) || maxHp <= 0) return currentHp;
    return Math.min(maxHp, currentHp + maxHp * ratio);
  }

  function isEncounterCleared(enemies) {
    return Array.isArray(enemies) && enemies.length > 0 && enemies.every(enemy => !Number.isFinite(enemy?.hp) || enemy.hp <= 0);
  }

  function createSettlementGate() {
    let claimed = false;
    return {
      claim() { if (claimed) return false; claimed = true; return true; },
      isClaimed() { return claimed; },
    };
  }

  function shouldSubmitRunResult(won, floor, maxFloor = 50) {
    return !won || Number(floor) >= Number(maxFloor);
  }

  function getCompletedFloor(won, floor) {
    const currentFloor = Math.max(1, Math.floor(Number(floor) || 1));
    return Math.max(0, won ? currentFloor : currentFloor - 1);
  }

  function getIncomingDamage(baseDamage, perks = [], buildMultiplier = 1, skillMultiplier = 1) {
    const guardMultiplier = perks.includes('guard') ? 0.88 : 1;
    const damage = Math.max(0, Number(baseDamage) || 0)
      * guardMultiplier
      * Math.max(0, Number(buildMultiplier) || 0)
      * Math.max(0, Number(skillMultiplier) || 0);
    return Math.round(damage * 100) / 100;
  }

  function getEnemyDamage(baseDamage, floor, elite = false, resilienceLevel = 0) {
    const growth = 1 + Math.max(0, floor - 1) * 0.06;
    const eliteMultiplier = elite ? 1.35 : 1;
    const resilience = Math.max(0, Math.min(3, resilienceLevel)) * 0.05;
    return Math.round(baseDamage * growth * eliteMultiplier * (1 - resilience) * 100) / 100;
  }

  function resolveWeaponSkill({ skill, floor, targetHp = 0 }) {
    if (skill === 'staff-meteor') return { name: '星陨术', damage: 48 + floor * 4, splash: true, slow: true };
    if (skill === 'crossbow-pierce') return { name: '穿心矢', damage: 72 + floor * 5, critBonus: 0.25, hasteMs: 350 };
    if (skill === 'sword-bulwark') return { name: '铁壁反击', damage: 34 + floor * 3, reductionMs: 3200, reduction: 0.32 };
    if (skill === 'staff-prism') return { name: '棱镜爆裂', damage: 38 + floor * 3, splash: true, burn: true };
    if (skill === 'crossbow-volley') return { name: '三连矢', damage: 28 + floor * 2, hits: 3, critBonus: 0.12 };
    return { name: '裂地斩', damage: 50 + floor * 4, reductionMs: 2200, reduction: 0.2, targetHp };
  }

  function getBossPhase(hp, maxHp) {
    if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0) return 1;
    const ratio = hp / maxHp;
    return ratio <= 0.4 ? 3 : ratio <= 0.7 ? 2 : 1;
  }

  function getBossAction(bossId, phase = 1) {
    const actions = {
      'furnace-lord': ['lava-crack', 'hammer-wave', 'ember-summon'],
      'frost-queen': ['ice-spikes', 'frost-chain', 'ice-wall'],
      'root-mother': ['vine-pierce', 'spore-cloud', 'corrupt-summon'],
      'sky-executioner': ['thunder-mark', 'spear-line', 'magnetic-pulse'],
      'void-pioneer': ['rift-burst', 'void-clone', 'space-fold'],
    };
    const list = actions[bossId] || actions['furnace-lord'];
    return { type: list[Math.max(0, Math.min(list.length - 1, phase - 1))], phase };
  }

  return { applyHitEffects, tickBurn, resolveDefeat, getAttackInterval, getEnemyAttackInterval, getComboMultiplier, recoverAfterFloor, isEncounterCleared, createSettlementGate, shouldSubmitRunResult, getCompletedFloor, getIncomingDamage, getEnemyDamage, resolveWeaponSkill, getBossPhase, getBossAction };
});
