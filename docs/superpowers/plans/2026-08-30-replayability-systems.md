# 局内构筑与长期挑战系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为《一指登塔：灰烬回廊》增加流派组合、主动技能成长、Boss 专属机制、深渊挑战和成就图鉴，并保持离线与移动端兼容。

**Architecture:** 将规则拆成五个无 DOM 的纯函数模块，先用 Node 测试锁定行为，再由 `game.js` 负责状态转换和页面渲染。存档采用向后兼容的默认字段合并，Canvas 只消费规则模块产生的效果配置。

**Tech Stack:** 原生 JavaScript、Canvas 2D、HTML/CSS、IndexedDB/localStorage、Node.js `node:test`。

## Global Constraints

- 完全离线，不新增网络或图片依赖。
- 手机竖屏基准 390 x 844，主要点击区域至少 44 x 44 px。
- 旧版存档缺少新字段时必须正常加载。
- 规则模块不得依赖 DOM、Canvas 或浏览器全局对象。
- 每个新规则先写失败测试并确认失败，再写最小实现。

### Task 1: 流派标签与套装规则

**Files:**
- Create: `build-system.js`
- Create: `build-system.test.js`
- Modify: `game.js`

**Interfaces:**
- `BuildSystem.getPerkTags(perkId) -> string[]`
- `BuildSystem.getBuildState(perks) -> { counts, activated }`
- `BuildSystem.getBuildBonuses(perks) -> { critDamage, burnSpread, floorRecovery, skillCooldown }`

- [x] 写测试：标签映射、2/4/6 件阈值、未知强化不抛异常。
- [x] 运行 `node --test build-system.test.js`，确认因模块不存在而失败。
- [x] 实现纯函数和 2/4/6 件套装效果。
- [x] 将奖励卡标签与局内 `state.build` 接入，HUD 显示套装进度。
- [x] 再次运行单测与现有战斗测试。

### Task 2: 主动技能等级与分支

**Files:**
- Create: `skill-progression.js`
- Create: `skill-progression.test.js`
- Modify: `game.js`, `index.html`, `styles.css`

**Interfaces:**
- `SkillProgression.getSkillDefinition(weapon, skillId) -> definition`
- `SkillProgression.upgradeSkill(skillState, choice) -> skillState`
- `SkillProgression.getSkillEffect(skillState) -> effect`

- [x] 写测试：1 级基础值、2 级升级、3 级两个分支、重复升级和非法分支拒绝。
- [x] 运行 `node --test skill-progression.test.js`，确认红灯。
- [x] 实现六个技能的三级定义和不可变升级函数。
- [x] 将 `save.skillProgression` 和奖励卡接入，技能按钮读取升级后的效果。
- [x] 在技能选择区显示等级与分支，验证 390 x 844 不溢出。

### Task 3: Boss 专属机制

**Files:**
- Create: `boss-mechanics.js`
- Create: `boss-mechanics.test.js`
- Modify: `combat-logic.js`, `game.js`, `pixel-art.js`

**Interfaces:**
- `BossMechanics.getBossMechanic(bossId, phase) -> mechanic`
- `BossMechanics.createBossEvent(bossId, phase, now, seed) -> event`
- `BossMechanics.resolveBossEvent(event, playerState, enemyState) -> result`

- [x] 写测试：五个 Boss 都返回不同机制，事件包含预警时长，执行结果可重复。
- [x] 运行 `node --test boss-mechanics.test.js`，确认红灯。
- [x] 实现熔岩、冰刺、藤蔓、雷电、幻影五类机制及阶段倍率。
- [x] 接入战斗计时器，保证先预警后结算，并复用现有视觉效果队列。
- [x] 在 Boss 战页面显示机制名称和预警，运行现有视觉测试。

### Task 4: 深渊挑战

**Files:**
- Create: `ascension.js`
- Create: `ascension.test.js`
- Modify: `game.js`, `index.html`, `styles.css`, `sw.js`

**Interfaces:**
- `Ascension.getAscensionModifiers(level) -> modifiers`
- `Ascension.getNextAscension(current, won) -> number`
- `Ascension.getAscensionLabel(level) -> string`

- [x] 写测试：等级 0 默认、等级 1-10 累加限制、超过 10 封顶、失败不升级。
- [x] 运行 `node --test ascension.test.js`，确认红灯。
- [x] 实现固定修正规则和通关解锁逻辑。
- [x] 将深渊等级加入存档和开始挑战入口，50 层通关后展示解锁结果。
- [x] 更新 Service Worker 版本并验证所有资源仍返回 200。

### Task 5: 成就与图鉴

**Files:**
- Create: `achievements.js`
- Create: `achievements.test.js`
- Modify: `game.js`, `index.html`, `styles.css`, `sw.js`

**Interfaces:**
- `Achievements.getDefinitions() -> Achievement[]`
- `Achievements.evaluateRun(runSummary, progress) -> string[]`
- `Achievements.mergeProgress(progress, unlockedIds) -> string[]`

- [x] 写测试：武器通关、套装、无回血、低血量、Boss、深渊成就及重复解锁去重。
- [x] 运行 `node --test achievements.test.js`，确认红灯。
- [x] 实现定义、条件检测和奖励描述。
- [x] 增加图鉴页面、结算页新成就提示和本地存档持久化。
- [x] 运行完整 `node --test`，检查页面无横向溢出与控制台错误。

## 最终验收

- `node --test` 全部通过。
- `node --check` 覆盖新增模块和 `game.js`。
- 390 x 844 下完成一次普通挑战和一次 Boss 战，机制预警可见。
- 50 层通关后可进入深渊，刷新页面后深渊进度和成就仍存在。
- 旧版存档导入不报错，新页面按钮可触摸操作。
