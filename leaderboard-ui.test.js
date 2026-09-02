const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;

function read(name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

test('lobby exposes a leaderboard route and the leaderboard view has list, tabs, and current-player regions', () => {
  const html = read('index.html');

  assert.match(html, /id="leaderboard-btn"/);
  assert.match(html, /id="leaderboard-screen"/);
  assert.match(html, /id="leaderboard-tabs"/);
  assert.match(html, /id="leaderboard-list"/);
  assert.match(html, /id="leaderboard-me"/);
});

test('leaderboard UI supports both scopes, cached fallback, and result sync copy', () => {
  const game = read('game.js');

  assert.match(game, /renderLeaderboard\(/);
  assert.match(game, /loadLeaderboard\(/);
  assert.match(game, /daily/);
  assert.match(game, /all/);
  assert.match(game, /LeaderboardStore\.getCached/);
  assert.match(game, /已同步/);
  assert.match(game, /待同步/);
  assert.match(game, /同步失败/);
});

test('leaderboard screen uses a refreshed stylesheet version for its new mobile styles', () => {
  const html = read('index.html');

  assert.match(html, /href="styles\.css\?v=13"/);
});
