# Turret System Documentation

## Overview
The turret system allows players to place defensive towers on a grid in front of their base. Turrets automatically target and fire at enemy units within range using pooled projectiles.

## Turret Grid Configuration

### Grid Constants
\\\	ypescript
TURRET_GRID_START_X = 50    // Left edge of grid
TURRET_GRID_START_Y = 150   // Top edge of grid
TURRET_CELL_SIZE = 60       // Width/height of each cell
TURRET_GRID_ROWS = 3        // Number of rows
TURRET_GRID_COLS = 5        // Number of columns
\\\

### Grid Layout
- Total slots: 15 (3 rows  5 columns)
- Each cell is 6060 pixels with visible borders
- Interactive zones for click-based placement
- Visual feedback on hover and selection

## Turret Properties

### Data Structure (from \data/turrets.json\)
\\\	ypescript
{
  id: string              // Unique identifier
  name: string            // Display name
  epoch: string           // Required epoch (stone/castle/renaissance/modern/future)
  hp: number              // Turret health points
  damage: number          // Damage per shot
  range: number           // Detection radius in pixels
  attackSpeed: number     // Seconds between shots
  goldCost: number        // Placement cost
  projectileSpeed: number // Projectile velocity (0 for instant hit)
}
\\\

### Epoch Progression
- **Stone Age**: Rock Thrower (180 range, 10 dmg), Wooden Spike (100 range, 15 dmg), Basic Tower (200 range, 12 dmg)
- **Castle Age**: Arrow Tower (250 range, 20 dmg), Ballista (280 range, 35 dmg), Trebuchet (350 range, 50 dmg)
- **Renaissance**: Cannon (320 range, 60 dmg), Musket Tower (300 range, 35 dmg), Fortress (280 range, 45 dmg)
- **Modern**: Machine Gun (280 range, 25 dmg, 0.5s ROF), Anti-Tank (350 range, 80 dmg), Artillery (400 range, 100 dmg)
- **Future**: Laser Turret (350 range, 50 dmg), Rail Gun (450 range, 120 dmg), Ion Cannon (400 range, 150 dmg)

## Placement System

### UI Flow
1. Player clicks turret button in toolbar (bottom row, shows cost)
2. UI checks if player has enough gold
3. If affordable, turret is selected and feedback message shown
4. Player clicks on grid cell to place turret
5. BattleScene validates placement (slot empty, gold sufficient)
6. Gold is deducted and turret is spawned

### Cost Validation
- **UI Layer**: Pre-checks gold before enabling selection
- **Battle Layer**: Final validation before placement (double-check)
- Feedback messages shown for insufficient gold or occupied slots

### Visual Feedback
- Turret buttons display cost in gold color (#ffd700)
- Center screen feedback text for placement instructions/errors
- Turret sprites tinted by epoch color
- Grid cells show borders for placement guidance

## Firing System

### Target Acquisition
\\\	ypescript
// Executed per turret per frame in updateTurrets()
1. Check if attack cooldown elapsed (attackSpeed * 1000 ms)
2. Find closest enemy unit within range
3. Calculate distance to each active enemy unit
4. Return closest target if within range, else null
\\\

### Projectile Firing
- **Pooling**: Projectiles retrieved from object pool (max 200)
- **Velocity**: Calculated as angle-based vector (cos/sin)  projectileSpeed
- **Damage**: Set from turret's damage property
- **Owner**: Marked as 'player' for collision detection
- **Visuals**: Yellow tint (#FFFF00) for turret projectiles

### Timing System
\\\	ypescript
// Per turret slot
lastFireTime: number  // Timestamp of last shot (ms)
cooldown = attackSpeed * 1000  // Convert seconds to milliseconds

if (now - lastFireTime >= cooldown) {
  // Fire projectile
  lastFireTime = now
}
\\\

### Collision & Damage
- Uses existing projectile collision system
- Projectiles check owner !== target.side
- On hit: Deal damage, award XP, recycle projectile
- On kill: Award bonus XP, recycle target unit

## DPS Calculation

### Formula
\\\
DPS = damage / attackSpeed
\\\

### Examples
- Machine Gun: 25 / 0.5 = **50 DPS** (rapid fire, low damage)
- Ion Cannon: 150 / 7.0 = **21.4 DPS** (slow, high burst)
- Rock Thrower: 10 / 2.5 = **4 DPS** (early game starter)
- Rail Gun: 120 / 5.0 = **24 DPS** (long range sniper)

### Strategic Considerations
- **High ROF** (low attackSpeed): Good against swarms, consistent pressure
- **High Burst** (high damage): Good against tanks, less wasted damage
- **Range**: Determines engagement zone and multi-turret synergy
- **Cost Efficiency**: DPS per gold varies by epoch and role

## Object Pool Integration

### Projectile Recycling
- Same pool used for unit ranged attacks and turret shots
- \ecycleProjectile()\: Sets inactive, invisible, zero velocity
- \projectiles.get(x, y, texture)\: Retrieves from pool or creates new
- Pool max: 200 projectiles (shared resource)

### Performance Benefits
- No destroy/create overhead per shot
- Reduced garbage collection pressure
- Stable memory usage during combat

## UI Elements

### Turret Toolbar
- **Position**: Y = 600 (above unit spawn buttons at Y = 660)
- **Layout**: 5 buttons horizontally, 80px spacing
- **Button Style**: Brown background (0x663300), 7050 size
- **Labels**: T1-T5 for first 5 turrets
- **Cost Display**: Gold amount below button (12px font, gold color)

### Event Communication
\\\	ypescript
// UIScene  BattleScene
events.emit('selectTurret', index)

// BattleScene  UIScene  
events.emit('turretPlacementFailed', message)
\\\

## Future Enhancements
- [ ] Turret HP system with enemy base attacks
- [ ] Turret upgrades (damage/range/ROF boosts)
- [ ] Special abilities (AOE, slow, multi-target)
- [ ] Turret selling/refund system
- [ ] Visual range indicators on hover
- [ ] Turret rotation to face targets
- [ ] Unlock system tied to epoch progression
- [ ] Animated projectile trails
- [ ] Impact effects and audio
- [ ] Enemy turrets/defenses

## Technical Details

### TurretSlot Interface
\\\	ypescript
{
  x: number              // Grid cell center X
  y: number              // Grid cell center Y
  occupied: boolean      // Placement state
  turret?: Sprite        // Visual representation
  turretData?: TurretType // Stats and properties
  lastFireTime: number   // Cooldown tracking
}
\\\

### Epoch Color Mapping
\\\	ypescript
stone: 0x8B4513       // Brown
castle: 0x808080      // Gray
renaissance: 0xCD7F32 // Bronze
modern: 0x4169E1      // Royal Blue
future: 0x00FFFF      // Cyan
\\\

## Testing Recommendations
1. Place turrets in all grid positions (verify 15 slots work)
2. Test cost validation (insufficient gold should show feedback)
3. Test occupied slot rejection (can't double-place)
4. Verify firing at various ranges (min/max range boundaries)
5. Test projectile pooling (rapid fire shouldn't leak memory)
6. Verify XP awards from turret kills
7. Test with multiple turrets targeting same unit
8. Verify gold deduction on placement
9. Test turret performance with 100+ active units
10. Verify projectile cleanup (out of bounds recycling)
