# 章节竞技场背景实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为五个塔楼章节提供不同的像素竞技场背景，并强化每十层 Boss 战场景。

**Architecture:** 新建 `arena-backgrounds.js`，根据章节 id 绘制静态环境和低强度动态装饰；`game.js` 在角色与敌人之前调用背景绘制；`tower-data.js` 继续作为章节选择唯一来源。背景不参与战斗判定。

**Tech Stack:** 原生 JavaScript、Canvas 2D、Node.js assert 测试。

## Global Constraints

- 五个章节必须有可区分的色彩和环境元素。
- 背景对比度低于角色、敌人、预警和伤害数字。
- `prefers-reduced-motion` 时关闭动态装饰。
- 完全离线，不增加图片或网络依赖。

### Task 1: 背景绘制接口

**Files:**
- Create: `arena-backgrounds.js`
- Create: `arena-backgrounds.test.js`

- [x] 写失败测试，覆盖五章不同绘制签名、Boss 强化层和减少动态效果。
- [x] 实现 `draw(ctx, { chapterId, now, boss, reducedMotion })`。
- [x] 运行背景测试。

### Task 2: 竞技场接入与主题 UI

**Files:**
- Modify: `game.js`
- Modify: `styles.css`

- [x] 在角色之前绘制章节背景。
- [x] 在战斗页设置章节 data 属性和主题色。
- [x] 确保预警、角色和伤害数字仍位于背景上层。

### Task 3: 离线版本和浏览器验收

**Files:**
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `game-visual-integration.test.js`

- [x] 加载并缓存背景模块，递增资源版本。
- [x] 运行全部测试和语法检查。
- [x] 在 390 × 844 检查章节背景与控制台错误。
