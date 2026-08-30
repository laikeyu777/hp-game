const assert = require('assert');
const Tutorial = require('./tutorial.js');

assert.equal(Tutorial.shouldShow({ tutorialSeen: false }), true);
assert.equal(Tutorial.shouldShow({ tutorialSeen: true }), false);
assert.equal(Tutorial.steps().length, 3);
assert.equal(Tutorial.complete({ sound: true }).tutorialSeen, true);
console.log('tutorial tests passed');
