(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TowerData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const chapters = [
    { id: 'ember', start: 1, end: 10, name: '灰烬回廊', color: '#f58b4a', enemies: [
      { id: 'servant', kind: 'servant', name: '灰烬侍从', hp: 48, damage: 7 },
      { id: 'hound', kind: 'hound', name: '回廊猎犬', hp: 34, damage: 5 },
      { id: 'guard', kind: 'guard', name: '裂甲守卫', hp: 66, damage: 10 },
    ], boss: { id: 'furnace-lord', kind: 'furnace-lord', name: '熔炉领主', hp: 420, damage: 14, skill: 'lava-crack' } },
    { id: 'frost', start: 11, end: 20, name: '霜蚀地窟', color: '#80d8ff', enemies: [
      { id: 'ice-wraith', kind: 'ice-wraith', name: '冰骸', hp: 58, damage: 8 },
      { id: 'frost-wolf', kind: 'frost-wolf', name: '霜狼', hp: 44, damage: 7 },
      { id: 'cold-guard', kind: 'cold-guard', name: '寒甲卫', hp: 78, damage: 12 },
    ], boss: { id: 'frost-queen', kind: 'frost-queen', name: '霜蚀女王', hp: 520, damage: 16, skill: 'ice-spikes' } },
    { id: 'garden', start: 21, end: 30, name: '腐化温室', color: '#9fe36b', enemies: [{ id:'thorn-bug', kind:'thorn-bug', name:'毒藤虫', hp:70, damage:9 }, { id:'rot-priest', kind:'rot-priest', name:'腐化祭司', hp:86, damage:11 }, { id:'spore-beast', kind:'spore-beast', name:'孢子巨兽', hp:112, damage:14 }], boss: { id: 'root-mother', kind: 'root-mother', name: '腐殖母树', hp: 650, damage: 18, skill: 'spore-cloud' } },
    { id: 'storm', start: 31, end: 40, name: '雷鸣观测台', color: '#8ab4ff', enemies: [{ id:'thunder-bird', kind:'thunder-bird', name:'雷羽兽', hp:82, damage:12 }, { id:'mag-guard', kind:'mag-guard', name:'磁甲卫', hp:108, damage:15 }, { id:'light-wraith', kind:'light-wraith', name:'闪电幽魂', hp:76, damage:17 }], boss: { id: 'sky-executioner', kind: 'sky-executioner', name: '天穹执刑官', hp: 780, damage: 20, skill: 'thunder-mark' } },
    { id: 'void', start: 41, end: 50, name: '虚空王座', color: '#c38cff', enemies: [{ id:'void-leech', kind:'void-leech', name:'虚空寄生体', hp:96, damage:15 }, { id:'rift-hound', kind:'rift-hound', name:'裂隙猎犬', hp:88, damage:18 }, { id:'star-guard', kind:'star-guard', name:'星陨卫', hp:132, damage:20 }], boss: { id: 'void-pioneer', kind: 'void-pioneer', name: '虚空先驱', hp: 960, damage: 23, skill: 'rift-burst' } },
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

  return { chapters, getChapterForFloor, getBossForFloor, getEnemyPool };
});
