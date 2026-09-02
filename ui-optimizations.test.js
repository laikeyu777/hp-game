const assert = require('assert');
const fs = require('fs');

const game = fs.readFileSync('./game.js', 'utf8');
const html = fs.readFileSync('./index.html', 'utf8');
const sw = fs.readFileSync('./sw.js', 'utf8');

assert.ok(game.includes("unlockedWeapons:[...new Set([...(save.unlockedWeapons||[]),'sword'])]"));
assert.ok(game.includes("route-screen"));
assert.ok(game.includes("touchstart"));
assert.ok(game.includes("touchend"));
assert.ok(game.includes("damagePopups"));
assert.ok(game.includes("drawDamagePopups"));
assert.ok(game.includes("navigator.vibrate"));
assert.ok(game.includes("save.settings.sound"));
assert.ok(game.includes("save.settings.vibration"));
assert.ok(html.includes('game.js?v=26'));
assert.ok(html.includes('shop-screen'));
assert.ok(sw.includes('ash-corridor-v36'));
