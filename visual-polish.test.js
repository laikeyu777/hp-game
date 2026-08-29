const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('./index.html', 'utf8');
const css = fs.readFileSync('./styles.css', 'utf8');

assert.equal((html.match(/data-surface=/g) || []).length, 10);
assert.ok(css.includes('--surface-3'));
assert.ok(css.includes('.app-shell::before'));
assert.ok(css.includes('.route-card::after'));
assert.ok(css.includes('.skill-btn::before'));
assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));

console.log('visual polish tests passed');
