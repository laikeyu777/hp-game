(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PixelArt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function frameAt(now, start, fps, frameCount) {
    if (fps <= 0 || frameCount <= 0) return 0;
    return Math.floor(Math.max(0, now - start) / (1000 / fps)) % frameCount;
  }

  function normalizedProgress(now, start, duration) {
    return duration <= 0 ? 1 : clamp((now - start) / duration, 0, 1);
  }

  function appendEffect(effects, effect, maxEffects = 32) {
    const limit = Math.max(0, maxEffects);
    const next = [...effects, effect];
    while (next.length > limit) {
      const decorativeIndex = next.findIndex(item => item.type === 'debris');
      next.splice(decorativeIndex >= 0 ? decorativeIndex : 0, 1);
    }
    return next;
  }

  function pruneEffects(effects, now) {
    return effects.filter(effect => now < effect.startTime + effect.duration);
  }

  const REFERENCE_SPRITE_CROPS = {
    sword: { x: 72, y: 48, width: 270, height: 250 },
    staff: { x: 380, y: 38, width: 270, height: 270 },
    crossbow: { x: 620, y: 42, width: 260, height: 270 },
    servant: { x: 35, y: 300, width: 280, height: 270 },
    hound: { x: 330, y: 300, width: 300, height: 270 },
    guard: { x: 650, y: 300, width: 260, height: 270 },
    'thorn-bug': { x: 880, y: 300, width: 300, height: 290 },
    'spore-beast': { x: 1170, y: 265, width: 350, height: 355 },
    'furnace-lord': { x: 15, y: 585, width: 345, height: 375 },
    'frost-queen': { x: 350, y: 560, width: 340, height: 400 },
    'root-mother': { x: 690, y: 555, width: 290, height: 410 },
    'sky-executioner': { x: 985, y: 560, width: 275, height: 405 },
    'void-pioneer': { x: 1240, y: 555, width: 290, height: 410 },
  };
  const REFERENCE_SPRITE_ALIASES = {
    'ice-wraith': 'servant', 'rot-priest': 'servant', 'light-wraith': 'servant', 'void-leech': 'servant',
    'frost-wolf': 'hound', 'rift-hound': 'hound', 'cold-guard': 'guard', 'mag-guard': 'guard', 'star-guard': 'guard',
  };
  let referenceSpriteSheet = null;
  if (typeof Image !== 'undefined') {
    referenceSpriteSheet = new Image();
    referenceSpriteSheet.src = 'reference-sprite-sheet.png';
  }

  function getReferenceSpriteCrop(kind) {
    const key = REFERENCE_SPRITE_CROPS[kind] ? kind : REFERENCE_SPRITE_ALIASES[kind];
    return key ? { ...REFERENCE_SPRITE_CROPS[key] } : null;
  }

  function setReferenceSpriteSheet(sheet) {
    referenceSpriteSheet = sheet || null;
  }

  function drawReferenceSprite(ctx, kind, model = {}) {
    const crop = getReferenceSpriteCrop(kind);
    const imageUnavailable = referenceSpriteSheet && 'naturalWidth' in referenceSpriteSheet && referenceSpriteSheet.naturalWidth === 0;
    if (!crop || !referenceSpriteSheet || referenceSpriteSheet.complete === false || imageUnavailable || typeof ctx.drawImage !== 'function') return false;
    const isBoss = ['furnace-lord', 'frost-queen', 'root-mother', 'sky-executioner', 'void-pioneer'].includes(kind);
    const isHero = ['sword', 'staff', 'crossbow'].includes(kind);
    const scale = Math.max(1, Number(model.scale || 1));
    const targetWidth = (isBoss ? 76 : isHero ? 40 : 48) * scale;
    const targetHeight = (isBoss ? 78 : isHero ? 54 : 52) * scale;
    const bob = model.reducedMotion ? 0 : ((Number(model.frame || 0) % 4) === 2 ? -2 : 0);
    const x = Math.round(Number(model.x || 0) - targetWidth / 2);
    const y = Math.round(Number(model.y || 0) - targetHeight * 0.86 + bob);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = model.hitFlash ? 0.8 : 1;
    ctx.drawImage(referenceSpriteSheet, crop.x, crop.y, crop.width, crop.height, x, y, targetWidth, targetHeight);
    ctx.restore();
    return true;
  }

  const HERO_PALETTE = {
    outline: '#151a18', hairLight: '#e7ece7', hair: '#b9c4bf', hairShadow: '#68736e',
    skin: '#d8a47f', emberEye: '#f58b4a', mask: '#27322f', brass: '#b78a43',
    armor: '#31584c', armorShadow: '#1c3931', leather: '#684434', cloak: '#793a36',
    cloakDark: '#442525', trousers: '#252b2a', boot: '#111716', white: '#fff0c7',
  };
  const HERO_PARTS = [
    [8,0,12,2,'hairLight'],[5,2,18,3,'hair'],[3,5,22,3,'hairShadow'],[5,8,18,2,'outline'],
    [6,9,13,10,'skin'],[15,10,4,3,'emberEye'],[19,9,6,10,'mask'],[7,17,5,2,'skin'],
    [1,19,8,7,'brass'],[22,19,8,7,'brass'],[8,19,15,16,'armor'],[11,21,9,8,'armorShadow'],
    [9,29,13,3,'leather'],[14,29,3,3,'brass'],[0,21,7,20,'cloak'],[0,25,3,13,'cloakDark'],
    [4,38,4,5,'cloak'],[26,25,4,12,'skin'],[27,29,5,4,'leather'],[3,25,4,12,'skin'],
    [0,29,5,4,'leather'],[9,35,6,3,'trousers'],[18,35,6,3,'trousers'],[9,38,6,7,'trousers'],
    [18,38,6,7,'trousers'],[8,44,8,4,'boot'],[18,44,8,4,'boot'],[7,46,10,2,'outline'],
    [17,46,10,2,'outline'],[10,23,2,7,'brass'],[20,20,2,13,'outline'],[13,12,2,2,'white'],
  ];
  const HERO_ROLE_PALETTES = {
    sword: { armor:'#496f5d', armorShadow:'#203c32', brass:'#d6a46a', cloak:'#6e3538', cloakDark:'#3e2228' },
    staff: { armor:'#244c73', armorShadow:'#172f4d', cloak:'#6550a0', cloakDark:'#34285e', brass:'#8cc9e7', hairLight:'#dff8ff' },
    crossbow: { armor:'#1f6570', armorShadow:'#153d47', cloak:'#2b7480', cloakDark:'#173d46', brass:'#e0bd6f', hairLight:'#d9e8ff' },
  };
  const HERO_ROLE_PARTS = {
    sword: [[5,1,24,4,'armor'],[2,5,5,8,'armor'],[25,5,5,8,'armor'],[1,18,8,10,'armor'],[23,18,8,10,'armor'],[7,30,17,5,'armor'],[5,22,2,9,'outline'],[2,24,5,2,'brass'],[4,27,1,5,'brass'],[6,24,1,5,'brass']],
    staff: [[8,0,16,3,'armor'],[4,3,24,5,'armor'],[3,8,5,8,'armor'],[25,8,5,8,'armor'],[6,28,20,12,'armor'],[4,34,5,9,'armor'],[23,34,5,9,'armor'],[9,5,12,2,'brass'],[6,16,4,2,'cloak'],[24,16,4,2,'cloak'],[29,5,1,8,'armorShadow']],
    crossbow: [[8,0,14,3,'armor'],[4,3,7,6,'armor'],[19,3,10,6,'armor'],[2,8,6,8,'armor'],[25,8,6,8,'armor'],[1,16,5,8,'cloak'],[24,16,7,8,'brass'],[5,27,5,11,'armor'],[22,27,5,11,'armor'],[26,33,7,8,'armor'],[0,36,5,8,'armor'],[27,24,5,2,'brass'],[25,30,4,2,'armorShadow']],
  };
  const HERO_SILHOUETTES = {
    sword: [{ points:[[6,0],[26,0],[30,5],[27,14],[5,14],[2,6]], color:'armor' },{ points:[[1,19],[9,17],[12,37],[6,43],[1,38]], color:'armor' }],
    staff: [{ points:[[7,2],[16,0],[25,2],[28,10],[22,16],[9,16],[3,9]], color:'armor' },{ points:[[8,27],[24,27],[29,43],[23,47],[9,47],[3,42]], color:'armor' }],
    crossbow: [{ points:[[5,1],[22,1],[29,6],[25,16],[8,16],[2,9]], color:'armor' },{ points:[[6,24],[22,21],[29,35],[24,44],[9,44],[3,34]], color:'armor' }],
  };
  const WEAPON_PARTS = {
    sword: [[30,18,2,22,'white'],[28,17,6,2,'brass'],[30,40,2,5,'leather'],[29,18,1,18,'hairLight']],
    staff: [[29,12,3,33,'leather'],[27,8,7,7,'brass'],[29,9,3,4,'white'],[26,7,3,3,'emberEye'],[33,11,3,3,'emberEye']],
    crossbow: [[26,23,8,3,'leather'],[27,19,2,10,'brass'],[32,20,2,9,'brass'],[28,22,6,1,'white'],[30,26,2,6,'leather']],
  };

  function drawParts(ctx, parts, x, y, scale, palette, offsetY = 0, offsetX = 0) {
    ctx.imageSmoothingEnabled = false;
    parts.forEach(([px, py, width, height, color]) => {
      ctx.fillStyle = palette[color] || color;
      ctx.fillRect(Math.round(x + (px + offsetX) * scale), Math.round(y + (py + offsetY) * scale), width * scale, height * scale);
    });
  }

  function drawPixelPolygon(ctx, points, x, y, scale, palette, color, offsetY = 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = palette[color] || color;
    ctx.beginPath();
    points.forEach(([px, py], index) => {
      const drawX = Math.round(x + px * scale), drawY = Math.round(y + (py + offsetY) * scale);
      if (index === 0) ctx.moveTo(drawX, drawY); else ctx.lineTo(drawX, drawY);
    });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#090b0c';
    ctx.lineWidth = Math.max(1, scale);
    ctx.stroke();
  }

  function drawSpriteGlow(ctx, model = {}) {
    const x = Number(model.x || 0), y = Number(model.y || 0), radius = Math.max(8, Number(model.radius || 42));
    const color = model.color || '#66d3c2';
    ctx.save();
    for (let index = 0; index < 3; index += 1) {
      ctx.globalAlpha = (Number(model.alpha) || 0.14) / (index + 1);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius * (1 - index * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHero(ctx, model = {}) {
    const scale = Math.max(1, Math.round(model.scale || 2));
    const frame = model.reducedMotion ? 0 : (model.frame || 0) % 4;
    const weapon = HERO_ROLE_PALETTES[model.weapon] ? model.weapon : 'sword';
    if (drawReferenceSprite(ctx, weapon, { ...model, scale })) {
      if (model.pose === 'attack') drawAttackMotion(ctx, { ...model, weapon, scale });
      return;
    }
    const x = Math.round((model.x || 0) - 16 * scale);
    const y = Math.round((model.y || 0) - 40 * scale);
    const rolePalette = { ...HERO_PALETTE, ...HERO_ROLE_PALETTES[weapon] };
    const palette = model.hitFlash ? { ...rolePalette, skin: '#fff0c7', armor: '#fff0c7', armorShadow: '#e7ece7', cloak: '#fff0c7' } : rolePalette;
    const breathing = model.pose === 'attack' || model.reducedMotion ? 0 : (frame >= 2 ? 1 : 0);
    HERO_SILHOUETTES[weapon].forEach(shape => drawPixelPolygon(ctx, shape.points, x, y, scale, palette, shape.color, breathing));
    drawParts(ctx, HERO_PARTS, x, y, scale, palette, breathing);
    drawParts(ctx, HERO_ROLE_PARTS[weapon], x, y, scale, palette, breathing);
    const faceColor = weapon === 'sword' ? '#25201a' : weapon === 'staff' ? '#1a1630' : '#10282d';
    drawParts(ctx, [[7,9,12,3,faceColor],[18,10,5,2,faceColor],[13,12,2,1,weapon === 'staff' ? '#66f0dc' : '#d6a46a']], x, y, scale, palette, breathing);
    if (!model.reducedMotion && frame >= 2) {
      drawParts(ctx, [[0,31,3,10,'cloak'],[2,39,5,3,'cloakDark']], x, y, scale, palette, 0, -1);
    }
    drawParts(ctx, WEAPON_PARTS[model.weapon] || WEAPON_PARTS.sword, x, y, scale, palette, model.pose === 'attack' ? -1 : 0);
    if (model.pose === 'attack') drawAttackMotion(ctx, { ...model, weapon, scale });
  }

  function line(ctx, color, width, from, to) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  }

  function drawBasicAttack(ctx, effect, now) {
    const progress = normalizedProgress(now, effect.startTime, effect.duration);
    const from = effect.from, to = effect.to;
    const x = Math.round(from.x + (to.x - from.x) * progress);
    const y = Math.round(from.y + (to.y - from.y) * progress);
    const weapon = ['sword', 'staff', 'crossbow'].includes(effect.weapon) ? effect.weapon : 'sword';
    ctx.save();
    if (weapon === 'sword') {
      ctx.strokeStyle = '#fff0c7'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(to.x, to.y, 20 + progress * 15, Math.PI * .7, Math.PI * 1.45); ctx.stroke();
      ctx.strokeStyle = '#f58b4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(to.x, to.y, 15 + progress * 12, Math.PI * .7, Math.PI * 1.45); ctx.stroke();
    } else if (weapon === 'staff') {
      line(ctx, '#66d3c2', 3, from, { x, y }); ctx.fillStyle = '#fff0c7'; ctx.fillRect(x - 4, y - 4, 8, 8);
      ctx.strokeStyle = '#b68cff'; ctx.lineWidth = 2; ctx.strokeRect(x - 9, y - 9, 18, 18);
    } else {
      line(ctx, '#66d3c2', 2, from, { x: x - 8, y }); line(ctx, '#66d3c2', 1, from, { x: x - 16, y: y + 3 });
      ctx.fillStyle = '#c6b178'; ctx.fillRect(x - 7, y - 2, 14, 4); ctx.fillRect(x + 5, y - 4, 5, 8);
    }
    ctx.restore();
  }

  function drawAttackMotion(ctx, model = {}) {
    const weapon = ['sword', 'staff', 'crossbow'].includes(model.weapon) ? model.weapon : 'sword';
    const scale = Math.max(1, Number(model.scale || 1));
    const frameProgress = (Number(model.frame || 0) % 4) / 3;
    const progress = clamp(Number(model.attackProgress ?? frameProgress), 0, 1);
    const motion = model.reducedMotion ? 0.5 : (progress < 0.5 ? progress * 2 : (1 - progress) * 2);
    const x = Number(model.x || 0), y = Number(model.y || 0);
    const target = model.attackTarget || { x: x + 140, y: y - 120 };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (weapon === 'sword') {
      const origin = { x: x + 10 * scale, y: y - 9 * scale };
      const angle = -2.1 + motion * 2.75;
      const tip = { x: origin.x + Math.cos(angle) * 31 * scale, y: origin.y + Math.sin(angle) * 31 * scale };
      line(ctx, '#fff0c7', Math.max(3, 4 * scale), origin, tip);
      line(ctx, '#f3c95a', Math.max(1, 2 * scale), { x: origin.x - 2 * scale, y: origin.y + 2 * scale }, tip);
      ctx.strokeStyle = '#fff0c7'; ctx.lineWidth = Math.max(2, 3 * scale);
      ctx.beginPath(); ctx.arc(origin.x, origin.y, 25 * scale, angle - .35, angle + .42); ctx.stroke();
      ctx.fillStyle = '#f58b4a'; ctx.fillRect(Math.round(tip.x - 2 * scale), Math.round(tip.y - 2 * scale), Math.max(2, 3 * scale), Math.max(2, 3 * scale));
    } else if (weapon === 'staff') {
      const tip = { x: x + 19 * scale, y: y - 34 * scale };
      const pulse = 3 + motion * 4;
      ctx.globalAlpha = .55 + motion * .4; ctx.fillStyle = '#66d3c2';
      ctx.fillRect(Math.round(tip.x - pulse), Math.round(tip.y - pulse), Math.round(pulse * 2), Math.round(pulse * 2));
      ctx.globalAlpha = 1; ctx.strokeStyle = '#b68cff'; ctx.lineWidth = Math.max(1, scale);
      ctx.strokeRect(Math.round(tip.x - pulse - 3 * scale), Math.round(tip.y - pulse - 3 * scale), Math.round((pulse + 3 * scale) * 2), Math.round((pulse + 3 * scale) * 2));
      if (progress > .22) {
        const q = Math.min(1, (progress - .22) / .55);
        const beamTip = { x: tip.x + (target.x - tip.x) * q, y: tip.y + (target.y - tip.y) * q };
        line(ctx, '#b68cff', Math.max(2, 3 * scale), tip, beamTip);
        line(ctx, '#dff8ff', Math.max(1, scale), tip, beamTip);
        ctx.fillStyle = '#fff0c7'; ctx.fillRect(Math.round(beamTip.x - scale), Math.round(beamTip.y - scale), Math.max(2, 2 * scale), Math.max(2, 2 * scale));
      }
    } else {
      const recoil = model.reducedMotion ? 0 : (1 - motion) * 5 * scale;
      const origin = { x: x + 19 * scale - recoil, y: y - 3 * scale };
      const arrowTip = { x: origin.x + (target.x - origin.x) * Math.min(1, progress * 1.2), y: origin.y + (target.y - origin.y) * Math.min(1, progress * 1.2) };
      line(ctx, '#c6b178', Math.max(2, 3 * scale), { x: origin.x - 8 * scale, y: origin.y - 9 * scale }, { x: origin.x + 2 * scale, y: origin.y });
      line(ctx, '#c6b178', Math.max(2, 3 * scale), { x: origin.x - 8 * scale, y: origin.y + 9 * scale }, { x: origin.x + 2 * scale, y: origin.y });
      line(ctx, '#fff0c7', Math.max(1, scale), origin, arrowTip);
      ctx.fillStyle = '#f3c95a'; ctx.fillRect(Math.round(arrowTip.x - 2 * scale), Math.round(arrowTip.y - 2 * scale), Math.max(2, 3 * scale), Math.max(2, 3 * scale));
    }
    ctx.restore();
    return true;
  }

  function drawSkillEffect(ctx, effect, now) {
    const p = normalizedProgress(now, effect.startTime, effect.duration), from = effect.from, to = effect.to;
    ctx.save();
    if (p < .2) {
      const r = 8 + 30 * p / .2; ctx.strokeStyle = '#66d3c2'; ctx.lineWidth = 3; ctx.strokeRect(from.x - r, from.y + 22 - r / 3, r * 2, r / 1.5);
    } else if (p < .4) {
      const r = 4 + 12 * (p - .2) / .2; ctx.fillStyle = '#fff0c7'; ctx.fillRect(from.x + 12 - r / 2, from.y - 12 - r / 2, r, r);
      ctx.strokeStyle = '#f58b4a'; ctx.strokeRect(from.x + 5 - r, from.y - 19 - r, r * 2, r * 2);
    } else if (p < .72) {
      const q = (p - .4) / .32, tip = { x: from.x + (to.x - from.x) * q, y: from.y + (to.y - from.y) * q };
      line(ctx, '#7d2f2a', 10, from, tip); line(ctx, '#f58b4a', 6, from, tip); line(ctx, '#fff0c7', 2, from, tip);
    } else if (p < .84) {
      const r = 5 + 30 * (p - .72) / .12; ctx.fillStyle = '#fff0c7'; ctx.fillRect(to.x - r / 2, to.y - r / 2, r, r);
      ctx.strokeStyle = '#f58b4a'; ctx.lineWidth = 4; ctx.strokeRect(to.x - r, to.y - r, r * 2, r * 2);
    } else {
      const r = 12 + 55 * (p - .84) / .16; ctx.strokeStyle = '#b68cff'; ctx.lineWidth = 5; ctx.strokeRect(to.x - r, to.y - r, r * 2, r * 2);
      ctx.strokeStyle = '#f58b4a'; ctx.lineWidth = 2; ctx.strokeRect(to.x - r * .7, to.y - r * .7, r * 1.4, r * 1.4);
    }
    ctx.restore();
  }

  function drawDebris(ctx, effect, now) {
    const p = normalizedProgress(now, effect.startTime, effect.duration);
    for (let i = 0; i < 6; i += 1) {
      const direction = i % 2 ? 1 : -1; ctx.fillStyle = i % 2 ? '#f58b4a' : '#fff0c7';
      ctx.fillRect(Math.round(effect.x + direction * p * (8 + i * 2)), Math.round(effect.y - p * (10 + i * 2) + i * 2), 3, 3);
    }
  }

  function mark(ctx, label) {
    if (Array.isArray(ctx.operations)) ctx.operations.push([label]);
  }

  function drawEnemyAttack(ctx, effect = {}, now) {
    const bossKinds = ['furnace-lord', 'frost-queen', 'root-mother', 'sky-executioner', 'void-pioneer'];
    const kind = bossKinds.includes(effect.kind) ? 'boss' : (Object.prototype.hasOwnProperty.call(ENEMY_PALETTES, effect.kind) ? effect.kind : 'servant');
    const p = normalizedProgress(now, effect.startTime || 0, effect.duration || 260);
    const from = effect.from || { x: 220, y: 150 }, to = effect.to || { x: 82, y: 252 };
    const x = from.x + (to.x - from.x) * p, y = from.y + (to.y - from.y) * p;
    ctx.save();
    if (kind === 'servant') {
      ctx.strokeStyle = '#e76864'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(to.x, to.y, 24 + p * 18, Math.PI * .65, Math.PI * 1.35); ctx.stroke();
      ctx.fillStyle = '#fff0c7'; ctx.fillRect(Math.round(x - 5), Math.round(y - 2), 12, 4);
    } else if (kind === 'hound') {
      if (!effect.reducedMotion) {
        mark(ctx, 'afterimage'); ctx.fillStyle = '#b68cff';
        for (let index = 1; index <= 2; index += 1) {
          const q = Math.max(0, p - index * .12); ctx.globalAlpha = .34 / index; ctx.fillRect(Math.round(from.x + (to.x - from.x) * q - 14), Math.round(from.y + (to.y - from.y) * q - 10), 28, 14);
        }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = '#b68cff'; ctx.fillRect(Math.round(x - 12), Math.round(y - 8), 24, 16);
      if (p > .7) { ctx.fillStyle = '#fff0c7'; ctx.fillRect(Math.round(to.x - 10), Math.round(to.y + 12), 20, 5); }
    } else if (kind === 'guard') {
      ctx.fillStyle = '#f3c95a'; ctx.fillRect(Math.round(from.x - 4), Math.round(from.y - 3), Math.max(8, Math.round((to.x - from.x) * p)), 6);
      ctx.fillStyle = '#fff0c7'; ctx.fillRect(Math.round(x - 8), Math.round(y - 4), 15, 8);
      ctx.fillStyle = '#a08247'; ctx.fillRect(Math.round(x - 2), Math.round(y - 10), 4, 20);
    } else {
      const radius = 12 + p * 68; ctx.globalAlpha = .25 + p * .65; ctx.strokeStyle = '#f58b4a'; ctx.lineWidth = 5; ctx.strokeRect(Math.round(to.x - radius), Math.round(to.y - radius), Math.round(radius * 2), Math.round(radius * 2));
      ctx.globalAlpha = .9; ctx.strokeStyle = '#b68cff'; ctx.lineWidth = 2; ctx.strokeRect(Math.round(to.x - radius * .65), Math.round(to.y - radius * .65), Math.round(radius * 1.3), Math.round(radius * 1.3));
    }
    ctx.restore();
  }

  function drawEffect(ctx, effect, now) {
    if (effect.type === 'basic-attack') drawBasicAttack(ctx, effect, now);
    if (effect.type === 'skill') drawSkillEffect(ctx, effect, now);
    if (effect.type === 'debris') drawDebris(ctx, effect, now);
    if (effect.type === 'enemy-attack') drawEnemyAttack(ctx, effect, now);
  }

  const ENEMY_PALETTES = {
    servant: { outline:'#211817', body:'#604139', bodyDark:'#382725', eye:'#f3c95a', core:'#d35e43', weapon:'#b5aea0' },
    hound: { outline:'#211b25', body:'#4d4058', bodyDark:'#302838', mane:'#9770b8', eye:'#f3c95a', claw:'#d7c9df' },
    guard: { outline:'#24231c', armor:'#6f6950', armorDark:'#403d32', brass:'#a08247', eye:'#f3c95a', spear:'#c6b178' },
    boss: { outline:'#1e1722', armor:'#44384d', armorDark:'#292130', rift:'#b68cff', eye:'#f3c95a', staff:'#a675b7', ember:'#f58b4a' },
  };
  const ENEMY_PARTS = {
    servant: [[10,2,12,4,'bodyDark'],[7,6,18,5,'body'],[8,11,16,8,'body'],[11,12,3,2,'eye'],[20,11,4,6,'bodyDark'],[8,19,16,15,'bodyDark'],[11,20,10,12,'body'],[14,22,4,5,'core'],[4,20,5,16,'body'],[24,20,5,15,'body'],[25,28,10,3,'weapon'],[9,34,6,12,'bodyDark'],[18,34,6,12,'bodyDark'],[7,45,9,3,'outline'],[17,45,9,3,'outline']],
    hound: [[4,14,22,10,'body'],[0,17,8,12,'mane'],[22,12,13,10,'bodyDark'],[31,14,8,8,'body'],[34,15,3,2,'eye'],[7,10,5,7,'mane'],[13,11,5,5,'mane'],[18,12,5,5,'mane'],[4,24,8,9,'bodyDark'],[19,23,7,11,'bodyDark'],[30,21,5,9,'bodyDark'],[2,31,8,3,'claw'],[18,32,9,3,'claw'],[29,29,8,3,'claw'],[0,20,4,4,'outline']],
    guard: [[10,1,13,5,'brass'],[7,6,19,12,'armor'],[11,9,3,2,'eye'],[8,17,17,18,'armorDark'],[11,18,11,13,'armor'],[0,16,9,24,'armor'],[1,19,6,17,'brass'],[24,18,6,18,'armor'],[30,5,2,40,'spear'],[28,4,6,5,'spear'],[10,35,6,11,'armorDark'],[19,35,6,11,'armorDark'],[8,45,9,3,'outline'],[18,45,9,3,'outline'],[14,23,4,5,'brass']],
    boss: [[8,0,5,8,'rift'],[15,2,4,8,'rift'],[22,0,5,8,'rift'],[7,8,21,10,'armor'],[10,11,3,2,'eye'],[22,11,3,2,'eye'],[9,18,18,18,'armorDark'],[12,19,12,14,'armor'],[15,22,6,7,'rift'],[0,18,8,10,'armor'],[28,18,8,10,'armor'],[1,21,5,4,'rift'],[30,21,5,4,'rift'],[30,7,3,36,'staff'],[27,5,9,7,'rift'],[11,36,6,10,'armorDark'],[20,36,6,10,'armorDark'],[8,45,11,3,'outline'],[18,45,11,3,'outline']],
  };
  const BOSS_BEAST_POLYGONS = {
    'furnace-lord': [{ points:[[3,14],[13,6],[28,9],[39,17],[56,14],[68,20],[57,32],[20,34],[6,27]], color:'armor' },{ points:[[3,10],[0,1],[10,5],[16,13]], color:'ember' },{ points:[[47,14],[59,5],[64,8],[55,20]], color:'armorDark' },{ points:[[17,30],[23,30],[21,46],[14,43]], color:'armorDark' },{ points:[[42,29],[49,29],[52,44],[45,46]], color:'armorDark' }],
    'frost-queen': [{ points:[[5,18],[16,11],[29,14],[39,19],[54,18],[64,24],[49,32],[20,31]], color:'armor' },{ points:[[4,14],[0,7],[11,8],[18,15]], color:'rift' },{ points:[[39,18],[54,5],[65,3],[56,20]], color:'rift' },{ points:[[45,25],[65,25],[69,30],[51,32]], color:'rift' },{ points:[[19,29],[25,29],[22,46],[15,41]], color:'armorDark' }],
    'root-mother': [{ points:[[7,13],[20,5],[38,4],[55,12],[63,22],[53,32],[16,34],[2,25]], color:'armor' },{ points:[[8,13],[11,0],[20,8],[29,1],[33,11]], color:'rift' },{ points:[[36,9],[44,0],[51,8],[60,5],[57,18]], color:'rift' },{ points:[[1,25],[0,38],[11,33],[17,27]], color:'armorDark' },{ points:[[47,29],[67,25],[67,37],[54,39]], color:'armorDark' },{ points:[[15,31],[22,31],[18,49],[10,47]], color:'armorDark' },{ points:[[41,31],[49,31],[54,48],[46,49]], color:'armorDark' }],
    'sky-executioner': [{ points:[[15,16],[28,9],[42,13],[54,22],[46,31],[23,30],[11,24]], color:'armor' },{ points:[[16,18],[1,3],[0,16],[16,25]], color:'rift' },{ points:[[41,15],[56,2],[69,2],[58,23]], color:'rift' },{ points:[[49,17],[68,17],[63,25],[52,25]], color:'armorDark' },{ points:[[20,28],[27,28],[25,44],[18,42]], color:'armorDark' },{ points:[[39,28],[46,28],[52,44],[44,44]], color:'armorDark' }],
    'void-pioneer': [{ points:[[2,19],[15,10],[31,10],[43,15],[57,10],[68,18],[59,30],[43,28],[29,34],[13,30]], color:'armor' },{ points:[[3,19],[0,10],[13,14],[19,21]], color:'rift' },{ points:[[51,15],[67,7],[70,15],[59,22]], color:'rift' },{ points:[[12,29],[3,39],[16,35],[22,29]], color:'rift' },{ points:[[43,27],[63,32],[53,40],[39,32]], color:'rift' }],
  };
  const BOSS_BEAST_PARTS = {
    'furnace-lord': [[12,14,40,18,'armor'],[2,17,12,10,'armorDark'],[15,7,12,9,'armorDark'],[39,7,12,9,'armorDark'],[14,30,8,14,'armorDark'],[41,30,8,14,'armorDark'],[20,19,13,10,'ember'],[5,7,4,8,'ember'],[49,5,4,8,'ember'],[8,15,3,3,'eye']],
    'frost-queen': [[18,14,30,17,'armor'],[7,10,16,13,'armor'],[1,8,18,7,'rift'],[43,7,22,7,'rift'],[3,2,5,8,'rift'],[56,3,5,8,'rift'],[24,19,13,9,'rift'],[11,13,3,3,'eye'],[42,25,20,5,'armorDark']],
    'root-mother': [[16,15,36,20,'armor'],[10,7,46,11,'armorDark'],[7,3,10,13,'rift'],[22,0,9,12,'rift'],[39,1,9,12,'rift'],[52,5,10,13,'rift'],[0,24,14,8,'armorDark'],[51,23,16,9,'armorDark'],[13,33,7,13,'armorDark'],[41,33,7,13,'armorDark'],[27,20,12,11,'rift'],[7,20,5,4,'eye'],[54,18,5,4,'eye']],
    'sky-executioner': [[18,16,29,16,'armor'],[39,9,17,14,'armor'],[0,4,22,13,'rift'],[44,3,25,14,'rift'],[1,14,17,7,'armorDark'],[48,15,20,7,'armorDark'],[23,30,7,13,'armorDark'],[40,30,7,13,'armorDark'],[47,12,4,4,'eye'],[56,16,8,3,'rift']],
    'void-pioneer': [[7,16,18,13,'armorDark'],[20,12,20,16,'armor'],[38,14,20,14,'armorDark'],[49,8,17,16,'armor'],[0,20,11,5,'rift'],[58,20,12,5,'rift'],[4,29,15,4,'rift'],[39,30,12,4,'rift'],[11,36,5,11,'rift'],[26,38,5,10,'rift'],[44,37,5,11,'rift'],[52,13,5,4,'eye'],[59,17,4,4,'eye'],[31,20,8,5,'ember']],
  };

  const themedPalettes = {
    'ice-wraith': { outline:'#17232b', body:'#547487', bodyDark:'#2b414d', eye:'#b8f1ff', core:'#80d8ff', weapon:'#dff8ff' },
    'frost-wolf': { outline:'#182733', body:'#547b91', bodyDark:'#2c4b5c', mane:'#9ddff2', eye:'#fff0c7', claw:'#c9f2ff' },
    'cold-guard': { outline:'#1b2b35', armor:'#567b8a', armorDark:'#304d5c', brass:'#8fc4d4', eye:'#b8f1ff', spear:'#dff8ff' },
    'thorn-bug': { outline:'#182518', armor:'#49663a', armorDark:'#293b25', brass:'#91b85a', eye:'#e7ffb0', spear:'#b8e778' },
    'rot-priest': { outline:'#211a25', body:'#68465f', bodyDark:'#3e293b', eye:'#e7ffb0', core:'#9fe36b', weapon:'#d6b4d0' },
    'spore-beast': { outline:'#1b2618', body:'#617b45', bodyDark:'#35472a', mane:'#a6cc62', eye:'#fff0c7', claw:'#d9ed9a' },
    'thunder-bird': { outline:'#172038', body:'#4c6090', bodyDark:'#2c385b', mane:'#8ab4ff', eye:'#fff0c7', claw:'#d9e8ff' },
    'mag-guard': { outline:'#1b2436', armor:'#536b9b', armorDark:'#2f3d61', brass:'#93b2e4', eye:'#8ab4ff', spear:'#d9e8ff' },
    'light-wraith': { outline:'#16243b', body:'#527a99', bodyDark:'#2a496b', eye:'#fff0c7', core:'#8ab4ff', weapon:'#d9e8ff' },
    'void-leech': { outline:'#261936', body:'#634575', bodyDark:'#382449', eye:'#e1c7ff', core:'#c38cff', weapon:'#ae7bd8' },
    'rift-hound': { outline:'#25183a', body:'#5d477d', bodyDark:'#38284f', mane:'#a77be1', eye:'#fff0c7', claw:'#e1c7ff' },
    'star-guard': { outline:'#251d37', armor:'#68588a', armorDark:'#3c3158', brass:'#b08fe5', eye:'#c38cff', spear:'#eadcff' },
    'furnace-lord': { outline:'#281615', armor:'#6b4030', armorDark:'#39211d', rift:'#f58b4a', eye:'#fff0c7', staff:'#b65b3e', ember:'#ff9c56' },
    'frost-queen': { outline:'#162633', armor:'#456d86', armorDark:'#263e50', rift:'#80d8ff', eye:'#fff0c7', staff:'#8cc9e7', ember:'#b8f1ff' },
    'root-mother': { outline:'#1a2518', armor:'#4a693e', armorDark:'#283b25', rift:'#9fe36b', eye:'#e7ffb0', staff:'#719d4f', ember:'#b8e778' },
    'sky-executioner': { outline:'#172038', armor:'#455b8f', armorDark:'#26365e', rift:'#8ab4ff', eye:'#e7f0ff', staff:'#7fdcff', ember:'#d9e8ff' },
    'void-pioneer': { outline:'#241735', armor:'#594175', armorDark:'#302044', rift:'#c38cff', eye:'#fff0c7', staff:'#9d69d4', ember:'#e1c7ff' },
  };
  Object.entries(themedPalettes).forEach(([kind, palette]) => {
    ENEMY_PALETTES[kind] = palette;
    ENEMY_PARTS[kind] = ['furnace-lord', 'frost-queen', 'root-mother', 'sky-executioner', 'void-pioneer'].includes(kind)
      ? [...ENEMY_PARTS.boss, [4, 4, 4, 4, 'ember']]
      : (kind.includes('hound') || kind.includes('wolf') || kind.includes('bird') || kind.includes('beast') ? [...ENEMY_PARTS.hound, [4, 4, 5, 4, 'core']] : [...ENEMY_PARTS.guard, [4, 4, 5, 4, 'core']]);
  });

  function drawEnemy(ctx, model = {}) {
    const kind = ENEMY_PARTS[model.kind] ? model.kind : 'servant';
    if (drawReferenceSprite(ctx, kind, model)) return;
    const isBoss = ['boss', 'furnace-lord', 'frost-queen', 'root-mother', 'sky-executioner', 'void-pioneer'].includes(kind);
    const scale = Math.max(1, Math.round(model.scale || (isBoss ? 2 : 1)));
    const parts = ENEMY_PARTS[kind];
    const width = kind === 'hound' ? 40 : 36;
    const palette = model.hitFlash ? Object.fromEntries(Object.keys(ENEMY_PALETTES[kind]).map(key => [key, key === 'outline' ? '#e7ece7' : '#fff0c7'])) : { ...ENEMY_PALETTES[kind] };
    if (isBoss && model.bossPhase === 2) palette.rift = '#f58b4a';
    const bob = model.reducedMotion ? 0 : ((model.frame || 0) % 4 === 2 ? -1 : 0);
    if (isBoss && BOSS_BEAST_POLYGONS[kind]) {
      const beastX = model.x - 34 * scale, beastY = model.y - 26 * scale;
      drawParts(ctx, BOSS_BEAST_PARTS[kind], beastX, beastY, scale, palette, bob);
      BOSS_BEAST_POLYGONS[kind].forEach(shape => drawPixelPolygon(ctx, shape.points, beastX, beastY, scale, palette, shape.color, bob));
      const faceColor = '#0d0b12';
      drawParts(ctx, [[6,14,5,3,faceColor],[8,15,2,1,'eye'],[1,20,12,3,faceColor],[12,19,3,2,faceColor]], beastX, beastY, scale, palette, bob);
      if (model.bossPhase === 2) {
        const pulse = 8 + ((model.frame || 0) % 4) * 2;
        ctx.strokeStyle = palette.rift || '#f58b4a'; ctx.lineWidth = 3;
        ctx.strokeRect(model.x - pulse, model.y - pulse, pulse * 2, pulse * 2);
      }
      return;
    }
    drawParts(ctx, parts, model.x - width * scale / 2, model.y - 24 * scale, scale, palette, bob);
    if (isBoss && model.bossPhase === 2) {
      const pulse = 5 + ((model.frame || 0) % 4) * 2; ctx.strokeStyle = '#f58b4a'; ctx.lineWidth = 2; ctx.strokeRect(model.x - pulse, model.y - pulse, pulse * 2, pulse * 2);
    }
  }

  function drawStatusEffects(ctx, model, now) {
    const frame = frameAt(now, 0, 12, 4), scale = model.scale || 1;
    if (model.burnUntil > now) {
      ctx.fillStyle = '#f58b4a';
      for (let index = 0; index < 4; index += 1) ctx.fillRect(Math.round(model.x - 12 + index * 8), Math.round(model.y + 25 - (index + frame) % 4 * 4), 4 * scale, 7 * scale);
      ctx.fillStyle = '#fff0c7'; ctx.fillRect(model.x - 2, model.y + 18 - frame, 4, 8);
    }
    if (model.slowedUntil > now) {
      const radius = 25 * scale + frame; ctx.strokeStyle = '#66d3c2'; ctx.lineWidth = 2; ctx.strokeRect(model.x - radius, model.y + 26 - radius / 4, radius * 2, radius / 2);
      ctx.fillStyle = '#66d3c2'; ctx.fillRect(model.x - radius - 3, model.y + 23, 6, 6); ctx.fillRect(model.x + radius - 3, model.y + 23, 6, 6);
    }
  }

  function drawTelegraph(ctx, model, now) {
    const telegraph = model.telegraph;
    if (!telegraph || telegraph.endsAt <= now) return;
    const p = normalizedProgress(now, telegraph.startsAt, telegraph.endsAt - telegraph.startsAt);
    ctx.save(); ctx.globalAlpha = .35 + p * .45;
    if (telegraph.shape === 'leap') {
      ctx.fillStyle = '#b68cff'; ctx.fillRect(model.x - 18, model.y + 30, 36 + p * 40, 10); ctx.fillRect(model.x + 22 + p * 20, model.y + 22, 12, 26);
    } else if (telegraph.shape === 'boss-area') {
      const radius = 25 + p * 55; ctx.strokeStyle = '#f58b4a'; ctx.lineWidth = 5; ctx.strokeRect(82 - radius, 252 - radius, radius * 2, radius * 2);
    } else if (telegraph.shape === 'thrust') {
      ctx.fillStyle = '#f3c95a'; ctx.fillRect(model.x - 5, model.y + 20, 10, 80); ctx.fillRect(model.x - 9, model.y + 94, 18, 9);
    } else {
      ctx.fillStyle = '#e76864'; ctx.fillRect(model.x - 45, model.y + 26, 90, 10); ctx.fillRect(model.x - 8, model.y + 8, 16, 50);
    }
    ctx.restore();
  }

  return { frameAt, normalizedProgress, appendEffect, pruneEffects, getReferenceSpriteCrop, setReferenceSpriteSheet, drawReferenceSprite, drawHero, drawAttackMotion, drawEnemy, drawSpriteGlow, drawBasicAttack, drawSkillEffect, drawEnemyAttack, drawStatusEffects, drawTelegraph, drawEffect };
});
