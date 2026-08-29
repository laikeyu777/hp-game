# 每日挑战与个人最佳记录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有离线爬塔原型中加入可分享的每日挑战码、固定随机挑战、综合评分和本地个人最佳记录。

**Architecture:** 新增无 DOM 依赖的 `challenge-system.js`，负责挑战码、日期、可复现随机流、评分、记录更新和分享文本。`game.js` 负责模式状态和将分类随机流注入现有战斗；`index.html`/`styles.css` 增加每日挑战、记录和结算展示；现有 localStorage + IndexedDB 持久化升级到 v5，并对 v4 存档做深度补齐。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Canvas、IndexedDB、localStorage、Node.js 内置 `node:test`。

## Global Constraints

- 每日挑战按北京时间（Asia/Shanghai）自然日切换。
- 每日挑战禁用永久生命、金币、韧性和稀有率加成，只允许已解锁武器与主动技能。
- 游戏完全离线，不新增网络依赖、账号或服务器接口。
- 挑战码格式为 `ASH-YYYYMMDD-V<规则版本>-<四位校验码>`，当前规则版本为 `1`。
- `recentRecords` 最多保留 30 条正式每日挑战结算；中断局不写入记录。
- 保持 390 x 844 竖屏、无横向溢出、主要点击区域至少 44 x 44 px。
- 所有文件编辑使用 `apply_patch`，不覆盖与本功能无关的用户改动。

---

### Task 1: 固定挑战码与评分纯函数

**Files:**
- Create: `challenge-system.js`
- Create: `challenge-system.test.js`

**Interfaces:**
- Produces `createDailyChallenge(dateInput, rulesVersion = 1)`, `parseChallengeCode(code)`, `createSeededRandom(seed)`, `createRandomStream(challenge, category, floor = 0, index = 0)`, `calculateScore(summary)`, `compareResults(left, right)`, `updatePersonalBest(challengeSave, result, mode)`, `sanitizeChallengeSave(value)`, `formatDuration(durationMs)`, `formatShareText(result)`.

- [ ] **Step 1: Write failing tests for date, code and seeded random.**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Challenge from './challenge-system.js';

test('same Beijing date creates the same canonical code', () => {
  const a = Challenge.createDailyChallenge('2026-08-30T01:00:00Z');
  const b = Challenge.createDailyChallenge('2026-08-30T23:00:00+08:00');
  assert.equal(a.code, b.code);
  assert.match(a.code, /^ASH-20260830-V1-[A-Z0-9]{4}$/);
});

test('challenge code parses case-insensitively and rejects checksum errors', () => {
  const code = Challenge.createDailyChallenge('2026-08-30').code;
  assert.equal(Challenge.parseChallengeCode(code.toLowerCase()).valid, true);
  assert.equal(Challenge.parseChallengeCode(code.replace(/.$/, 'X')).valid, false);
});

test('seeded streams are repeatable and scoped by category and floor', () => {
  const challenge = Challenge.createDailyChallenge('2026-08-30');
  const a = Challenge.createRandomStream(challenge, 'rewards', 4, 0);
  const b = Challenge.createRandomStream(challenge, 'rewards', 4, 0);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.notEqual(a(), Challenge.createRandomStream(challenge, 'events', 4, 0)());
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the module is absent.**

Run: `node --test challenge-system.test.js`

Expected: FAIL with module-not-found or missing export errors.

- [ ] **Step 3: Implement canonical date conversion, checksum and deterministic streams.**

Use `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })` to derive `YYYY-MM-DD`. Hash the string `ash-corridor:${date}:${rulesVersion}` with a small 32-bit integer hash; encode the low 20 bits into four base-36 uppercase characters for the checksum and seed. `createRandomStream` hashes `seed:category:floor:index` and returns a Mulberry32-style function yielding numbers in `[0, 1)`.

- [ ] **Step 4: Add scoring, comparison, record sanitation and formatting tests.**

```js
test('score includes clear and speed bonuses only for a floor 50 clear', () => {
  const result = Challenge.calculateScore({ completedFloors: 50, enemiesDefeated: 100, bossesDefeated: 5, hpRatio: 0.5, gold: 20, durationMs: 300000, cleared: true });
  assert.equal(result.score, 50_000 + 4_000 + 3_000 + 250 + 100 + 10_000 + 3_000);
});

test('personal best updates weapon, highest floor and recent record cap', () => {
  let save = Challenge.sanitizeChallengeSave({});
  for (let i = 0; i < 31; i += 1) save = Challenge.updatePersonalBest(save, { code: `ASH-202608${String(i + 1).padStart(2, '0')}-V1-AAAA`, score: i, completedFloors: i, durationMs: 1000, hpRatio: 0, weapon: 'sword', cleared: false, submittedAt: new Date(i * 1000).toISOString() }, 'daily');
  assert.equal(save.recentRecords.length, 30);
  assert.equal(save.personalBest.highestFloor, 31);
});
```

- [ ] **Step 5: Implement `calculateScore`, tie-break comparison, v5 shape sanitation, duration and share text.**

`calculateScore` returns `{ score, breakdown }`; failed runs exclude the current unfinished floor. `updatePersonalBest` updates `personalBest`, `dailyBest[code]`, and prepends a daily record while clipping to 30. Ignore malformed records and unknown weapons.

- [ ] **Step 6: Run focused tests and commit the pure module.**

Run: `node --test challenge-system.test.js`

Expected: PASS for all challenge-system tests.

Commit: `git add challenge-system.js challenge-system.test.js; git commit -m "feat: add deterministic daily challenge rules"`

### Task 2: 存档 v5 与游戏模式状态

**Files:**
- Modify: `game.js:8-13,22,36-43,55`
- Modify: `sw.js:2-3`
- Test: `challenge-system.test.js` (migration unit coverage)

**Interfaces:**
- Consumes `Challenge.sanitizeChallengeSave`, `Challenge.createDailyChallenge`, `Challenge.createRandomStream`, and `Challenge.updatePersonalBest`.
- Produces `save.challenge`, `state.mode`, `state.challenge`, `state.runStats.startedAt`, `state.runStats.activeMs` and `state.runStats.challengeSubmitted`.

- [ ] **Step 1: Add failing migration tests for v4 saves and invalid records.**

```js
test('v4 challenge save migrates to an empty v5 shape', () => {
  const save = Challenge.sanitizeChallengeSave({ personalBest: { highestFloor: 4 } });
  assert.equal(save.personalBest.highestFloor, 4);
  assert.equal(save.personalBest.highestScore, 0);
  assert.deepEqual(save.personalBest.weapons, { sword: 0, staff: 0, crossbow: 0 });
});
```

- [ ] **Step 2: Run migration tests to verify they fail before integration.**

Run: `node --test challenge-system.test.js`

- [ ] **Step 3: Upgrade `defaultSave` and `loadSave` to version 5.**

Deep-merge `challenge` through `sanitizeChallengeSave`; keep existing weapon, skill, ascension, achievement and codex migration behavior. Persist the normalized save after load. Update the Service Worker cache name and append `challenge-system.js` plus current query versions to `ASSETS`.

- [ ] **Step 4: Add mode helpers and menu entry points.**

Implement `startDailyChallenge(challenge)` and `startRun(mode = 'normal', challenge = null)`. Daily mode sets `state.mode = 'daily'`, zeroes permanent stat effects for `maxHp`, `gold`, resilience and rarity, and stores the challenge object; normal mode preserves current behavior. Add `showDailyChallenge` and `showRecords` placeholders wired to buttons for the next UI task.

- [ ] **Step 5: Run all existing tests and commit state integration.**

Run: `node --test *.test.js`

Expected: all pre-existing tests remain PASS.

Commit: `git add game.js sw.js challenge-system.test.js; git commit -m "feat: add daily challenge save state"`

### Task 3: 固定随机注入与运行统计

**Files:**
- Modify: `game.js:25,28,32,37-40,53`
- Modify: `room-logic.js` only if an additional random parameter is needed
- Modify: `combat-logic.js` only if an additional random parameter is needed
- Test: `game-visual-integration.test.js` or a new `daily-challenge-integration.test.js`

**Interfaces:**
- Consumes `state.challenge` and `Challenge.createRandomStream`.
- Produces deterministic random calls for rooms, rewards, events, combat procs and Boss choices; increments `state.runStats.enemiesDefeated`, `bossesDefeated`, `completedFloors`.

- [ ] **Step 1: Write integration tests for random injection and fairness.**

Assert that daily mode's `getRunRandom(category, floor, index)` returns the same sequence across two runs, and that `getRunBonuses()` does not include permanent max HP, starting gold, resilience or rarity. Assert normal mode still includes those upgrades.

- [ ] **Step 2: Run the integration test to capture the failing behavior.**

Run: `node --test daily-challenge-integration.test.js`

- [ ] **Step 3: Add `getRunRandom` helper and route each random site through a named stream.**

Replace `Math.random()` in `autoAttack`, `advanceAfterReward`, `showRewards`, `showEvent`, room selection and hit effects with `getRunRandom('combat' | 'events' | 'rewards' | 'rooms' | 'boss', floor, sequence)`. Preserve `Math.random` for normal mode. Pass the stream into existing `RoomLogic.getRouteRoom(routeId, random)` and `CombatLogic.applyHitEffects({ random })`.

- [ ] **Step 4: Track defeated enemies and completed floors exactly once.**

Increment enemy stats in `settleDefeats` only when an enemy transitions from positive HP to zero. Increment completed floors in `finish(true)` for non-final floors and set 50 on victory. Store a monotonic `startedAt`/`activeMs` pair that excludes pause duration.

- [ ] **Step 5: Run all tests and commit deterministic gameplay.**

Run: `node --test *.test.js`

Expected: all tests PASS, including new deterministic sequence checks.

Commit: `git add game.js room-logic.js combat-logic.js daily-challenge-integration.test.js; git commit -m "feat: seed daily challenge gameplay"`

### Task 4: 每日挑战与个人记录界面

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `game.js`
- Test: `ui-optimizations.test.js`, `game-visual-integration.test.js`

**Interfaces:**
- Consumes `state.challenge`, `save.challenge`, `Challenge.formatDuration`, and `Challenge.formatShareText`.
- Produces touch-friendly screens `daily-screen` and `records-screen`, plus daily-specific result fields.

- [ ] **Step 1: Add DOM fixture tests for required IDs and no horizontal overflow constraints.**

Check for `daily-screen`, `records-screen`, `daily-code`, `daily-code-input`, `daily-start-btn`, `records-high-score`, `records-fastest`, `records-floor`, `records-weapons`, `daily-copy-btn`, and `result-score`.

- [ ] **Step 2: Run UI tests before markup changes and verify missing selectors fail.**

Run: `node --test ui-optimizations.test.js game-visual-integration.test.js`

- [ ] **Step 3: Add compact mobile markup.**

Place `每日挑战` and `个人记录` buttons on the menu. Daily screen shows canonical code, copy action, code input, validation message, weapon/skill summary, daily best and start button. Records screen shows four headline metrics, per-weapon rows, today's best and recent records. Result screen adds score, breakdown, duration, code, new-record labels and copy-score action.

- [ ] **Step 4: Add styling consistent with existing dark tower UI.**

Use existing variables and panel patterns, keep controls at least 44px high, make records list scroll vertically inside the screen, and add `overflow-x: hidden` only at the page boundary without hiding needed content.

- [ ] **Step 5: Wire interactions and clipboard fallback.**

Normalize input with `trim().toUpperCase()`, call `Challenge.parseChallengeCode`, display validation errors, and start the parsed challenge. Implement `navigator.clipboard.writeText` with a temporary textarea fallback. Render empty states and preserve menu/back navigation.

- [ ] **Step 6: Run tests and commit UI.**

Run: `node --test *.test.js`

Commit: `git add index.html styles.css game.js ui-optimizations.test.js game-visual-integration.test.js; git commit -m "feat: add daily challenge and records screens"`

### Task 5: 结算提交、导入导出与浏览器验收

**Files:**
- Modify: `game.js`
- Modify: `index.html` only for final result copy text if needed
- Modify: `sw.js` cache version if assets changed
- Test: `daily-challenge-integration.test.js`, existing test suite

**Interfaces:**
- Consumes `Challenge.calculateScore`, `Challenge.updatePersonalBest`, `Challenge.compareResults`, and persisted v5 save.
- Produces correct normal/daily result presentation and durable export/import behavior.

- [ ] **Step 1: Add failing tests for result submission rules.**

Cover a floor-50 victory updating fastest clear and weapon score, a failed daily run updating highest floor but not fastest clear, a quit/interrupted run not adding `recentRecords`, and duplicate challenge submissions retaining only the better `dailyBest`.

- [ ] **Step 2: Run focused integration tests and verify failures.**

Run: `node --test daily-challenge-integration.test.js`

- [ ] **Step 3: Implement `submitRunResult` and call it exactly once from `finish`.**

Build the summary from `state.runStats`, calculate score only in daily mode, update common personal bests for both modes, update daily records only for formal daily finishes, persist immediately, and expose new-record flags to `showResult`. Ensure final Boss victory counts as 50 completed floors.

- [ ] **Step 4: Extend import/export validation.**

Export normalized v5 save. On import, merge through existing save defaults and `Challenge.sanitizeChallengeSave`; reject non-object root or missing numeric essence, discard invalid challenge records, persist and re-render records. Reset restores an empty challenge section.

- [ ] **Step 5: Run the complete automated suite.**

Run: `node --test *.test.js`

Expected: all tests PASS.

- [ ] **Step 6: Start local preview and verify desktop/mobile behavior.**

Run: `npx serve . -l 4173` (or use the existing local server if port 4173 is occupied). Open `http://127.0.0.1:4173/?v=26` and verify 390 x 844 plus a desktop viewport: menu navigation, code copy/input, daily start, deterministic retry, result score, records refresh, import/export, no horizontal overflow, and no console errors.

- [ ] **Step 7: Commit final integration and cache version.**

Commit: `git add game.js index.html styles.css sw.js *.test.js; git commit -m "feat: complete offline daily challenge records"`
