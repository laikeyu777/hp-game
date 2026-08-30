const assert = require('assert');
const fs = require('fs');

const game = fs.readFileSync('./game.js', 'utf8');
const html = fs.readFileSync('./index.html', 'utf8');
const serviceWorker = fs.readFileSync('./sw.js', 'utf8');
assert.ok(game.includes('submitRunResult=(won)=>won&&state.floor!==50?null:submitRunResultOriginal(won)'));
assert.ok(html.includes('game.js?v=21'));
assert.ok(serviceWorker.includes('ash-corridor-v39'));
assert.ok(serviceWorker.includes('game.js?v=21'));

console.log('floor progression tests passed');
