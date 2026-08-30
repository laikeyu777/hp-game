# Boss、章节背景与角色细节 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Boss arrivals unmistakable and deepen the pixel-art identity of every chapter, character, and enemy.

**Architecture:** Reuse the existing Canvas renderer and visual state. Add a small DOM overlay for Boss arrivals, extend `ArenaBackgrounds` with layered props and particles, and extend `PixelArt` palettes/parts without changing combat data or save data.

**Tech Stack:** Native HTML, CSS, Canvas 2D, existing `CombatVisualState` and browser preview.

## Global Constraints

- Preserve offline operation and the current save format.
- Preserve the 390 x 844 mobile layout and 44px touch targets.
- Respect `reducedMotion` in all new animations.
- Do not change enemy damage, weapon balance, scoring, or route behavior.

### Task 1: Boss arrival emphasis

**Files:** `index.html`, `game.js`, `styles.css`

- Add a hidden `boss-arrival` overlay with floor, boss name, mechanic label, and chapter color.
- Show it only on first entry into a Boss battle, while combat continues underneath.
- Add a short screen flash/vignette class and reduced-motion fallback.

### Task 2: Layered chapter backgrounds

**Files:** `arena-backgrounds.js`, `arena-backgrounds.test.js`

- Add chapter-specific foreground props and low-cost ambient particles.
- Keep each chapter's palette and existing boss frame.
- Add test assertions that each chapter emits multiple distinctive drawing operations and reduced motion emits fewer operations.

### Task 3: Detailed pixel characters

**Files:** `pixel-art.js`, `pixel-art.test.js`

- Add secondary highlights, straps, armor seams, weapon grips, and themed Boss ornaments.
- Keep crisp pixel rendering and existing animation frame inputs.
- Add test assertions for the new detail markers in the recording context.

### Task 4: Browser regression

**Files:** no code changes

- Verify Boss overlay, route-to-battle transition, chapter backgrounds, no horizontal overflow, and no console errors at 390 x 844.

