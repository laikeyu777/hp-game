# 50 层敌人与 Boss 内容实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展塔楼到 50 层章节结构，先交付 1–20 层的两套小怪与两个独立 Boss，并为后续章节保留数据接口。

**Architecture:** 新建 `tower-data.js` 管理章节、敌人池和 Boss 配置；`combat-logic.js` 提供 Boss 阶段和技能调度纯函数；`game.js` 按楼层生成敌人与 Boss 行为；`pixel-art.js` 增加主题敌人的绘制部件。现有路线、技能、存档和 PWA 流程保持兼容。

**Tech Stack:** 原生 JavaScript、Canvas、Node.js assert 测试。

## Global Constraints

- Boss 出现在第 10、20、30、40、50 层。
- 每 10 层更换一套小怪主题；本次先实现 1–20 层。
- 手机竖屏基准 390 × 844，不增加横向滚动。
- 所有内容离线可用，不依赖外部资源。

### Task 1: 塔楼数据与测试

**Files:**
- Create: `tower-data.js`
- Create: `tower-data.test.js`

- [x] 写失败测试覆盖章节选择、每十层 Boss 选择和敌人池。
- [x] 实现 5 章节数据接口，完成 1–20 层的灰烬/霜蚀数据。
- [x] 运行测试确认通过。

### Task 2: Boss 技能调度

**Files:**
- Modify: `combat-logic.js`
- Modify: `combat-effects.test.js`

- [x] 写失败测试覆盖 Boss 阶段和技能轮换。
- [x] 实现 `getBossPhase` 与 `getBossAction` 纯函数。
- [x] 运行全部逻辑测试。

### Task 3: 游戏状态接入

**Files:**
- Modify: `game.js`
- Modify: `index.html`
- Modify: `styles.css`

- [x] 按楼层读取主题敌人和 Boss 配置。
- [x] 在第 10/20 层生成对应 Boss，并处理技能预警、范围伤害和召唤。
- [x] 更新章节和 Boss 名称 UI。

### Task 4: 像素形象与离线验收

**Files:**
- Modify: `pixel-art.js`
- Modify: `pixel-art.test.js`
- Modify: `sw.js`

- [x] 增加 9 种主题小怪和 5 个 Boss 的独立像素签名。
- [x] 更新资源缓存版本并加入 `tower-data.js`。
- [x] 在 390 × 844 验证章节数据、横向溢出和控制台无错误。
