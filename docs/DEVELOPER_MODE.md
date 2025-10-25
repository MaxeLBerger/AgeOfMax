# Developer Mode - Age of Max

## Overview
Developer Mode is an advanced debugging feature that displays comprehensive real-time statistics above every unit on the battlefield. This helps developers and testers analyze gameplay, balance issues, and identify bugs.

## How to Enable

### Method 1: Settings Menu (Persistent)
1. Start the game
2. Click **Settings** in the main menu
3. Scroll to the **DEVELOPER** section
4. Toggle **Developer Mode (F3)** to ON
5. Settings are saved automatically

### Method 2: In-Game Toggle (Temporary)
- Press **F3** at any time during gameplay to toggle Developer Mode
- This overrides the settings menu option
- Useful for quick debugging without going back to menus

## Features

When Developer Mode is enabled, each unit displays a detailed info box showing:

### Unit Information Display
\\\
Name (SIDE)
HP: current/max
DMG: damage | SPD: speed
RNG: range | ATK: attackSpeed
Type: melee/ranged | Cost: goldCost
Combat: YES/NO
Vel: velocityX | Scale: scaleX
Texture: textureKey
Epoch: epochId
\\\

### What Each Field Means

- **Name (SIDE)**: Unit name and which side (PLAYER/ENEMY)
- **HP**: Current HP / Maximum HP
- **DMG**: Damage per hit
- **SPD**: Movement speed (pixels per second)
- **RNG**: Attack range in pixels
- **ATK**: Attack speed (seconds between attacks)
- **Type**: Unit classification (melee or ranged)
- **Cost**: Gold cost to spawn this unit
- **Combat**: Whether unit is currently in combat (YES/NO)
- **Vel**: Current X velocity (positive = right, negative = left)
- **Scale**: Sprite scale factor
- **Texture**: Which PNG texture is loaded
- **Epoch**: Which epoch this unit belongs to

## Visual Indicators

- **Green background**: Player units (your side)
- **Red background**: Enemy units (opponent side)
- **Position**: Text follows unit movement in real-time
- **Always visible**: Debug text has highest depth (5000)

## Use Cases

### 1. Balance Testing
Check if units have correct stats:
\\\
- HP too high/low?
- Damage scaling correctly?
- Speed appropriate for unit type?
\\\

### 2. Bug Identification
Identify common issues:
\\\
- Wrong texture loaded for epoch?
- Scale inconsistent between units?
- Combat flag stuck in wrong state?
- Velocity not resetting after combat?
\\\

### 3. Performance Testing
Monitor unit counts and behavior:
\\\
- How many units active on field?
- Are units getting recycled properly?
- Combat state management working?
\\\

### 4. Epoch Verification
Confirm epoch-specific units spawn correctly:
\\\
- Check Epoch field matches button
- Verify correct texture loaded
- Ensure stats match units.json
\\\

## Performance Impact

Developer Mode has **minimal performance impact**:
- Text updates every frame but only for active units
- Automatic cleanup when units die
- Efficient Map-based tracking system
- No impact when disabled

## Keyboard Shortcuts

| Key | Function |
|-----|----------|
| **F2** | Toggle Debug Overlay (collision boxes, ranges) |
| **F3** | Toggle Developer Mode (unit stats) |

## Tips

1. **Use with Debug Overlay (F2)**: Combine both for complete picture
2. **Screenshot bugs**: Capture exact stats when reporting issues
3. **Test epoch transitions**: Enable before advancing epochs
4. **Check unit scales**: Compare Scale values across unit types
5. **Monitor combat**: Watch Combat flag during battles

## Integration with Other Systems

Developer Mode works alongside:
-  Debug Overlay (F2) - collision boxes and ranges
-  Settings Menu - persistent configuration
-  localStorage - remembers your preference
-  All game scenes - works in any battle
-  Console logging - augments existing logs

## Technical Details

### Implementation
- Stored in: \BattleScene.ts\
- Toggle method: \	his.developerMode\
- Update frequency: Every frame (when enabled)
- Storage: localStorage + registry
- Text depth: 5000 (above all gameplay elements)

### Data Sources
All data comes from:
1. \units.json\ - Base unit stats
2. \GameUnit\ interface - Runtime properties
3. Phaser Sprite - Physics and rendering data

### Memory Management
- Uses ES6 Map for efficient lookups
- Automatic cleanup of destroyed units
- No memory leaks - texts destroyed with units

## Troubleshooting

**Q: Developer Mode not showing anything?**
- Check F3 was pressed (should show ON/OFF notification)
- Verify units are spawned (press U1-U5 buttons)
- Try toggling off and on again

**Q: Text flickering or jumping?**
- Normal behavior - text follows unit movement
- Position updates every frame for accuracy

**Q: Can't read text (too small)?**
- Text is optimized for 1280x720 resolution
- Try fullscreen mode for better readability

**Q: How to disable permanently?**
- Go to Settings Menu
- Turn OFF Developer Mode
- Or delete localStorage with F12 console: \localStorage.removeItem('developerMode')\

## Contributing

When reporting bugs with Developer Mode data:
1. Press F3 to enable
2. Screenshot the issue with visible stats
3. Note the exact values shown
4. Include in GitHub issue report

## Version History

- **v1.0** (2025-01-25): Initial implementation
  - Real-time stat display
  - F3 toggle support
  - Settings menu integration
  - localStorage persistence

---

**Note**: Developer Mode is a debugging tool. Use standard game mode for normal gameplay.
