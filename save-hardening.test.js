const assert = require('assert');
const SaveGuard = require('./save-guard.js');

const guard = SaveGuard.createGuardForTest();
let count = 0;
assert.equal(guard.acceptOnce('result-1', () => { count += 1; }), true);
assert.equal(guard.acceptOnce('result-1', () => { count += 1; }), false);
assert.equal(count, 1);

const defaults = { version: 5, essence: 0, bestFloor: 0, unlockedWeapons: ['sword'], upgrades: { maxHp: 0, startingGold: 0 }, settings: { sound: true, vibration: true, reducedMotion: false, tutorialSeen: false } };
const valid = SaveGuard.sanitizeImportedSave({ version: 4, essence: 12, bestFloor: 8, unlockedWeapons: ['staff', 'staff'], upgrades: { maxHp: 2, startingGold: 1 }, settings: { sound: false } }, defaults);
assert.equal(valid.version, 5);
assert.deepEqual(valid.unlockedWeapons, ['staff', 'sword']);
assert.equal(valid.settings.sound, false);
assert.equal(SaveGuard.sanitizeImportedSave({ version: 5, essence: -1 }, defaults), null);
assert.equal(SaveGuard.sanitizeImportedSave({ version: 5, essence: 1, upgrades: { maxHp: 4 } }, defaults), null);
console.log('save hardening tests passed');
