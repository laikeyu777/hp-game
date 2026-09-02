const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('browser page and offline cache load leaderboard validation before the Hupu adapter', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const serviceWorker = fs.readFileSync('sw.js', 'utf8');
  assert.ok(html.indexOf('leaderboard-logic.js') >= 0);
  assert.ok(html.indexOf('leaderboard-logic.js') < html.indexOf('hupu-platform.js'));
  assert.ok(serviceWorker.includes('leaderboard-logic.js'));
});
