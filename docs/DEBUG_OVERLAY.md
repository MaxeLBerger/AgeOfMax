# Debug Overlay Documentation

## Overview
The BattleScene includes a comprehensive debug overlay system for visualizing game mechanics during development and testing.

## Activation
- **Toggle Key**: Press F2 to enable/disable the debug overlay
- **Console Feedback**: Logs "Debug overlay: ENABLED" or "DISABLED" when toggled

## Features

### 1. Turret Visualization
- **Range Circles**: Green transparent circles showing turret attack range
- **HP Bars**: Display current turret health above each placed turret
- **Color**: Green (0x00ff00) with 30% opacity

### 2. Unit Visualization

#### Hitboxes
- **Player Units**: Blue hitboxes (0x00aaff)
- **Enemy Units**: Orange hitboxes (0xff6600)
- Shows exact collision boundaries

#### Range Circles
- Displays attack range for each unit
- Color matches unit side (blue/orange)
- 30% opacity to avoid clutter

#### HP Bars
- **Color Coding**:
  - Green: >60% HP
  - Orange: 30-60% HP
  - Red: <30% HP
- Width: 40px
- Position: 25px above unit

#### HP Text
- Format: CurrentHP/MaxHP
- Font: 10px white with black stroke
- Position: 35px above unit

#### Side Labels
- Shows "PLAYER" or "ENEMY" below unit
- Font: 8px colored by side
- Helps identify unit ownership

### 3. Projectile Visualization
- Hitbox outlines for all active projectiles
- Color matches owner (blue for player, orange for enemy)
- Thinner lines (1px) to reduce visual noise

## Implementation Details

### Performance Considerations
- **Conditional Rendering**: Only draws when debugEnabled === true
- **Graphics Clearing**: debugGraphics.clear() called each frame
- **Text Cleanup**: All debug texts destroyed and recreated (prevents memory leaks)
- **Depth**: Set to 1000 (always renders on top)

### Code Structure
`	ypescript
// Setup
private debugEnabled = false;
private debugGraphics?: Phaser.GameObjects.Graphics;
private debugTexts: Phaser.GameObjects.Text[] = [];

// Methods
setupDebugControls()      // F2 key listener
updateDebugOverlay()      // Main render loop
drawHPBar()               // HP bar drawing utility
clearDebugTexts()         // Memory cleanup
clearDebugOverlay()       // Full cleanup
`

## Use Cases

### 1. Balance Testing
- Visualize unit ranges to ensure melee vs ranged balance
- Monitor HP bars during combat to test damage values
- Verify hitbox sizes match visual sprites

### 2. Collision Debugging
- See exact collision boundaries
- Identify overlapping hitboxes
- Debug projectile targeting issues

### 3. AI Testing
- Verify turret targeting ranges
- Confirm units stay within lane bounds
- Test range-based combat decisions

### 4. Performance Analysis
- Count active units/projectiles visually
- Monitor group separation (player vs enemy)
- Identify clustering issues

## Hotkey Summary
| Key | Action |
|-----|--------|
| F2  | Toggle debug overlay ON/OFF |

## Example Output
When enabled, you'll see:
- Green circles around turrets (range)
- Blue/orange boxes around units (hitboxes)
- Colored circles showing unit attack ranges
- HP bars above all entities
- HP numbers (e.g., "75/100")
- Side labels ("PLAYER", "ENEMY")
- Projectile hitboxes

## Notes
- Debug overlay is disabled by default
- No performance impact when disabled
- All debug graphics cleared on disable
- Toggle anytime during gameplay
- Works in all game states (combat, building, etc.)

---

**Author**: Code Review Pass  
**Date**: 2025-10-23  
**Version**: 1.0
