# Special Abilities Documentation

## Overview
Two powerful AOE special abilities that interact directly with Phaser's Arcade Physics bodies to deal area damage to enemy units. Both abilities have cooldown timers displayed in the UI.

## Abilities

### 1. Raining Rocks 

**Concept**: Multiple rock impacts rain down across the battlefield lane in a cascading pattern.

#### Stats
- **Cooldown**: 45 seconds
- **Damage per Impact**: 30 HP
- **Impact Radius**: 80 pixels
- **Number of Impacts**: 8
- **Impact Delay**: 200ms between each impact

#### Mechanics
1. Player clicks the  Rocks button (available when cooldown complete)
2. System spawns 8 rock impacts with staggered timing
3. Each impact location is randomized within the mid-field area (X: 300-900)
4. Impact Y position varies within lane height (60px from center)
5. All enemy units within 80px radius take 30 damage
6. Visual effect: Brown circle (0x8B4513) that scales and fades over 500ms
7. Hit units flash white for 100ms

### 2. Artillery Strike 

**Concept**: Linear barrage of artillery shells marching along a predefined Y-line (lane center), creating a destructive wave.

#### Stats
- **Cooldown**: 60 seconds
- **Damage per Explosion**: 50 HP
- **Explosion Radius**: 60 pixels
- **Number of Explosions**: 10
- **Explosion Delay**: 150ms between each
- **Strike Line**: Y = LANE_Y (lane center)
- **Coverage**: X: 400-1120 (80px spacing)

## UI Integration

### Button Layout
- **Position**: Top-right corner (X: 900, Y: 50)
- **Size**: 120x60 per button
- **Spacing**: 140px horizontal gap

### Cooldown Display
Ready State: Text shows "Ready" (green), button full color, clickable
Cooldown State: Text shows countdown in seconds (red), button grayed out

## Technical Implementation

### Constants
- RAINING_ROCKS_COOLDOWN = 45000ms (45 seconds)
- RAINING_ROCKS_DAMAGE = 30
- RAINING_ROCKS_RADIUS = 80
- RAINING_ROCKS_COUNT = 8
- ARTILLERY_STRIKE_COOLDOWN = 60000ms (60 seconds)
- ARTILLERY_STRIKE_DAMAGE = 50
- ARTILLERY_STRIKE_RADIUS = 60
- ARTILLERY_STRIKE_COUNT = 10

### Damage Mechanics
Both abilities use distance-based collision detection with Arcade Physics bodies:
1. Calculate distance between impact center and unit position
2. If distance <= radius, deal damage to unit
3. Award XP for damage dealt (capped at remaining HP)
4. Flash visual feedback (white for rocks, red for artillery)
5. If unit HP <= 0, award kill bonus XP and recycle unit to pool

### Visual Effects
**Raining Rocks**: Brown circle (0x8B4513, alpha 0.5) scales to 1.2x and fades over 500ms
**Artillery Strike**: Orange explosion (0xFF4500, alpha 0.7) scales to 1.5x over 400ms + expanding yellow ring

### Knockback
Artillery Strike applies 15px knockback away from explosion center using angle calculation.

## Balance Analysis

### DPS Comparison
| Ability | Cooldown | Total Dmg | Burst DPS | CD DPS | AOE Size |
|---------|----------|-----------|-----------|--------|----------|
| Raining Rocks | 45s | 240 | 150 | 5.33 | 80px |
| Artillery Strike | 60s | 500 | 333 | 8.33 | 60px |

**Raining Rocks**: Better for frequent use, good vs swarms
**Artillery Strike**: Better per-use, good vs single lane push

## Testing Recommendations
1. Verify 45s/60s cooldown timers accurate
2. Confirm button states sync with internal cooldowns
3. Test radius detection (80px/60px)
4. Verify damage calculation and XP awards
5. Check visual effects complete without memory leaks
6. Test ability use during cooldown (should block)
7. Verify multi-kill scenarios (XP per kill)
8. Performance test with 50+ units
9. Test knockback mechanics
10. Confirm unit recycling on death
