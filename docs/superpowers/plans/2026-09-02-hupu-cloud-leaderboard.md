# 虎扑云端排行榜 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为《一指登塔：灰烬回廊》增加使用虎扑账号昵称的跨玩家每日榜与历史总榜，并在网络不可用时保持离线游玩和成绩待同步能力。

**Architecture:** 将排行榜规则与游戏状态解耦为可测试模块；前端通过虎扑提供的账号与云端请求能力访问统一 API，未登录或网络失败时回退到本地缓存和待同步队列。现有 `challenge-system.js` 继续负责计分，本计划只扩展排行榜提交、读取、排序和 UI 状态，不改动战斗数值。

**Tech Stack:** 原生 HTML/CSS/JavaScript、IndexedDB/localStorage、Node 内置测试运行器、虎扑账号/云端请求适配层。

## Global Constraints

- 保持手机竖屏基准 390×844，排行榜页面不得产生横向滚动。
- 不强制联网；离线时仍可开始、战斗、结算和查看本地成绩。
- 排行榜昵称使用虎扑账号昵称，不新增昵称输入框。
- 云端只保存排行榜必要字段，不上传完整存档、手机号或设备文件。
- 前端不手写 Bearer 鉴权令牌，不把账号稳定标识渲染到页面。
- 服务端必须重新计算分数并执行楼层、挑战码、武器和时间范围校验。
- 不把云环境凭据、令牌或测试资源提交到仓库。
- 每个行为改动先写失败测试，再写最小实现。

---

### Task 1: 排行榜领域规则与数据校验

**Files:**
- Create: `leaderboard-logic.js`
- Create: `leaderboard-logic.test.js`
- Modify: `challenge-system.test.js`（补充排行榜使用的计分输入边界）

**Interfaces:**
- `LeaderboardLogic.normalizeSubmission(input)`：返回规范化成绩对象，非法字段抛出可识别错误。
- `LeaderboardLogic.compareEntries(left, right)`：分数降序、用时升序、提交时间升序。
- `LeaderboardLogic.upsertPersonalBest(previous, candidate)`：按榜单范围保留更优记录。
- `LeaderboardLogic.sanitizeEntries(entries, options)`：过滤异常条目并限制返回数量。

- [ ] **Step 1: Write the failing tests**

```js
const assert = require('assert');
const LeaderboardLogic = require('./leaderboard-logic.js');

assert.deepEqual(
  LeaderboardLogic.normalizeSubmission({
    mode: 'normal', weapon: 'sword', completedFloors: 50,
    enemiesDefeated: 120, bossesDefeated: 5, durationMs: 180000,
    hpRatio: 0.8, gold: 100, cleared: true,
  }).weapon,
  'sword',
);
assert.throws(() => LeaderboardLogic.normalizeSubmission({ mode: 'normal', weapon: 'staff', completedFloors: 999 }), /floor/i);
assert.ok(LeaderboardLogic.compareEntries({ score: 100, durationMs: 900 }, { score: 100, durationMs: 1000 }) > 0);
assert.equal(LeaderboardLogic.compareEntries({ score: 90 }, { score: 100 }), -1);
assert.equal(LeaderboardLogic.upsertPersonalBest({ score: 100 }, { score: 90 }).score, 100);
assert.equal(LeaderboardLogic.sanitizeEntries([{ rank: 1, nickname: 'A', score: 10 }, null], { limit: 10 }).length, 1);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `& 'C:\Program Files\RStudio\resources\app\bin\node\node.exe' --test --test-concurrency=1 leaderboard-logic.test.js`

Expected: FAIL because `leaderboard-logic.js` does not exist.

- [ ] **Step 3: Implement the minimal module**

Implement strict numeric bounds (`completedFloors` 0–50, `durationMs` non-negative and finite, `hpRatio` 0–1, `weapon` in `sword|staff|crossbow`), deterministic comparison, and a maximum entry limit. Do not perform network calls in this module.

- [ ] **Step 4: Run focused and full tests**

Run: `& 'C:\Program Files\RStudio\resources\app\bin\node\node.exe' --test --test-concurrency=1 leaderboard-logic.test.js challenge-system.test.js`

Expected: PASS with no warnings.

- [ ] **Step 5: Commit**

```bash
git add leaderboard-logic.js leaderboard-logic.test.js challenge-system.test.js
git commit -m "feat: add leaderboard validation rules"
```

### Task 2: 本地缓存与待同步队列

**Files:**
- Create: `leaderboard-store.js`
- Create: `leaderboard-store.test.js`
- Modify: `game.js:8-13,40-50`（在成绩结算后写入队列）

**Interfaces:**
- `LeaderboardStore.createState(value)`：返回版本化 `{ version, entries, pending }`。
- `LeaderboardStore.enqueue(state, submission)`：按 `submissionKey` 幂等入队。
- `LeaderboardStore.markSynced(state, submissionKey, remoteEntry)`：移除待同步项并更新缓存。
- `LeaderboardStore.getCached(state, scope)`：返回每日榜或总榜缓存。

- [ ] **Step 1: Write the failing tests**

```js
const assert = require('assert');
const Store = require('./leaderboard-store.js');

let state = Store.createState();
state = Store.enqueue(state, { submissionKey: 'run-1', scope: 'all', score: 100 });
state = Store.enqueue(state, { submissionKey: 'run-1', scope: 'all', score: 100 });
assert.equal(state.pending.length, 1);
state = Store.markSynced(state, 'run-1', { rank: 3, score: 100 });
assert.equal(state.pending.length, 0);
assert.equal(Store.getCached(state, 'all')[0].rank, 3);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `& 'C:\Program Files\RStudio\resources\app\bin\node\node.exe' --test --test-concurrency=1 leaderboard-store.test.js`

Expected: FAIL because the store module is missing.

- [ ] **Step 3: Implement versioned local state**

Use the existing `save` persistence path. Store only leaderboard cache and pending submissions, cap pending records at 30, and preserve unknown future fields during migration. Generate a stable submission key from mode, challenge code, weapon, completed floors, duration and score.

- [ ] **Step 4: Integrate queue writes into game results**

After `submitRunResult` creates the local result, enqueue a normal or daily submission without delaying `showResult`. Keep current personal-best updates unchanged.

- [ ] **Step 5: Run tests**

Run: `& 'C:\Program Files\RStudio\resources\app\bin\node\node.exe' --test --test-concurrency=1 leaderboard-store.test.js *.test.js`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add leaderboard-store.js leaderboard-store.test.js game.js
git commit -m "feat: queue leaderboard submissions offline"
```

### Task 3: 虎扑账号与云端请求适配层

**Files:**
- Create: `hupu-platform.js`
- Create: `hupu-platform.test.js`
- Modify: `index.html`（增加适配脚本引用）
- Modify: `sw.js`（加入新脚本资源和版本号）

**Interfaces:**
- `HupuPlatform.getUser()`：返回 `{ loggedIn, nickname }`，失败返回游客状态。
- `HupuPlatform.request(path, options)`：统一调用虎扑云端请求能力，不拼接鉴权头。
- `HupuPlatform.submitLeaderboard(payload)`：调用 `/api/leaderboard/submit`。
- `HupuPlatform.fetchLeaderboard(scope, code)`：并行读取榜单和当前玩家排名。

- [ ] **Step 1: Write failing adapter tests**

Test that missing `ColorboxAI` produces a non-throwing guest result, that request failures become typed `{ ok:false, reason }`, and that a successful submit normalizes the returned entry.

- [ ] **Step 2: Run adapter tests to verify failure**

Run: `& 'C:\Program Files\RStudio\resources\app\bin\node\node.exe' --test --test-concurrency=1 hupu-platform.test.js`

Expected: FAIL because the adapter is missing.

- [ ] **Step 3: Implement the adapter**

Detect the host-provided `ColorboxAI.auth` and `ColorboxAI.cloud.request` APIs at runtime. Never read or expose credentials from the page. Use a small timeout and return structured errors so gameplay cannot be blocked.

- [ ] **Step 4: Add queue flush entry point**

Expose `HupuPlatform.flushPending(submissions)` that attempts each pending record once per session, calls `LeaderboardStore.markSynced` on success, and leaves failures queued.

- [ ] **Step 5: Run tests**

Run: `& 'C:\Program Files\RStudio\resources\app\bin\node\node.exe' --test --test-concurrency=1 hupu-platform.test.js leaderboard-store.test.js *.test.js`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add hupu-platform.js hupu-platform.test.js index.html sw.js
git commit -m "feat: add hupu account and cloud request adapter"
```

### Task 4: 排行榜页面与大厅入口

**Files:**
- Modify: `index.html`（大厅入口、排行榜页面、状态区域）
- Modify: `styles.css`（竖屏列表、榜单标签、状态样式）
- Modify: `game.js`（渲染、加载、提交状态、重试入口）
- Create: `leaderboard-ui.test.js`

**Interfaces:**
- `renderLeaderboard(scope)`：渲染每日榜或历史总榜。
- `loadLeaderboard(scope)`：优先显示云端结果，失败时显示本地缓存。
- `renderLeaderboardStatus(status)`：统一处理加载、空榜、游客、离线和失败。

- [ ] **Step 1: Write failing DOM contract tests**

Assert that `index.html` contains `leaderboard-screen`, `leaderboard-tabs`, `leaderboard-list`, `leaderboard-me`, and a lobby button; assert that `game.js` contains both scopes, local-cache fallback and pending-sync copy.

- [ ] **Step 2: Run test to verify failure**

Run: `& 'C:\Program Files\RStudio\resources\app\bin\node\node.exe' --test --test-concurrency=1 leaderboard-ui.test.js`

Expected: FAIL because the new DOM contract is absent.

- [ ] **Step 3: Implement mobile-first UI**

Add a lobby button and a full-screen leaderboard view with two tabs. Each row shows rank, nickname, score, floor, duration and weapon. Highlight the current player, cap visible rows at 50, and prevent horizontal overflow.

- [ ] **Step 4: Wire loading and fallback behavior**

On open, call the platform adapter. Show cached records immediately when available, then replace them with cloud data. Display clear text for guest, offline, empty and failed states. Do not block the start button or combat.

- [ ] **Step 5: Wire result submission state**

At result time show “已同步 / 待同步 / 同步失败” without changing the existing essence reward flow. Trigger a best-effort queue flush on page load and when `online` fires.

- [ ] **Step 6: Run tests and visual checks**

Run: `& 'C:\Program Files\RStudio\resources\app\bin\node\node.exe' --test --test-concurrency=1 leaderboard-ui.test.js *.test.js`

Use the existing local preview server at 390×844 to confirm no overlap or horizontal scrolling, and verify that opening/closing the page does not reset the current run.

- [ ] **Step 7: Commit**

```bash
git add index.html styles.css game.js leaderboard-ui.test.js
git commit -m "feat: add cross-player leaderboard screen"
```

### Task 5: 后端接口契约与本地安全发布检查

**Files:**
- Create: `docs/superpowers/specs/2026-09-02-hupu-leaderboard-api-contract.md`
- Create: `leaderboard-api-contract.test.js`
- Modify: `game-visual-integration.test.js`

**Interfaces:**
- Document request/response schemas for `list`, `me`, and `submit`.
- Document server-side score recalculation, unique keys, pagination limit and error codes.

- [ ] **Step 1: Write failing contract tests**

Assert that the contract documents the three endpoints, required fields, no client-supplied account ID, and rejection cases for invalid floor, weapon, challenge code and duration.

- [ ] **Step 2: Implement the contract document**

Keep it independent of a specific cloud environment. Include a response example with nickname, rank, score, completed floors, duration and weapon only.

- [ ] **Step 3: Run contract and full tests**

Run: `& 'C:\Program Files\RStudio\resources\app\bin\node\node.exe' --test --test-concurrency=1 leaderboard-api-contract.test.js *.test.js`

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-09-02-hupu-leaderboard-api-contract.md leaderboard-api-contract.test.js game-visual-integration.test.js
git commit -m "docs: define leaderboard api contract"
```

### Task 6: 集成验证与发布准备

**Files:**
- Modify: `sw.js`（最终缓存版本）
- Modify: `README.md`（本地运行、虎扑宿主能力缺失时的表现、部署前置条件）
- Create: `leaderboard-integration.test.js`

- [ ] **Step 1: Add integration tests**

Cover a normal result entering the all-time queue, a daily result entering the challenge-code queue, duplicate submission idempotency, and cloud failure preserving the local result.

- [ ] **Step 2: Run the full verification command**

Run: `& 'C:\Program Files\RStudio\resources\app\bin\node\node.exe' --test --test-concurrency=1 *.test.js`

Expected: all tests PASS.

- [ ] **Step 3: Start local preview and verify mobile layout**

Run a local static server on an unused port. Verify the lobby, leaderboard tabs, result sync status and offline fallback at 390×844. Do not claim cloud ranking is live until the backend endpoints are deployed and smoke-tested.

- [ ] **Step 4: Run repository checks**

Run: `git diff --check` and inspect `git status --short`. Confirm no credentials, `.superpowers/`, generated caches or temporary files are staged.

- [ ] **Step 5: Commit final integration**

```bash
git add sw.js README.md leaderboard-integration.test.js
git commit -m "test: verify leaderboard integration"
```

---

## Deployment Boundary

The plan implements the client adapter and publishes the backend contract, but does not deploy a cloud environment automatically. Formal deployment requires a confirmed activity environment and a separate deployment confirmation immediately before changing remote resources. Until then, the game remains fully playable offline with a local pending queue.

