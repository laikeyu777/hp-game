(function (root, factory) {
  const pixelArt = typeof module === 'object' && module.exports ? require('./pixel-art.js') : root.PixelArt;
  const api = factory(pixelArt);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CombatVisualState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (PixelArt) {
  function create(now = 0, reducedMotion = false) {
    return { effects: [], startedAt: now, pausedAt: null, pausedDuration: 0, reducedMotion };
  }
  function visualNow(state, now) {
    return (state.pausedAt === null ? now : state.pausedAt) - state.pausedDuration;
  }
  function pause(state, now) {
    return state.pausedAt === null ? { ...state, pausedAt: now } : state;
  }
  function resume(state, now) {
    if (state.pausedAt === null) return state;
    return { ...state, pausedDuration: state.pausedDuration + now - state.pausedAt, pausedAt: null };
  }
  function add(state, effect) {
    return { ...state, effects: PixelArt.appendEffect(state.effects, effect, 32) };
  }
  function recordAttack(state, event) {
    return add(state, { type: 'basic-attack', weapon: event.weapon, from: event.from, to: event.to, startTime: visualNow(state, event.now), duration: 420 });
  }
  function recordSkill(state, event) {
    return add(state, { type: 'skill', from: event.from, to: event.to, startTime: visualNow(state, event.now), duration: 700 });
  }
  function recordHit(state, event) {
    const startTime = visualNow(state, event.now);
    let next = add(state, { type: 'hit-flash', targetId: event.targetId, startTime, duration: 90 });
    if (!state.reducedMotion) next = add(next, { type: 'debris', x: event.x, y: event.y, startTime, duration: 260 });
    return next;
  }
  function recordEnemyAttack(state, event) {
    const bossKinds = ['furnace-lord', 'frost-queen', 'root-mother', 'sky-executioner', 'void-pioneer'];
    const kind = bossKinds.includes(event.kind) ? 'boss' : (['servant', 'hound', 'guard', 'boss'].includes(event.kind) ? event.kind : 'servant');
    const duration = { servant: 260, hound: 320, guard: 280, boss: 420 }[kind];
    return add(state, { type: 'enemy-attack', kind, from: event.from, to: event.to, startTime: visualNow(state, event.now), duration, reducedMotion: state.reducedMotion });
  }
  function prune(state, now) {
    return { ...state, effects: PixelArt.pruneEffects(state.effects, visualNow(state, now)) };
  }
  return { create, visualNow, pause, resume, recordAttack, recordSkill, recordHit, recordEnemyAttack, prune };
});
