# 武器技能与敌人成长实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让三种武器形成不同角色流派，支持主动技能学习与永久升级，并让敌人攻击力随楼层成长。

**Architecture:** 使用 `combat-logic.js` 承载可测试的敌人伤害成长和技能效果计算；`game.js` 负责当前武器、已学习技能和战斗状态；`index.html`/`styles.css` 增加技能选择和工坊条目。存档继续使用现有 localStorage + IndexedDB 双写。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Canvas、Node.js assert 测试。

## Global Constraints

- 继续使用三种现有武器作为三种角色流派，不新增独立角色。
- 手机竖屏基准 390 × 844，主要点击区域至少约 44 × 44 px。
- 不依赖网络、账号或外部运行时依赖。
- 新技能和永久升级必须自动保存，刷新后保持。

### Task 1: 纯逻辑测试与数值接口

**Files:**
- Modify: `combat-logic.test.js`
- Modify: `combat-logic.js`

- [x] **Step 1:** 写失败测试，覆盖 `getEnemyDamage` 的楼层增长、精英倍率和韧性减伤，以及三种武器技能的名称与技能效果计算。
- [x] **Step 2:** 运行测试确认因接口不存在而失败。
- [x] **Step 3:** 实现最小纯函数接口并让测试通过。
- [x] **Step 4:** 运行全部逻辑测试。

### Task 2: 武器技能状态和永久存档

**Files:**
- Modify: `game.js`
- Modify: `index.html`
- Modify: `styles.css`

- [x] **Step 1:** 为存档增加 `learnedSkills`、`selectedSkills` 和 `upgrades.resilience` 的默认值及兼容合并。
- [x] **Step 2:** 增加技能选择区，切换武器时显示该武器已学习技能，开局锁定当前选择。
- [x] **Step 3:** 将战斗技能按钮文案绑定到当前武器技能。
- [x] **Step 4:** 在余烬工坊增加每把武器的第二技能解锁项和韧性升级项，购买后自动保存并刷新 UI。

### Task 3: 技能效果与敌人成长接入战斗

**Files:**
- Modify: `game.js`
- Modify: `pixel-art.js`

- [x] **Step 1:** 在敌人生成时应用楼层攻击成长、精英倍率和永久韧性减伤。
- [x] **Step 2:** 按当前技能分派长剑裂地斩、法杖星陨术、弩穿心矢，并保持冷却流程。
- [x] **Step 3:** 增加技能专属日志、伤害数字和现有 Canvas 特效参数，不改变普通攻击节奏。
- [x] **Step 4:** 运行全部测试并检查第 1、5、10 层战斗状态。

### Task 4: 浏览器验收与离线版本

**Files:**
- Modify: `sw.js`
- Modify: `game-visual-integration.test.js`
- Modify: `ui-optimizations.test.js`

- [x] **Step 1:** 递增资源和 Service Worker 缓存版本，加入新增资源。
- [x] **Step 2:** 在 390 × 844 检查技能选择、工坊升级、战斗按钮和横向溢出。
- [x] **Step 3:** 检查控制台无错误并运行 Node 测试和语法检查。
