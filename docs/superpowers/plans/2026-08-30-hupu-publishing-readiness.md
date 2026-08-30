# 虎扑发布资格版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将《一指登塔：灰烬回廊》完善为可在虎扑社区演示和提交审核的离线优先手机 H5 版本。

**Architecture:** 游戏核心继续由 `game.js` 驱动，外部能力通过纯 JavaScript 适配器隔离。分享先使用系统分享和复制回退；复活先使用离线模拟广告，未来只替换适配器，不修改战斗和存档规则。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Canvas、localStorage、IndexedDB、Node.js 内置 `assert` 测试。

## Global Constraints

- 首阶段不依赖虎扑私有接口、账号系统或广告网络。
- 主要适配 390 x 844 手机竖屏，主要点击区域不小于 44 x 44 px。
- 游戏无网络时仍可进入主菜单并开始普通冒险。
- 分享取消、剪贴板不可用、虎扑未安装时必须有可用回退路径。
- 每局复活最多成功一次；复活恢复 35% 最大生命值并提供 2 秒保护。
- 继续使用 localStorage + IndexedDB 双写存档，奖励发放必须幂等。

---

### Task 1: 外部能力适配器

**Files:**
- Create: `share-adapter.js`
- Create: `share-adapter.test.js`
- Create: `reward-adapter.js`
- Create: `reward-adapter.test.js`
- Modify: `index.html:52-69`

**Interfaces:**
- `ShareAdapter.createResultText(result)` returns a string.
- `ShareAdapter.share(text, context)` returns `Promise<{ ok: boolean, method: string }>`.
- `RewardAdAdapter.showRewardedAd()` returns `Promise<{ rewarded: boolean, reason?: string }>`.

- [ ] **Step 1: Write failing adapter tests**

```js
const assert = require('assert');
const ShareAdapter = require('./share-adapter.js');
const RewardAdAdapter = require('./reward-adapter.js');

assert.match(ShareAdapter.createResultText({ title: '一指登塔：灰烬回廊', score: 1234, completedFloors: 8 }), /1234/);
assert.equal(typeof ShareAdapter.share, 'function');
(async () => {
  const demo = RewardAdAdapter.createDemo({ delayMs: 0 });
  const result = await demo.showRewardedAd();
  assert.equal(result.rewarded, true);
})();
```

- [ ] **Step 2: Run tests and verify the adapters are missing**

Run: `node share-adapter.test.js`

Expected: FAIL because `share-adapter.js` and `reward-adapter.js` do not exist.

- [ ] **Step 3: Implement browser-safe adapters**

`ShareAdapter.share` must try `navigator.share`, then `navigator.clipboard.writeText`, then a temporary textarea selection. It must never throw for a missing browser API. After a successful copy fallback, open `https://bbs.hupu.com/` with `window.open` when available. `RewardAdAdapter.createDemo({ delayMs })` resolves `{ rewarded: true, reason: 'demo' }` after the delay unless the returned controller is cancelled.

- [ ] **Step 4: Register scripts and rerun tests**

Run: `node share-adapter.test.js && node reward-adapter.test.js`

Expected: PASS with no unhandled promise rejection.

- [ ] **Step 5: Commit**

```bash
git add share-adapter.js share-adapter.test.js reward-adapter.js reward-adapter.test.js index.html
git commit -m "feat: add share and reward adapters"
```

### Task 2: 结算分享与复活流程

**Files:**
- Modify: `game.js:40-50,62-64`
- Modify: `index.html:43-45`
- Modify: `styles.css` result and modal sections
- Create: `result-flow.js`
- Create: `result-flow.test.js`

**Interfaces:**
- `buildShareResult(result)` maps the current run to the share adapter payload.
- `tryRevive()` only mutates a failed run after `showRewardedAd()` returns `rewarded: true`.

- [ ] **Step 1: Write failing behavior tests**

```js
const assert = require('assert');
const Flow = require('./result-flow.js').createFlowForTest;

(async () => {
  const flow = Flow({ hp: 0, maxHp: 100, reviveUsed: false });
  assert.equal(flow.canRevive(), true);
  await flow.revive(Promise.resolve({ rewarded: true }));
  assert.equal(flow.hp, 35);
  assert.equal(flow.reviveUsed, true);
  await flow.revive(Promise.resolve({ rewarded: true }));
  assert.equal(flow.hp, 35);
})();
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node result-flow.test.js`

Expected: FAIL because the test flow and revive guard do not exist.

- [ ] **Step 3: Add result controls**

Add a `分享虎扑` button, a `再来一局` button, and a `复活` button shown only on failed normal/daily/deep runs. The share handler calls `ShareAdapter.createResultText` and `ShareAdapter.share`, then shows a short success or failure toast. The result payload includes mode, floor, weapon, boss count, duration, score and challenge code when present.

- [ ] **Step 4: Implement one-time revive**

Add `state.reviveUsed` and `state.invulnerabilityUntil`. On a failed run, show the revive button. On success from `RewardAdAdapter.showRewardedAd`, set `state.hp = Math.max(1, Math.round(state.maxHp * .35))`, `state.reviveUsed = true`, `state.invulnerabilityUntil = performance.now() + 2000`, restart combat timers and return to `battle-screen`. Cancelled or failed ads leave HP, essence and records unchanged.

- [ ] **Step 5: Rerun tests and commit**

Run: `node result-flow.test.js && node challenge-system.test.js`

Expected: PASS; failed runs still submit exactly one record.

```bash
git add game.js index.html styles.css result-flow.js result-flow.test.js
git commit -m "feat: add result sharing and one-time revive"
```

### Task 3: 新手引导、设置与发布说明

**Files:**
- Create: `tutorial.js`
- Create: `tutorial.test.js`
- Modify: `game.js:8-18,62-64`
- Modify: `index.html:47-50`
- Modify: `styles.css`
- Modify: `manifest.json`

**Interfaces:**
- `Tutorial.shouldShow(settings)` returns boolean.
- `Tutorial.steps()` returns the ordered onboarding steps.
- `Tutorial.complete(settings)` returns updated settings with `tutorialSeen: true`.

- [ ] **Step 1: Write failing tutorial tests**

```js
const assert = require('assert');
const Tutorial = require('./tutorial.js');
assert.equal(Tutorial.shouldShow({ tutorialSeen: false }), true);
assert.equal(Tutorial.shouldShow({ tutorialSeen: true }), false);
assert.ok(Tutorial.steps().length >= 3);
```

- [ ] **Step 2: Implement first-run overlay**

Show three concise steps: automatic attacks, route selection, and active skill/reward selection. Add `再次查看引导` to settings and persist `tutorialSeen` after completion. The overlay must be dismissible and must not block returning users who already completed it.

- [ ] **Step 3: Add publish information**

Add version, creator label, offline-save explanation, privacy statement and feedback link to settings. Add `reducedMotion` and `tutorialSeen` to defaults and migration logic. Update `manifest.json` description and `sw.js` cache version for the new asset.

- [ ] **Step 4: Run tests and commit**

Run: `node tutorial.test.js && node ui-optimizations.test.js`

Expected: PASS; no horizontal overflow introduced in the 390 x 844 layout.

```bash
git add tutorial.js tutorial.test.js game.js index.html styles.css manifest.json sw.js
git commit -m "feat: add onboarding and publishing information"
```

### Task 4: 50 层难度与数据校验

**Files:**
- Modify: `tower-data.js`
- Modify: `tower-data.test.js`
- Modify: `game.js:29-35`
- Create: `balance.test.js`

**Interfaces:**
- `TowerData.validate()` returns `{ valid: boolean, errors: string[] }`.
- `TowerData.getDifficultyForFloor(floor)` returns `{ enemyHp, enemyDamage, eliteChance }`.

- [ ] **Step 1: Add failing balance assertions**

```js
const assert = require('assert');
const TowerData = require('./tower-data.js');
for (let floor = 1; floor <= 50; floor += 1) {
  assert.equal(TowerData.getChapterForFloor(floor) != null, true);
  assert.ok(TowerData.getEnemyPool(floor).length >= 3);
}
assert.equal(TowerData.getBossForFloor(10).id, 'furnace-lord');
assert.equal(TowerData.getBossForFloor(50).id, 'void-pioneer');
```

- [ ] **Step 2: Implement validation and continuous scaling**

Keep five 10-floor chapters and existing boss IDs. Add explicit difficulty metadata per chapter and a clamped continuous curve for HP, damage and elite chance. Validate chapter ranges are contiguous, enemy stats are positive, boss floors are chapter endpoints, and every chapter has three enemies.

- [ ] **Step 3: Connect battle generation to the curve**

Use `TowerData.getDifficultyForFloor` in `makeEnemies`. Preserve left/middle/right route multipliers and apply elite scaling after the base curve. Ensure Boss floors always create exactly one Boss enemy and still use ascension modifiers.

- [ ] **Step 4: Run data and combat tests**

Run: `node tower-data.test.js && node balance.test.js && node boss-mechanics.test.js && node combat-effects.test.js`

Expected: PASS; difficulty values never decrease between adjacent floors except for route-specific multipliers.

- [ ] **Step 5: Commit**

```bash
git add tower-data.js tower-data.test.js balance.test.js game.js
git commit -m "feat: validate and tune fifty-floor difficulty"
```

### Task 5: 存档幂等性与发布级错误处理

**Files:**
- Modify: `game.js:11-13,40-48,61-64`
- Modify: `challenge-system.js`
- Create: `save-guard.js`
- Create: `save-hardening.test.js`

**Interfaces:**
- `SaveGuard.acceptOnce(key, action)` runs an action once per run key.
- `sanitizeImportedSave(value)` returns a valid migrated save or `null` without mutating current state.

- [ ] **Step 1: Add failing save tests**

```js
const assert = require('assert');
const SaveGuard = require('./save-guard.js').createGuardForTest;
const guard = SaveGuard();
let count = 0;
assert.equal(guard.acceptOnce('result-1', () => { count += 1; }), true);
assert.equal(guard.acceptOnce('result-1', () => { count += 1; }), false);
assert.equal(count, 1);
```

- [ ] **Step 2: Implement import validation and reward guards**

Validate `version`, numeric ranges, known weapons, upgrade levels, settings booleans and nested challenge records before replacing `save`. Add run-level flags preventing duplicate essence, achievement and challenge submission. Keep active combat non-resumable after a refresh.

- [ ] **Step 3: Verify migration and error paths**

Run: `node save-hardening.test.js && node challenge-system.test.js && node achievements.test.js`

Expected: PASS; malformed imports leave the existing save unchanged and duplicate result callbacks do not add essence twice.

- [ ] **Step 4: Commit**

```bash
git add game.js challenge-system.js save-hardening.test.js
git commit -m "fix: harden saves and reward idempotency"
```

### Task 6: 浏览器与虎扑内置浏览器验收

**Files:**
- Modify: `sw.js`
- Modify: `styles.css` only for verified layout defects
- Create: `docs/superpowers/plans/2026-08-30-hupu-publishing-qa.md`

- [ ] **Step 1: Run the complete Node test suite**

Run: `Get-ChildItem -Filter '*.test.js' | ForEach-Object { node $_.FullName }`

Expected: every test exits with code 0.

- [ ] **Step 2: Start the local server**

Run: `npx serve -l 4173 .`

Expected: the game is reachable at `http://127.0.0.1:4173/` without network assets.

- [ ] **Step 3: Verify 390 x 844 behavior**

Check first launch tutorial, weapon selection, route swipe, automatic attack, skill cast, floor recovery, Boss telegraph, failed result, one-time revive, share fallback, import/export and settings. Confirm `document.documentElement.scrollWidth <= window.innerWidth`, no console errors, and all primary buttons have at least 44 x 44 CSS pixels.

- [ ] **Step 4: Verify desktop fallback and offline reload**

Load once, disable network, reload, and start a normal run. Confirm the Service Worker serves all scripts and styles and no online request is required for core play.

- [ ] **Step 5: Record QA evidence and commit**

```bash
git add sw.js docs/superpowers/plans/2026-08-30-hupu-publishing-qa.md
git commit -m "test: verify hupu publishing build"
```
