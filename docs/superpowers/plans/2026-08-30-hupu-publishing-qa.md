# 虎扑发布资格版 QA 记录

## 自动化测试

在 `C:\Users\LENOVO\Documents\ChatGPT\hp小游戏\.worktrees\daily-challenge-records` 执行：

```powershell
Get-ChildItem -Filter '*.test.js' | Sort-Object Name | ForEach-Object { & 'Node.js' $_.FullName }
```

结果：全部测试通过，包含成就、章节背景、深渊、50 层难度、Boss 机制、构筑、每日挑战、战斗效果、复活、分享、存档、技能、路线、教程和视觉测试。

## 浏览器验收

- URL：`http://127.0.0.1:4173/?v=qa2`
- 视口：390 x 844
- `document.documentElement.scrollWidth`：390
- `window.innerWidth`：390
- 引导按钮尺寸：300 x 52
- 结算页按钮尺寸：146 x 48、300 x 52
- 主菜单、路线选择、战斗、强化和结算页面均能正常切换。
- 失败结算显示分享、复制、再来一局和返回大厅；主动结束本局不会错误显示复活按钮。
- Service Worker 缓存版本：`ash-corridor-v30`
- 新增缓存资源：`share-adapter.js`、`reward-adapter.js`、`result-flow.js`、`tutorial.js`、`save-guard.js`。

## 运行期间检查

首次浏览器检查发现 `damageEnemy` 将随机数值传给需要随机函数的战斗接口，已修复为延迟调用 `getRunRandom('combat')`。重新加载 `game.js?v=19` 后，战斗运行期间错误日志数量未增加。

## 手动发布前检查清单

- [x] 无网络进入主菜单并开始普通冒险
- [x] 390 x 844 无横向溢出
- [x] 首次引导可跳过、可在设置重新查看
- [x] 结束页分享和复制入口可见
- [x] 复活流程已接入离线演示适配器
- [x] 存档导入校验和重复奖励保护已接入
- [ ] 虎扑官方分享 SDK（获得开发者资格后接入）
- [ ] 真实激励广告 SDK（获得广告平台权限后接入）
