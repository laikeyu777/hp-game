(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SkillProgression = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const definitions = {
    sword: {
      'sword-slash': { name: '裂地斩', branches: [{ id: 'quake', name: '地裂余震', desc: '大幅提高伤害。' }, { id: 'bulwark', name: '磐石架势', desc: '延长减伤并扩大范围。' }] },
      'sword-bulwark': { name: '铁壁反击', branches: [{ id: 'counter', name: '烈火反击', desc: '提高反击伤害。' }, { id: 'fortress', name: '不落壁垒', desc: '大幅延长减伤。' }] },
    },
    staff: {
      'staff-meteor': { name: '星陨术', branches: [{ id: 'inferno', name: '陨星余火', desc: '命中后附加燃烧。' }, { id: 'gravity', name: '重力深井', desc: '扩大范围并强化减速。' }] },
      'staff-prism': { name: '棱镜爆裂', branches: [{ id: 'flare', name: '灼热棱镜', desc: '提高伤害与燃烧强度。' }, { id: 'refraction', name: '多重折射', desc: '大幅扩大影响范围。' }] },
    },
    crossbow: {
      'crossbow-pierce': { name: '穿心矢', branches: [{ id: 'deadeye', name: '致命瞄准', desc: '提高伤害和暴击。' }, { id: 'overdraw', name: '过载弦机', desc: '缩短冷却并获得攻速。' }] },
      'crossbow-volley': { name: '三连矢', branches: [{ id: 'barrage', name: '箭雨齐射', desc: '额外射出两箭。' }, { id: 'ricochet', name: '裂隙弹射', desc: '箭矢会波及附近敌人。' }] },
    },
  };

  function getSkillDefinition(weapon, skillId) {
    const definition = definitions[weapon]?.[skillId];
    if (!definition) throw new Error('unknown skill: ' + skillId);
    return { ...definition, branches: definition.branches.map(branch => ({ ...branch })) };
  }

  function upgradeSkill(skillState, choice) {
    const state = { ...skillState };
    const definition = getSkillDefinition(state.weapon, state.skillId);
    const level = Math.max(1, Math.min(3, Number(state.level) || 1));
    if (level >= 3) return { ...state, level: 3 };
    if (level === 1) return { ...state, level: 2, branch: null };
    if (!definition.branches.some(branch => branch.id === choice)) throw new Error('invalid branch: ' + choice);
    return { ...state, level: 3, branch: choice };
  }

  function getSkillEffect(skillState) {
    const state = { level: 1, branch: null, ...skillState };
    const definition = getSkillDefinition(state.weapon, state.skillId);
    const effect = { damageMultiplier: state.level >= 2 ? 1.22 : 1, radiusMultiplier: 1, cooldownMultiplier: state.level >= 2 ? 0.92 : 1, reductionMultiplier: 1, extraHits: 0, burn: false, splash: false, critBonus: 0 };
    if (state.level < 3 || !state.branch) return effect;
    const branch = definition.branches.find(item => item.id === state.branch);
    if (!branch) return effect;
    if (['quake', 'counter', 'flare', 'deadeye'].includes(branch.id)) effect.damageMultiplier *= 1.3;
    if (['bulwark', 'fortress'].includes(branch.id)) { effect.reductionMultiplier = 1.55; effect.radiusMultiplier = 1.2; }
    if (['gravity', 'refraction'].includes(branch.id)) effect.radiusMultiplier = 1.45;
    if (['inferno', 'flare'].includes(branch.id)) effect.burn = true;
    if (branch.id === 'deadeye') effect.critBonus = 0.22;
    if (branch.id === 'overdraw') effect.cooldownMultiplier *= 0.68;
    if (branch.id === 'barrage') effect.extraHits = 2;
    if (branch.id === 'ricochet') effect.splash = true;
    return effect;
  }

  return { definitions, getSkillDefinition, upgradeSkill, getSkillEffect };
});
