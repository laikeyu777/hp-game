const assert = require('assert');
const RunScore = require('./run-score.js');
const { test } = require('node:test');

test('normal and daily runs share the same positive score calculation', () => {
  const result = RunScore.summarize({
    completedFloors: 8,
    enemiesDefeated: 16,
    bossesDefeated: 1,
    hpRatio: 0.75,
    gold: 20,
    durationMs: 120000,
    cleared: false,
  });

  assert.ok(result.score > 0);
  assert.equal(result.breakdown.floors, 8000);
  assert.equal(result.score, 9715);
});

test('balance simulator reports comparable weapon metrics across fifty floors', () => {
  const Balance = require('./balance-simulator.js');
  const report = Balance.simulateAll();
  assert.deepEqual(Object.keys(report), ['sword', 'staff', 'crossbow']);
  Object.values(report).forEach(metric => {
    assert.equal(metric.floors, 50);
    assert.ok(metric.totalSeconds > 0);
    assert.ok(metric.survivalRatio > 0 && metric.survivalRatio <= 1);
  });
});
