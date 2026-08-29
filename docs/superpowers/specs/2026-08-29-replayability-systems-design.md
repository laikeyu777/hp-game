# 局内构筑与长期挑战系统设计

## 目标

在现有 50 层单手竖屏肉鸽原型上增加五类可玩性系统：强化流派组合、主动技能升级与分支、五个 Boss 专属机制、50 层后的深渊挑战、成就与图鉴。系统保持完全离线，不引入服务器或外部资源。

## 设计边界

- 冒险模式继续使用现有永久成长；竞技公平模式暂不纳入本次实现。
- 所有局内状态只存在当前挑战，失败后清空；永久解锁、深渊进度和成就写入本地存档。
- 不增加无限数值升级。深渊主要增加规则限制和成绩目标。
- Canvas 负责战斗表现，规则模块使用纯函数，便于 Node 测试。
- 兼容旧版存档，缺少新字段时使用默认值，不覆盖已有解锁和设置。

## 模块划分

### `build-system.js`

负责强化标签与套装效果。

- `getPerkTags(perkId)` 返回标签数组。
- `getBuildState(perks)` 返回每类标签数量、已激活等级和效果 id。
- `getBuildBonuses(perks)` 返回战斗可消费的倍率和标志。

套装在同一标签达到 2、4、6 件时激活；重复强化仍可计数，但每次奖励界面显示当前进度。效果保持有限，例如暴击伤害、燃烧扩散、层间恢复、技能冷却缩短，不直接增加永久属性。

### `skill-progression.js`

负责主动技能等级和分支。

- `getSkillDefinition(weapon, skillId)` 返回技能的等级、描述和可选分支。
- `upgradeSkill(skillState, choice)` 返回新的技能状态，不修改输入。
- `getSkillEffect(skillState)` 返回战斗模块使用的伤害、范围、冷却和附加效果。

每把武器的两个技能均有 1、2、3 级。2 级强化基础效果，3 级从两个分支中选择一个。技能升级作为奖励池中的稀有选择出现，未升级时不改变现有技能行为。

### `boss-mechanics.js`

负责 Boss 阶段行为和机制事件。

- `getBossMechanic(bossId, phase)` 返回当前阶段的机制配置。
- `createBossEvent(bossId, phase, now, seed)` 返回预警、持续时间和目标区域。
- `resolveBossEvent(event, playerState, enemyState)` 返回伤害、状态和召唤结果。

五个 Boss 分别使用熔岩裂缝、冻结冰刺、召唤藤蔓、雷电标记、虚空幻影。机制必须先显示预警，再执行效果；Boss 血量阶段沿用现有的 70% 和 40% 分界。

### `ascension.js`

负责 50 层后深渊挑战规则。

- `getAscensionModifiers(level)` 返回该等级的敌人、商店、回血和 Boss 修正。
- `getNextAscension(current, won)` 返回通关后可解锁的最高等级。
- `getAscensionLabel(level)` 返回界面短标签。

深渊等级为 0 到 10。每一级累加固定限制；等级 0 为普通冒险。永久升级不影响深渊排行榜式成绩以外的战斗可玩性，但本次不实现联网榜单。

### `achievements.js`

负责成就条件、进度和图鉴视图数据。

- `getDefinitions()` 返回成就和图鉴条目。
- `evaluateRun(runSummary, progress)` 返回本局新完成的 id。
- `mergeProgress(progress, unlockedIds)` 返回去重后的成就进度。

首批成就覆盖三武器通关、流派套装、无商店回血、低生命通关、Boss 击杀和深渊等级。奖励使用余烬、技能解锁或徽章，不给予无限基础数值。

## 页面与存档

- 首页增加“深渊挑战”和“成就图鉴”入口；深渊未解锁时显示锁定状态。
- 强化卡显示标签和套装进度；技能卡显示当前等级和升级分支。
- Boss 战 HUD 显示机制名称和预警区域，不使用鼠标悬停。
- 结算页显示深渊等级、新成就和最佳成绩摘要。
- 存档新增 `skillProgression`、`ascension`、`achievements`、`codex` 字段，并保留 `version`。加载时逐字段合并默认值。

## 测试与验收

- 每个纯规则模块先写失败测试，再实现最小行为。
- 覆盖标签计数、套装阈值、技能升级分支、五个 Boss 机制、深渊等级累加、成就去重和旧存档兼容。
- 保持现有全部测试通过。
- 在 390 x 844 检查首页、强化、Boss 预警、深渊入口和成就页无横向溢出。
- 控制台无错误，资源继续由 Service Worker 缓存，完全离线可启动。
