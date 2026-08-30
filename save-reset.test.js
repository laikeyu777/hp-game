const assert = require('assert');
const fs = require('fs');

const game = fs.readFileSync('./game.js', 'utf8');

assert.ok(game.includes('function cloneSave(value){return JSON.parse(JSON.stringify(value))}'));
assert.ok(game.includes('save=cloneSave(defaultSave)'));

console.log('save reset tests passed');
