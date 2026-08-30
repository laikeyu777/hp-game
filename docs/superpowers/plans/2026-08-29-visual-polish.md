# 视觉排版与画面细节优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变战斗规则的前提下，统一暗色像素风界面的层级、间距、反馈和竖屏适配。

**Architecture:** 继续使用现有单页 DOM 和 CSS，不引入框架或外部资源。`styles.css` 负责视觉系统与页面状态，`index.html` 只补充必要的语义 class，现有 Canvas 像素绘制和游戏状态机保持不变。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Canvas、Node.js 测试。

## Global Constraints

- 默认设计基准为 390 × 844，主要操作点击区域至少 44 × 44 px。
- 不增加横向滚动，不依赖 hover 完成关键操作。
- 保持离线运行，不引入网络字体、图片或运行时依赖。
- 页面动画只用于视觉反馈，不改变战斗判定和存档流程。

### Task 1: 视觉回归基线

**Files:**
- Create: `visual-polish.test.js`
- Modify: `index.html`

- [ ] **Step 1: Write failing assertions** for the new page-level visual hooks (`app-shell`, `menu-stats`, route and shop classes) and versioned stylesheet.
- [ ] **Step 2: Run the test** and confirm it fails because the hooks are not yet present.
- [ ] **Step 3: Add only the required semantic classes** to existing elements without changing behavior.
- [ ] **Step 4: Run the focused test** and confirm it passes.

### Task 2: 全局视觉系统与菜单排版

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Add a restrained palette, typography scale, focus/active states, pixel texture, and safe-area spacing variables.**
- [ ] **Step 2: Tighten menu title, weapon picker, stats strip, primary CTA, and secondary actions for 390px width.**
- [ ] **Step 3: Add `prefers-reduced-motion` fallback and ensure buttons retain 44px minimum hit areas.**
- [ ] **Step 4: Run visual polish and existing tests.

### Task 3: 路线、战斗和结果页面层级

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Style route cards with room/risk labels, selection edge, and press feedback.**
- [ ] **Step 2: Improve battle arena frame, status pills, combat log, HP bar, skill dock, and pause modal contrast.**
- [ ] **Step 3: Unify reward, event, shop, upgrade, and result surfaces with consistent card density and focus states.**
- [ ] **Step 4: Run all Node tests and inspect the 390 × 844 browser layout.

### Task 4: 发布版本验收

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Bump cache version and include the updated stylesheet.**
- [ ] **Step 2: Run syntax checks, tests, and browser console/overflow checks.**
