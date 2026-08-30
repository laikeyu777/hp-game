# 灰烬仪表盘视觉优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the mobile presentation hierarchy and readability of the tower game without changing gameplay or save behavior.

**Architecture:** Keep the existing HTML structure and use a focused CSS layer for tokens, spacing, states, and responsive layout. Add only stable class hooks where a visual state already exists in the game, such as the selected weapon and combat status.

**Tech Stack:** Native HTML, CSS, JavaScript, in-app browser at 390 x 844.

## Global Constraints

- Preserve the dark tower, ash, moss, orange, cyan, purple visual direction.
- Keep primary touch targets at least 44 x 44 px.
- Avoid horizontal overflow at 390 x 844.
- Respect reduced-motion settings.
- Do not change combat, scoring, save, or route-selection behavior.

### Task 1: Establish visual hierarchy tokens

**Files:**
- Modify: `styles.css`

**Interfaces:**
- Produces CSS variables and shared component states consumed by all existing screens.

- [ ] **Step 1: Add stronger contrast and spacing tokens**

Add a compact override layer at the end of `styles.css` for readable text, restrained borders, consistent 8px radii, and mobile-safe section spacing.

- [ ] **Step 2: Add focus, selected, and disabled states**

Ensure weapon, skill, route, reward, primary, and dock controls have visible focus and selected states without relying on hover.

- [ ] **Step 3: Verify CSS syntax and diff**

Run `git diff --check` and inspect selectors for conflicting specificity.

### Task 2: Refine menu, combat, cards, and result layouts

**Files:**
- Modify: `styles.css`
- Modify: `index.html`

**Interfaces:**
- Consumes existing classes and IDs in `index.html`.
- Produces a coherent first viewport and denser but readable cards on mobile.

- [ ] **Step 1: Improve menu composition**

Give the brand and title more breathing room, group stats into a stronger data band, and make the start button the dominant action.

- [ ] **Step 2: Improve combat HUD and bottom dock**

Keep the arena prominent, align the health bar and status pills, and reserve enough bottom safe-area space for the skill and inspect buttons.

- [ ] **Step 3: Improve route/reward/result cards**

Use consistent card padding, line-height, rarity accents, and mobile wrapping so labels never overlap.

- [ ] **Step 4: Add a small semantic hook for the menu data band**

Wrap the existing menu stat elements with a class only if needed for layout; do not alter text or event handlers.

### Task 3: Browser visual regression check

**Files:**
- No code changes.

**Interfaces:**
- Verifies `http://127.0.0.1:4173/?v=32` at 390 x 844.

- [ ] **Step 1: Check main menu screenshot and dimensions**

Confirm no horizontal overflow, the start button is visually dominant, and the weapon cards fit in one row.

- [ ] **Step 2: Check route and combat screenshots**

Confirm route cards, health bar, skill dock, and arena do not overlap or clip into the safe area.

- [ ] **Step 3: Check result screenshot and console**

Confirm result actions wrap cleanly and browser logs contain no new errors.

