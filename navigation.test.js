const assert = require('assert');
const fs = require('fs');

const game = fs.readFileSync('./game.js', 'utf8');

assert.ok(game.includes('function showRecords(){renderRecords()}'));

console.log('navigation tests passed');
