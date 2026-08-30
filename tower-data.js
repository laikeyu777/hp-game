(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TowerData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const chapters = [
    { id: 'ember', start: 1, end: 10, name: '灰烬回廊', color: '#f58b4a', difficulty: { hp: 1, damage: 1, eliteChance: .08 }, enemies: [
      { id: 'servant', kind: 'servant', name: '灰烬侍从', hp: 48, damage: 7 },
      { id: 'hound', kind: 'hound', name: '回廊猎犬', hp: 34, damage: 5 },
      { id: 'guard', kind: 'guard', name: '裂甲守卫', hp: 66, damage: 10 },
    ], boss: { id: 'furnace-lord', kind: 'furnace-lord', name: '熔炉领主', hp: 420, damage: 14, skill: 'lava-crack' } },
    { id: 'frost', start: 11, end: 20, name: '霜蚀地窟', color: '#80d8ff', difficulty: { hp: 1.22, damage: 1.16, eliteChance: .12 }, enemies: [
      { id: 'ice-wraith', kind: 'ice-wraith', name: '冰骸', hp: 58, damage: 8 },
      { id: 'frost-wolf', kind: 'frost-wolf', name: '霜狼', hp: 44, damage: 7 },
      { id: 'cold-guard', kind: 'cold-guard', name: '寒甲卫', hp: 78, damage: 12 },
    ], boss: { id: 'frost-queen', kind: 'frost-queen', name: '霜蚀女王', hp: 520, damage: 16, skill: 'ice-spikes' } },
    { id: 'garden', start: 21, end: 30, name: '腐化温室', color: '#9fe36b', difficulty: { hp: 1.46, damage: 1.32, eliteChance: .16 }, enemies: [{ id:'thorn-bug', kind:'thorn-bug', name:'毒藤虫', hp:70, damage:9 }, { id:'rot-priest', kind:'rot-priest', name:'腐化祭司', hp:86, damage:11 }, { id:'spore-beast', kind:'spore-beast', name:'孢子巨兽', hp:112, damage:14 }], boss: { id: 'root-mother', kind: 'root-mother', name: '腐殖母树', hp: 650, damage: 18, skill: 'spore-cloud' } },
    { id: 'storm', start: 31, end: 40, name: '雷鸣观测台', color: '#8ab4ff', difficulty: { hp: 1.7, damage: 1.48, eliteChance: .2 }, enemies: [{ id:'thunder-bird', kind:'thunder-bird', name:'雷羽兽', hp:82, damage:12 }, { id:'mag-guard', kind:'mag-guard', name:'磁甲卫', hp:108, damage:15 }, { id:'light-wraith', kind:'light-wraith', name:'闪电幽魂', hp:76, damage:17 }], boss: { id: 'sky-executioner', kind: 'sky-executioner', name: '天穹执刑官', hp: 780, damage: 20, skill: 'thunder-mark' } },
    { id: 'void', start: 41, end: 50, name: '虚空王座', color: '#c38cff', difficulty: { hp: 1.94, damage: 1.64, eliteChance: .24 }, enemies: [{ id:'void-leech', kind:'void-leech', name:'虚空寄生体', hp:96, damage:15 }, { id:'rift-hound', kind:'rift-hound', name:'裂隙猎犬', hp:88, damage:18 }, { id:'star-guard', kind:'star-guard', name:'星陨卫', hp:132, damage:20 }], boss: { id: 'void-pioneer', kind: 'void-pioneer', name: '虚空先驱', hp: 960, damage: 23, skill: 'rift-burst' } },
  ];

  function getChapterForFloor(floor) {
    const value = Math.max(1, Math.min(50, Number(floor) || 1));
    return chapters.find(chapter => value >= chapter.start && value <= chapter.end) || chapters[0];
  }

  function getBossForFloor(floor) {
    const chapter = getChapterForFloor(floor);
    return Number(floor) === chapter.end ? chapter.boss : null;
  }

  function getEnemyPool(floor) {
    const chapter = getChapterForFloor(floor);
    return chapter.enemies;
  }

  function getDifficultyForFloor(floor) {
    const value = Math.max(1, Math.min(50, Number(floor) || 1));
    const chapter = getChapterForFloor(value);
    const chapterIndex = chapters.indexOf(chapter);
    const localProgress = (value - chapter.start) / Math.max(1, chapter.end - chapter.start);
    const globalProgress = (value - 1) / 49;
    return {
      enemyHp: chapter.difficulty.hp + localProgress * .12 + globalProgress * .08,
      enemyDamage: chapter.difficulty.damage + localProgress * .1 + globalProgress * .06,
      eliteChance: Math.min(.42, chapter.difficulty.eliteChance + localProgress * .08),
      chapterIndex,
    };
  }

  function validate() {
    const errors = [];
    let expectedStart = 1;
    chapters.forEach(chapter => {
      if (chapter.start !== expectedStart || chapter.end < chapter.start) errors.push(`章节范围无效：${chapter.id}`);
      if (!chapter.difficulty || chapter.difficulty.hp <= 0 || chapter.difficulty.damage <= 0) errors.push(`章节难度无效：${chapter.id}`);
      if (!Array.isArray(chapter.enemies) || chapter.enemies.length < 3) errors.push(`敌人数量不足：${chapter.id}`);
      chapter.enemies.forEach(enemy => { if (!(enemy.hp > 0) || !(enemy.damage > 0)) errors.push(`敌人属性无效：${enemy.id}`); });
      if (!chapter.boss || chapter.boss.hp <= 0 || chapter.boss.damage <= 0) errors.push(`Boss 属性无效：${chapter.id}`);
      expectedStart = chapter.end + 1;
    });
    if (expectedStart !== 51) errors.push('章节必须连续覆盖 1-50 层');
    for (let floor = 1; floor < 50; floor += 1) {
      const current = getDifficultyForFloor(floor), next = getDifficultyForFloor(floor + 1);
      if (next.enemyHp < current.enemyHp || next.enemyDamage < current.enemyDamage) errors.push(`难度曲线下降：${floor} -> ${floor + 1}`);
    }
    return { valid: errors.length === 0, errors };
  }

  return { chapters, getChapterForFloor, getBossForFloor, getEnemyPool, getDifficultyForFloor, validate };
});
