# GitHub Issues for Age of Max - Bug Fixes

## Issue #8: Units get hardstuck in combat and stop moving

**Priority:** HIGH - Critical gameplay bug  
**Labels:** bug, high-priority, gameplay

### Problem
Units sometimes get stuck in combat state and stop moving permanently. They remain frozen at their combat position even after the enemy is defeated.

### Root Cause
In handleUnitCollision(), units are marked as inCombat: true but may not always be released back to inCombat: false state due to:
- Units dying before combat cooldown completes
- Multiple collision triggers
- Edge cases where velocity is set to 0 but never restored

### Reproduction Steps
1. Spawn multiple units on both sides
2. Wait for combat to occur  
3. Some units will become permanently frozen

### Expected Behavior
Units should always resume marching after combat ends, whether they win, lose, or the opponent dies.

### Solution
- Add safety checks to ensure inCombat flag is always cleared
- Resume movement velocity even if opponent dies before cooldown
- Add timeout fallback to force-release stuck units
- Prevent multiple collision triggers

### Files Affected
- src/scenes/BattleScene.ts (handleUnitCollision method)

---

## Issue #9: Wrong units spawning when purchasing

**Priority:** HIGH - Critical gameplay bug  
**Labels:** bug, high-priority, gameplay

### Problem
When purchasing units, sometimes the wrong unit spawns. The unit that appears doesn't match the button clicked.

### Root Cause
In updateAvailableUnits(), the system filters units by epoch and displays them in buttons. However, it stores the **database index** of the filtered units, not accounting for the fact that unitsDatabase.indexOf(unit) gives the global index, not the epoch-relative index.

When spawnUnit() is called with this index, it spawns from the wrong position in the database.

### Reproduction Steps
1. Advance to Castle Age or later
2. Click on unit button (e.g., Swordsman)
3. Different unit spawns (e.g., Clubman or Spearman)

### Expected Behavior
Clicking a unit button should always spawn the exact unit shown on that button.

### Solution
- Store the actual unit data reference instead of just the index
- Pass the correct unit data directly to spawnUnit
- Or: Map button index correctly to unit database index

### Files Affected
- src/scenes/BattleScene.ts (updateAvailableUnits, spawnUnit methods)

---

## Issue #10: XP star particle showing transparent background and too large

**Priority:** MEDIUM - Visual polish  
**Labels:** bug, visual, ui

### Problem
The XP star particle effect shows a transparent/checkered background instead of being truly transparent. Additionally, the particles appear too large on screen.

### Root Cause
The xp_star_icon.png image likely:
1. Has a non-transparent background (white/gray)
2. Is too large (probably 128x128 or larger)
3. Current scale of 0.3 is still too big

### Reproduction Steps
1. Kill an enemy unit
2. Observe the golden star particles
3. Notice transparent background squares and oversized stars

### Expected Behavior
- Stars should have true transparency (alpha channel)
- Stars should be small, sparkly effects (~16x16 visual size)
- No visible background squares

### Solution
- Use particle scale of 0.1-0.15 instead of 0.3
- Ensure the image has proper alpha transparency
- Consider using a smaller source image (32x32 or 64x64)

### Files Affected
- src/scenes/BattleScene.ts (showXPParticles method)
- public/assets/ui/xp_star_icon.png (image asset)

---

## Issue #11: Dino Rider needs size increase

**Priority:** LOW - Visual polish  
**Labels:** enhancement, visual, balance

### Problem
The Dino Rider unit appears too small compared to other Stone Age units (Clubman, Spearman, Slinger). As a mounted cavalry unit, it should be larger and more imposing.

### Root Cause
In getUnitScale(), Dino Rider is set to scale 0.08 (medium unit category), making it smaller than basic infantry units at 0.1.

### Current Scale
- Infantry units (Clubman, Spearman): 0.1
- Dino Rider: 0.08  (too small)

### Expected Scale
- Dino Rider: 0.12 or 0.13  (larger than infantry)

### Justification
Mounted units should appear larger and more powerful than foot soldiers. This makes them feel more premium and worth their higher gold cost (90g vs 50-70g).

### Solution
Change Dino Rider scale from 0.08 to 0.12 in getUnitScale() method.

### Files Affected
- src/scenes/BattleScene.ts (getUnitScale method)

---

## Implementation Order

1.  Issue #11 (easiest - 1 line change)
2.  Issue #10 (easy - particle scale adjustment)
3.  Issue #9 (medium - unit spawning logic fix)
4.  Issue #8 (complex - combat state management)

Total Estimated Time: 1-2 hours
