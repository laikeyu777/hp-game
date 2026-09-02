const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('exposes distinct ember and revive rewarded-video controls', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('styles.css', 'utf8');

  for (const id of ['essence-ad-btn', 'essence-ad-status', 'revive-ad-panel', 'revive-ad-btn', 'revive-ad-status']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(css, /\.essence-ad-btn\{[^}]*width:44px[^}]*height:44px/);
  assert.match(css, /\.revive-ad-btn\{[^}]*min-height:52px/);
});

test('loads local ad rules before gameplay and precaches the same script', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const serviceWorker = fs.readFileSync('sw.js', 'utf8');

  assert.ok(html.indexOf('ad-rewards.js?v=1') >= 0);
  assert.ok(html.indexOf('ad-rewards.js?v=1') < html.indexOf('game.js'));
  assert.ok(serviceWorker.includes('ad-rewards.js?v=1'));
});

test('orchestrates both placements through the official adapter and holds failure rewards', () => {
  const game = fs.readFileSync('game.js', 'utf8');

  assert.match(game, /HupuPlatform\.showRewardedAd\(\{placement:'essence'\}\)/);
  assert.match(game, /HupuPlatform\.showRewardedAd\(\{placement:'revive'\}\)/);
  assert.match(game, /AdRewards\.REVIVE_HP_RATIO/);
  assert.match(game, /state\.pendingFailure/);
  assert.match(game, /function finalizeFailure\(/);
  assert.match(game, /save\.ads=AdRewards\.sanitizeState/);
});

test('does not offer a revive after the player explicitly ends a run', () => {
  const game = fs.readFileSync('game.js', 'utf8');
  assert.match(game, /\$\('#quit-btn'\)\.onclick=\(\)=>\{\$\('#pause-overlay'\)\.classList\.add\('hidden'\);finish\(false,false\)\}/);
});
