# 敌人攻击特效实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 为四类敌人增加清晰的攻击跟随特效，不改变伤害时机、战斗数值或存档数据。

**架构：** 扩展纯 `PixelArt` 绘制器，新增 `drawEnemyAttack`；扩展 `CombatVisualState`，新增 `recordEnemyAttack`；在 `game.js` 既有敌人伤害分支记录一次事件。Canvas 动画循环只负责视觉，90ms 战斗定时器继续负责结果。

**技术栈：** 原生 JavaScript、Canvas 2D、Node 内置 `assert`、现有本地浏览器预览。

## 全局约束

- 完全离线，不增加外部图片、字体、库或网络请求。
- 不改变伤害、攻击间隔、敌人数量、奖励、存档结构或楼层流程。
- Canvas 内部保持 360 x 390，像素绘制关闭图像平滑。
- 暂停冻结视觉时间和敌人攻击时间，恢复后不得立即追赶造成伤害。
- reduced-motion 保留攻击预警和命中反馈，省略装饰性残影。

---

### Task 1：敌人攻击绘制器

**文件：** 修改 `pixel-art.js`、`pixel-art.test.js`

- [ ] 写失败测试：四种 `kind` 调用 `drawEnemyAttack` 均产生绘制操作，四种序列化操作不同；reduced-motion 的猎犬不绘制残影但仍有落地冲击。
- [ ] 运行 `node pixel-art.test.js`，确认因 `drawEnemyAttack` 不存在而失败。
- [ ] 实现四个分支：侍从红色斩击、猎犬紫色残影/落地方块、守卫黄色枪段、首领橙紫扩散方框；未知 kind 回退侍从。
- [ ] 运行测试并确认退出码 0。

### Task 2：视觉事件桥

**文件：** 修改 `combat-visual-state.js`、`combat-visual-state.test.js`

- [ ] 写失败测试：`recordEnemyAttack` 为守卫返回 `enemy-attack`、`kind:'guard'`、`duration:280`，首领时长为 420。
- [ ] 运行 `node combat-visual-state.test.js`，确认函数不存在导致失败。
- [ ] 实现 `{servant:260,hound:320,guard:280,boss:420}` 时长映射，使用 `visualNow` 作为开始时间，并继承 reduced-motion。
- [ ] 运行测试并确认退出码 0。

### Task 3：战斗接入与验证

**文件：** 修改 `game.js`、`index.html`、`sw.js`、`game-visual-integration.test.js`

- [ ] 写失败测试：源码必须包含 `recordEnemyAttack`、`drawEnemyAttack`、`enemy-attack` 绘制路径，脚本版本提升到 10，缓存名为 `ash-corridor-v10`。
- [ ] 在既有敌人伤害分支扣血前记录一次攻击事件；在 `drawArena` 中先绘制攻击特效，再绘制生命条和目标轮廓。
- [ ] 保留 `skipWaiting` 与 `clients.claim`，更新四个脚本版本。
- [ ] 运行语法检查、全部 Node 测试、静态资源 HTTP 200，并在 390x844 浏览器验证四类颜色、暂停冻结、恢复继续和无横向溢出。
