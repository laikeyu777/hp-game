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

  const HERO_PALETTE = {
    outline: '#151a18', hairLight: '#e7ece7', hair: '#b9c4bf', hairShadow: '#68736e',
    skin: '#d8a47f', emberEye: '#f58b4a', mask: '#27322f', brass: '#b78a43',
    armor: '#31584c', armorShadow: '#1c3931', leather: '#684434', cloak: '#793a36', detail: '#d8b071',
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
  const HERO_DETAIL_PARTS = [
    [8,10,3,2,'detail'], [12,16,3,2,'detail'], [6,20,3,3,'detail'],
    [23,20,3,3,'detail'], [10,26,2,2,'detail'], [18,27,2,2,'detail'],
    [5,34,3,2,'detail'], [24,34,3,2,'detail'], [11,41,3,2,'detail'],
    [20,41,3,2,'detail'], [27,21,3,2,'detail'],
  ];
  const HERO_ROLE_PALETTES = {
    sword: { heavyArmor:'#496f5d', heavyTrim:'#d6a46a', armor:'#496f5d', armorShadow:'#203c32', cloak:'#6e3538', cloakDark:'#3e2228', brass:'#d6a46a' },
    staff: { robe:'#244c73', robeLight:'#70b8d4', crystal:'#66f0dc', rune:'#c28cff', armor:'#244c73', armorShadow:'#172f4d', cloak:'#6550a0', cloakDark:'#34285e', trousers:'#1b263d', brass:'#8cc9e7', hairLight:'#dff8ff' },
    crossbow: { ranger:'#1f6570', rangerLight:'#77d6e5', metal:'#e0bd6f', bolt:'#fff0c7', armor:'#1f6570', armorShadow:'#153d47', cloak:'#2b7480', cloakDark:'#173d46', trousers:'#18343d', brass:'#e0bd6f', hairLight:'#d9e8ff' },
  };
  const HERO_ROLE_PARTS = {
    sword: [[6,0,20,2,'heavyArmor'],[4,2,24,3,'heavyArmor'],[2,5,5,8,'heavyArmor'],[25,5,5,8,'heavyArmor'],[1,18,8,9,'heavyArmor'],[23,18,8,9,'heavyArmor'],[6,27,5,5,'heavyTrim'],[22,27,5,5,'heavyTrim'],[8,31,16,4,'heavyArmor'],[11,32,2,2,'heavyTrim'],[21,32,2,2,'heavyTrim'],[27,35,4,3,'heavyTrim'],[4,27,4,3,'heavyTrim'],[24,27,4,3,'heavyTrim']],
    staff: [[8,0,16,2,'robe'],[5,2,22,3,'robe'],[3,5,4,10,'robe'],[25,5,4,10,'robe'],[6,28,20,12,'robe'],[4,33,5,10,'robe'],[23,33,5,10,'robe'],[8,39,16,6,'robe'],[9,29,3,2,'robeLight'],[20,29,3,2,'robeLight'],[27,8,7,2,'rune'],[29,7,3,3,'crystal'],[30,11,2,2,'crystal'],[6,40,4,4,'rune'],[22,40,4,4,'rune']],
    crossbow: [[8,0,14,2,'ranger'],[4,2,7,5,'ranger'],[19,2,9,5,'ranger'],[2,6,6,8,'ranger'],[25,6,6,8,'ranger'],[1,15,5,7,'rangerLight'],[24,15,7,7,'metal'],[5,26,5,11,'ranger'],[22,26,5,11,'ranger'],[26,32,7,10,'ranger'],[0,35,5,8,'ranger'],[6,19,4,6,'rangerLight'],[23,29,5,5,'ranger'],[27,36,5,2,'metal'],[28,23,4,2,'bolt'],[30,26,5,2,'metal']],
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

  function drawHero(ctx, model = {}) {
    const scale = Math.max(1, Math.round(model.scale || 2));
    const frame = model.reducedMotion ? 0 : (model.frame || 0) % 4;
    const x = Math.round((model.x || 0) - 16 * scale);
    const y = Math.round((model.y || 0) - 40 * scale);
    const weapon = HERO_ROLE_PALETTES[model.weapon] ? model.weapon : 'sword';
    const rolePalette = { ...HERO_PALETTE, ...HERO_ROLE_PALETTES[weapon] };
    const palette = model.hitFlash ? { ...rolePalette, skin: '#fff0c7', armor: '#fff0c7', armorShadow: '#e7ece7', cloak: '#fff0c7' } : rolePalette;
    const breathing = model.pose === 'attack' || model.reducedMotion ? 0 : (frame >= 2 ? 1 : 0);
    drawParts(ctx, HERO_PARTS, x, y, scale, palette, breathing);
    drawParts(ctx, HERO_DETAIL_PARTS, x, y, scale, palette, breathing);
    drawParts(ctx, HERO_ROLE_PARTS[weapon], x, y, scale, palette, breathing);
    if (!model.reducedMotion && frame >= 2) {
      drawParts(ctx, [[0,31,3,10,'cloak'],[2,39,5,3,'cloakDark']], x, y, scale, palette, 0, -1);
    }
    drawParts(ctx, WEAPON_PARTS[model.weapon] || WEAPON_PARTS.sword, x, y, scale, palette, model.pose === 'attack' ? -1 : 0);
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
  const ENEMY_DETAIL_PARTS = {
    servant: [[9,8,3,2,'detail'],[22,8,3,2,'detail'],[10,18,2,2,'detail'],[22,18,2,2,'detail'],[14,29,2,2,'detail'],[20,29,2,2,'detail']],
    hound: [[8,15,3,2,'detail'],[24,15,3,2,'detail'],[11,25,3,2,'detail'],[23,26,3,2,'detail'],[5,31,3,2,'detail']],
    guard: [[9,8,3,2,'detail'],[22,8,3,2,'detail'],[10,19,2,2,'detail'],[23,19,2,2,'detail'],[14,30,2,2,'detail'],[20,30,2,2,'detail']],
    boss: [[8,7,4,2,'detail'],[24,7,4,2,'detail'],[10,18,3,2,'detail'],[23,18,3,2,'detail'],[12,32,3,2,'detail'],[21,32,3,2,'detail'],[14,39,8,2,'detail']],
  };
  const THEMED_ENEMY_PARTS = {
    'ice-wraith': [[2,8,4,3,'core'],[0,12,5,15,'body'],[31,12,5,15,'body'],[3,27,4,8,'core'],[29,27,4,8,'core'],[8,40,4,6,'bodyDark'],[24,40,4,6,'bodyDark']],
    'frost-wolf': [[1,13,4,3,'mane'],[27,11,4,3,'core']],
    'cold-guard': [[3,8,4,4,'brass'],[25,8,4,4,'core'],[14,33,8,2,'brass'],[0,20,4,8,'armor'],[32,20,4,8,'armor'],[28,4,5,3,'spear']],
    'thorn-bug': [[2,8,4,3,'brass'],[28,8,4,3,'core'],[13,34,3,5,'spear'],[20,34,3,5,'spear'],[8,0,3,8,'brass'],[24,0,3,8,'brass'],[0,25,6,3,'spear'],[30,25,6,3,'spear'],[5,33,3,6,'brass'],[27,33,3,6,'brass']],
    'rot-priest': [[3,8,4,3,'core'],[27,8,4,3,'weapon'],[13,34,3,5,'core'],[20,34,3,5,'core'],[15,15,6,2,'weapon'],[6,0,24,6,'bodyDark'],[3,5,5,5,'body'],[28,5,5,5,'body'],[5,31,4,10,'bodyDark'],[27,31,4,10,'bodyDark']],
    'spore-beast': [[1,13,4,3,'mane'],[28,13,4,3,'core'],[11,34,4,5,'claw'],[21,34,4,5,'claw'],[15,16,7,3,'core'],[5,24,3,4,'mane'],[7,3,7,6,'mane'],[18,1,8,8,'mane'],[27,4,6,5,'mane'],[2,28,5,5,'claw'],[29,28,5,5,'claw']],
    'thunder-bird': [[1,9,6,3,'mane'],[28,9,6,3,'core'],[13,34,3,5,'claw'],[20,34,3,5,'claw'],[15,18,6,2,'core'],[7,22,3,3,'mane'],[26,22,3,3,'mane'],[0,10,10,5,'mane'],[30,10,10,5,'mane'],[34,22,6,5,'claw'],[2,26,5,3,'claw']],
    'mag-guard': [[3,8,4,4,'brass'],[25,8,4,4,'core'],[13,34,3,5,'spear'],[20,34,3,5,'spear'],[14,16,7,2,'brass'],[7,24,3,4,'armor'],[0,13,7,6,'armor'],[29,13,7,6,'armor'],[32,27,5,3,'spear']],
    'light-wraith': [[2,8,4,3,'core'],[28,8,4,3,'eye'],[12,34,4,4,'core'],[21,34,4,4,'core'],[15,16,6,2,'weapon'],[6,25,3,3,'core'],[27,25,3,3,'core'],[15,41,6,2,'weapon'],[0,12,9,5,'core'],[27,12,9,5,'core'],[4,17,5,4,'weapon'],[27,17,5,4,'weapon']],
    'void-leech': [[1,8,5,3,'core'],[27,8,5,3,'eye'],[12,34,4,4,'core'],[21,34,4,4,'core'],[15,16,7,3,'weapon'],[6,25,4,3,'bodyDark'],[26,25,4,3,'bodyDark'],[15,41,7,2,'core'],[3,20,3,5,'core'],[0,24,9,3,'core'],[27,24,9,3,'core'],[4,31,4,8,'bodyDark'],[28,31,4,8,'bodyDark']],
    'rift-hound': [[1,13,4,3,'mane'],[28,13,4,3,'core'],[10,34,4,4,'claw'],[22,34,4,4,'claw'],[15,16,7,3,'core'],[4,25,3,3,'mane'],[27,25,3,3,'mane'],[14,39,8,2,'core'],[0,24,3,3,'core'],[31,24,3,3,'core'],[0,12,8,5,'mane'],[31,12,8,5,'mane']],
    'star-guard': [[3,8,4,4,'brass'],[25,8,4,4,'core'],[11,34,4,5,'spear'],[21,34,4,5,'spear'],[14,16,8,2,'brass'],[5,24,4,4,'armor'],[25,24,4,4,'armor'],[15,41,7,2,'core'],[1,14,3,5,'core'],[30,14,3,5,'core'],[15,29,6,2,'brass'],[0,8,8,5,'armor'],[28,8,8,5,'armor'],[32,28,5,4,'spear']],
  };
  const BOSS_ROLE_PARTS = {
    'furnace-lord': [[5,1,5,5,'ember'],[25,1,5,5,'ember'],[6,17,4,9,'ember'],[26,17,4,9,'ember'],[14,22,8,8,'ember'],[0,9,8,6,'ember'],[28,9,8,6,'ember'],[2,28,6,5,'ember'],[28,28,6,5,'ember']],
    'frost-queen': [[10,0,4,6,'rift'],[16,0,4,5,'rift'],[22,0,4,6,'rift'],[5,18,4,8,'rift'],[27,18,4,8,'rift'],[14,22,8,3,'rift'],[7,4,4,8,'rift'],[25,4,4,8,'rift'],[0,27,8,4,'rift'],[28,27,8,4,'rift']],
    'root-mother': [[3,3,5,7,'rift'],[28,3,5,7,'rift'],[1,16,6,4,'rift'],[29,16,6,4,'rift'],[13,21,10,8,'rift'],[8,37,4,7,'rift'],[23,37,4,7,'rift'],[0,8,5,12,'rift'],[31,8,5,12,'rift'],[4,30,5,10,'rift'],[27,30,5,10,'rift']],
    'sky-executioner': [[6,5,6,3,'rift'],[26,5,6,3,'rift'],[0,14,8,4,'rift'],[28,14,8,4,'rift'],[14,20,8,5,'rift'],[30,29,5,3,'ember'],[0,7,12,5,'rift'],[24,7,12,5,'rift'],[4,12,8,5,'rift'],[24,12,8,5,'rift']],
    'void-pioneer': [[5,1,5,5,'rift'],[26,1,5,5,'rift'],[2,15,7,5,'rift'],[29,15,7,5,'rift'],[13,20,10,10,'rift'],[9,39,4,5,'rift'],[23,39,4,5,'rift'],[0,9,7,5,'rift'],[29,9,7,5,'rift'],[2,29,5,11,'rift'],[29,29,5,11,'rift']],
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
    const isBoss = ['boss', 'furnace-lord', 'frost-queen', 'root-mother', 'sky-executioner', 'void-pioneer'].includes(kind);
    const scale = Math.max(1, Math.round(model.scale || (isBoss ? 2 : 1)));
    const parts = ENEMY_PARTS[kind];
    const width = kind === 'hound' ? 40 : 36;
    const palette = model.hitFlash ? Object.fromEntries(Object.keys(ENEMY_PALETTES[kind]).map(key => [key, key === 'outline' ? '#e7ece7' : '#fff0c7'])) : { ...ENEMY_PALETTES[kind] };
    if (!palette.detail) palette.detail = '#d8b071';
    if (isBoss && model.bossPhase === 2) palette.rift = '#f58b4a';
    const bob = model.reducedMotion ? 0 : ((model.frame || 0) % 4 === 2 ? -1 : 0);
    drawParts(ctx, parts, model.x - width * scale / 2, model.y - 24 * scale, scale, palette, bob);
    const detailKind = ENEMY_DETAIL_PARTS[kind] ? kind : (isBoss ? 'boss' : (kind === 'hound' ? 'hound' : 'guard'));
    drawParts(ctx, ENEMY_DETAIL_PARTS[detailKind], model.x - width * scale / 2, model.y - 24 * scale, scale, palette, bob);
    if (THEMED_ENEMY_PARTS[kind]) drawParts(ctx, THEMED_ENEMY_PARTS[kind], model.x - width * scale / 2, model.y - 24 * scale, scale, palette, bob);
    if (isBoss && BOSS_ROLE_PARTS[kind]) drawParts(ctx, BOSS_ROLE_PARTS[kind], model.x - width * scale / 2, model.y - 24 * scale, scale, palette, bob);
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

  return { frameAt, normalizedProgress, appendEffect, pruneEffects, drawHero, drawEnemy, drawBasicAttack, drawSkillEffect, drawEnemyAttack, drawStatusEffects, drawTelegraph, drawEffect };
});
