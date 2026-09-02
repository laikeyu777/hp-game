# Boss Arrival and Rewarded Ads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a readable Boss arrival sequence and two compliant Hupu rewarded-video flows: one revive per normal run and three 80-ember claims per Beijing calendar day.

**Architecture:** Keep reward accounting in a new pure `ad-rewards.js` module, host API handling in `hupu-platform.js`, and orchestration in `game.js`. Boss arrival is a UI state owned by `game.js`; the combat loop pauses while its dedicated overlay is visible. The Hupu adapter calls only `window.ColorboxAI.vatask.completeRewardVideo()` and refreshes state with `getActivityTaskState()` after confirmed completion.

**Tech Stack:** Native HTML/CSS/JavaScript, Canvas, WebAudio, localStorage/IndexedDB, Node.js built-in test runner, Hupu ColorboxAI vatask SDK.

## Global Constraints

- Rewarded video must be started only by an explicit player click.
- Only `code === 200 && data.rewarded === true` grants a game reward.
- Never call a native Bridge or activity endpoint directly and never pass user id, session id, or activity id.
- Disable both ad triggers while any rewarded-video flow is active.
- After success, call `window.ColorboxAI.vatask.getActivityTaskState()` once; do not poll or automatically retry.
- Normal browser, offline, dismissed, failed, timed-out, and unsupported flows grant nothing.
- Revive ads are unlimited per day but limited to once per normal run.
- Ember ads grant 80 ember and are limited to three successful claims per Beijing date.
- Daily challenge mode must not expose either ad reward.
- Do not deploy, upload, or submit for review during implementation.

---

### Task 1: Pure Ad Reward Rules

**Files:**
- Create: `ad-rewards.js`
- Create: `ad-rewards.test.js`

**Interfaces:**
- Produces: `AdRewards.beijingDate(now) -> string`
- Produces: `AdRewards.sanitizeState(value, now) -> { essenceDate, essenceClaims }`
- Produces: `AdRewards.getEssenceStatus(value, now) -> { used, remaining, canClaim }`
- Produces: `AdRewards.claimEssence(value, now) -> { ok, reward, state, reason? }`
- Produces: `AdRewards.canRevive({ mode, reviveUsed }) -> boolean`
- Produces: constants `ESSENCE_REWARD = 80`, `DAILY_ESSENCE_LIMIT = 3`, `REVIVE_HP_RATIO = 0.35`.

- [ ] **Step 1: Write failing rule tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Ads = require('./ad-rewards.js');

test('grants 80 ember for three claims and refuses the fourth', () => {
  const now = new Date('2026-09-02T15:59:00+08:00');
  let state = Ads.sanitizeState({}, now);
  for (let i = 0; i < 3; i += 1) {
    const result = Ads.claimEssence(state, now);
    assert.equal(result.ok, true);
    assert.equal(result.reward, 80);
    state = result.state;
  }
  const blocked = Ads.claimEssence(state, now);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'daily_limit');
  assert.equal(blocked.state.essenceClaims, 3);
});

test('resets ember claims at Beijing midnight', () => {
  const state = { essenceDate: '2026-09-02', essenceClaims: 3 };
  const status = Ads.getEssenceStatus(state, new Date('2026-09-02T16:01:00Z'));
  assert.equal(status.remaining, 3);
});

test('revive is only available once in a normal run', () => {
  assert.equal(Ads.canRevive({ mode: 'normal', reviveUsed: false }), true);
  assert.equal(Ads.canRevive({ mode: 'normal', reviveUsed: true }), false);
  assert.equal(Ads.canRevive({ mode: 'daily', reviveUsed: false }), false);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test ad-rewards.test.js`

Expected: FAIL because `ad-rewards.js` does not exist.

- [ ] **Step 3: Implement immutable reward helpers**

Use `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })` for the date key. Clamp malformed claim counts to `0..3`; return a new state object from every helper.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test ad-rewards.test.js`

Expected: all ad reward rule tests pass.

- [ ] **Step 5: Commit**

```bash
git add ad-rewards.js ad-rewards.test.js
git commit -m "feat: add rewarded ad game rules"
```

### Task 2: Hupu Rewarded Video Adapter

**Files:**
- Modify: `hupu-platform.js`
- Modify: `hupu-platform.test.js`

**Interfaces:**
- Produces: `HupuPlatform.showRewardedAd({ placement, timeout? }) -> Promise<{ ok, placement, taskState?, reason?, message? }>`
- Consumes: `window.ColorboxAI.vatask.completeRewardVideo()` and `window.ColorboxAI.vatask.getActivityTaskState()`.

- [ ] **Step 1: Add failing adapter tests**

Add real stubbed host objects before requiring the module, then assert:

```js
test('accepts only a confirmed rewarded response and refreshes task state', async () => {
  let refreshed = 0;
  global.ColorboxAI = { vatask: {
    completeRewardVideo: async () => ({ code: 200, message: 'success', data: { rewarded: true } }),
    getActivityTaskState: async () => { refreshed += 1; return { code: 200, data: { tasks: [] } }; },
  }};
  const platform = loadFreshPlatform();
  const result = await platform.showRewardedAd({ placement: 'revive' });
  assert.equal(result.ok, true);
  assert.equal(result.placement, 'revive');
  assert.equal(refreshed, 1);
});
```

Also test `host_unavailable`, `APP_REQUIRED`, `NOT_REWARDED`, thrown errors, timeout, and two concurrent calls where the second returns `ad_in_progress` without invoking the SDK.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test hupu-platform.test.js`

Expected: FAIL because `showRewardedAd` is not exported.

- [ ] **Step 3: Implement the official adapter**

Call `completeRewardVideo()` with no parameters. Validate both success conditions, preserve the SDK's user-facing `message`, normalize uppercase SDK reasons to lowercase internal reasons, refresh task state once after success, and release the module-level in-progress lock in `finally`. A failed refresh must not revoke an already confirmed ad reward.

- [ ] **Step 4: Run adapter and regression tests**

Run: `node --test hupu-platform.test.js leaderboard-integration.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add hupu-platform.js hupu-platform.test.js
git commit -m "feat: connect hupu rewarded videos"
```

### Task 3: Boss Arrival State and Presentation

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `game.js`
- Modify: `game-visual-integration.test.js`

**Interfaces:**
- Produces: `createBossIntro(boss, mechanic, now, reducedMotion) -> { startedAt, durationMs, name, mechanic }`
- Produces: `showBossIntro(boss)`, `updateBossIntro(now)`, and `hideBossIntro()` in `game.js`.

- [ ] **Step 1: Add failing markup and integration assertions**

Assert that `index.html` contains a dedicated `boss-intro-overlay`, `boss-intro-name`, and `boss-intro-mechanic`; that `game.js` initializes the intro only when `boss` exists; and that `tick()` exits while the intro is active.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test game-visual-integration.test.js`

Expected: FAIL because the Boss intro elements and state are absent.

- [ ] **Step 3: Add the dedicated overlay**

Place it inside `.arena-wrap`, above the Canvas. Use three compact lines: `BOSS 降临`, the actual Boss name from `tower-data.js`, and `机制 · <name>`. Set `role="status"` and `aria-live="assertive"`.

- [ ] **Step 4: Add one orchestrated visual sequence**

Use a dark translucent veil, two horizontal warning bars, a single red-white flash, and a 1.6-second keyframed shake on `.arena-wrap`. Do not add decorative cards. Under `prefers-reduced-motion: reduce`, remove shake/flash and reduce duration to 600 ms.

- [ ] **Step 5: Pause and resume combat safely**

Start the interval/render loop as today, but make `tick()` return while `state.bossIntro` is active. When the intro expires, shift `lastAttack`, `lastEnemyHit`, and `nextBossEventAt` by the intro duration so no attack resolves immediately. Trigger a vibration sequence only when enabled and reduced motion is false.

- [ ] **Step 6: Add the Boss arrival sound**

Extend `playFeedback` with `boss-arrival`: schedule three low oscillator notes with short gain ramps after the user has entered gameplay. Audio failure remains non-fatal and sound settings still apply.

- [ ] **Step 7: Run tests and verify GREEN**

Run: `node --test game-visual-integration.test.js combat-visual-state.test.js boss-mechanics.test.js`

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add index.html styles.css game.js game-visual-integration.test.js
git commit -m "feat: stage boss arrival sequence"
```

### Task 4: Revive and Ember Ad UI

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `game.js`
- Create: `ad-rewards-ui.test.js`
- Modify: `sw.js`

**Interfaces:**
- Consumes: `AdRewards.*` and `HupuPlatform.showRewardedAd()`.
- Produces: `watchReviveAd()`, `watchEssenceAd()`, `renderAdRewardState()`, and `resumeAfterRevive()`.

- [ ] **Step 1: Write failing UI integration tests**

Assert the following stable DOM contract:

```js
for (const id of ['essence-ad-btn', 'essence-ad-status', 'revive-ad-panel', 'revive-ad-btn', 'revive-ad-status']) {
  assert.match(html, new RegExp(`id=["']${id}["']`));
}
assert.match(game, /HupuPlatform\.showRewardedAd\(\{\s*placement:\s*'essence'/);
assert.match(game, /HupuPlatform\.showRewardedAd\(\{\s*placement:\s*'revive'/);
assert.match(game, /AdRewards\.REVIVE_HP_RATIO/);
```

Also assert that the script order loads `ad-rewards.js` before `game.js`, and the service worker precaches the exact versioned path.

Add a game integration assertion that first death prepares `state.pendingFailure` without immediately increasing `save.essence` or evaluating achievements, and that finalization clears the pending record after applying it exactly once.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test ad-rewards-ui.test.js`

Expected: FAIL because the entry points are absent.

- [ ] **Step 3: Add the lobby ember entry**

Turn the existing ember stat into a stable inline control with a 44-by-44 icon button carrying `aria-label="观看广告获得 80 余烬"`. Show `今日剩余 N/3 次` next to it. On click, confirm the local limit and online state, disable both ad buttons, call the official adapter, and only then apply `claimEssence`, add 80 to `save.essence`, persist, and refresh the lobby.

- [ ] **Step 4: Add the failed-run revive entry**

Add a result-page action panel shown only when `win === false`, `state.mode === 'normal'`, and `AdRewards.canRevive(...)` is true. On confirmed reward, set `state.reviveUsed = true`, restore HP to `Math.max(1, Math.ceil(maxHp * 0.35))`, clear `state.finishing`, clear enemy telegraphs and `bossEvent`, reset incoming-attack times, hide the result screen, show battle, and restart combat. Do not add ember and do not duplicate failure rewards.

- [ ] **Step 5: Prevent duplicate failure settlement**

Split failure display from failure finalization. First death stores `{ gain, finalized: false }` in `state.pendingFailure` and displays the estimated reward, but does not modify `save.essence`, submit the final run, or evaluate end-of-run achievements. A successful revive clears the pending failure without granting it. The ordinary `result-btn`, an explicit quit, or the second death after revival calls `finalizeFailure()` exactly once; that method grants the pending/base gain, evaluates achievements, submits the final result, persists, and marks the record finalized. Repeated clicks must not grant anything again.

- [ ] **Step 6: Map failures to concise UI copy**

Use SDK `message` when available. Otherwise map: offline to `当前离线，无法播放广告`, host unavailable/app required to `请在虎扑 App 内体验`, login required to `登录虎扑后可观看广告`, dismissed/not rewarded to `完整观看后才能领取奖励`, unavailable to `当前暂无可用广告`, timeout/request failure to `广告加载失败，请稍后重试`. Keep the lobby and return button usable.

- [ ] **Step 7: Migrate and persist ad state**

Add `ads` to `defaultSave`, normalize it through `AdRewards.sanitizeState()` in `loadSave()`, and initialize `state.reviveUsed = false` in `startRun()`. Do not count failed attempts. Do not show either entry during daily challenges.

- [ ] **Step 8: Bump offline assets**

Load `ad-rewards.js?v=1`, bump `game.js`, `styles.css`, and `hupu-platform.js` query versions, increment the service-worker cache name, and update every matching cached asset path.

- [ ] **Step 9: Run UI and gameplay regressions**

Run: `node --test ad-rewards-ui.test.js game-visual-integration.test.js combat-logic.test.js challenge-system.test.js hupu-platform.assets.test.js`

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add index.html styles.css game.js ad-rewards-ui.test.js sw.js
git commit -m "feat: add revive and ember ad rewards"
```

### Task 5: Full Verification and Mobile Preview

**Files:**
- Modify: tests only if verification exposes a real regression; do not weaken assertions.

**Interfaces:**
- Consumes: completed Boss intro and both ad flows.

- [ ] **Step 1: Run JavaScript syntax checks**

Run: `node --check ad-rewards.js && node --check hupu-platform.js && node --check game.js && node --check sw.js`

Expected: exit code 0 for every file.

- [ ] **Step 2: Run the full test suite**

Run: `node --test --test-concurrency=1 *.test.js activity/cloudfunctions/activity_api/index.test.js`

Expected: all tests pass with zero failures.

- [ ] **Step 3: Check patch integrity**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 4: Start a local static server**

Run the repository's existing static preview method on an unused localhost port. Keep the process running for browser verification.

- [ ] **Step 5: Verify at 390 x 844**

Check lobby and result screens for horizontal overflow, overlapping text, and minimum 44 px controls. Confirm the ember `+` reports that ads require the Hupu App in the local browser and grants nothing.

- [ ] **Step 6: Verify Boss presentation without waiting ten floors**

Use a temporary browser-only state override or existing test fixture, never a committed cheat, to enter floor 10. Confirm the name and mechanism are readable, the arena does not attack during the intro, motion is nonblank, and the layout remains stable.

- [ ] **Step 7: Verify reward failure paths**

In local preview, confirm both entries fail closed without changing HP, ember, daily count, or result settlement. Confirm the normal “返回大厅” action still works.

- [ ] **Step 8: Record the real-device gate**

Document that successful ad completion cannot be claimed from localhost. Final acceptance requires a Shaper preview opened inside a logged-in Hupu App with rewarded ads enabled for the activity; verify success, dismissal, unavailable-ad, and Android/HarmonyOS support responses there before release.

- [ ] **Step 9: Close verification findings**

If verification exposes a real regression, return to the relevant task, add a failing regression test, implement the smallest fix, rerun the full suite, and commit those exact test and implementation files with message `fix: close boss and rewarded ad verification findings`. If no files change, skip this commit.
