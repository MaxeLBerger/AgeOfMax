# Bug Fix: PNGs Appearing Randomly and Units Not Spawning

## Problem Statement
After selecting a difficulty level, the game exhibited two critical issues:
1. PNG images appeared randomly in the top-left corner (0,0 position)
2. Units could not be spawned properly

## Root Cause Analysis

### Issue 1: Epoch ID Synchronization
**Location**: `BattleScene.ts` (lines 265, 1492) and `UIScene.ts` (line 135)

**Problem**: 
- `BattleScene` was only sending the epoch `name` (string) when emitting the `updateEpoch` event
- `UIScene` received only the name and updated only `this.currentEpoch.name`
- However, `UIScene.updateAvailableUnits()` (line 456) uses `this.currentEpoch.id` to filter units
- Since the `id` was never updated from its initial hardcoded value (`'stone'`), the UIScene always showed Stone Age units regardless of actual epoch progression

**Impact**:
- Units from wrong epochs would be displayed
- This could cause texture loading issues if unit sprites for wrong epochs were referenced
- Unit spawning logic would fail when trying to spawn units that shouldn't be available

### Issue 2: Scene Initialization Timing
**Location**: `DifficultyScene.ts` (lines 120-127)

**Problem**:
- The `loadingText.destroy()` was called AFTER `this.scene.stop()` was initiated
- The timeout for UIScene initialization was only 0ms (effectively just one JavaScript microtask)
- Scene transition order wasn't clearly separated

**Impact**:
- Race conditions between scene lifecycle events
- UIScene might not be fully initialized when BattleScene starts
- Potential memory leaks or undefined behavior from destroying objects after scene stop

## Solution Implementation

### Fix 1: Pass Complete Epoch Object
Changed event emission to pass the full `Epoch` object instead of just the name:

```typescript
// Before:
uiScene.events.emit('updateEpoch', this.getCurrentEpoch().name);

// After:
uiScene.events.emit('updateEpoch', this.getCurrentEpoch());
```

Updated UIScene to receive and store the complete epoch:

```typescript
// Before:
this.events.on('updateEpoch', (epochName: string) => {
  this.currentEpoch.name = epochName;
  this.epochText.setText(`Epoch: ${epochName}`);
  // ...
});

// After:
this.events.on('updateEpoch', (epoch: Epoch) => {
  this.currentEpoch = epoch;
  this.epochText.setText(`Epoch: ${epoch.name}`);
  // ...
});
```

**Files Changed**:
- `src/scenes/BattleScene.ts` (2 locations)
- `src/scenes/UIScene.ts` (1 location)

### Fix 2: Improve Scene Transition Timing
Reordered operations and increased initialization delay:

```typescript
// Before:
this.scene.launch('UIScene');
await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));
this.scene.start('BattleScene');
loadingText.destroy();
this.scene.stop();

// After:
loadingText.destroy();
this.scene.launch('UIScene');
await new Promise<void>((resolve) => setTimeout(() => resolve(), 16));
this.scene.start('BattleScene');
this.scene.stop();
```

**Changes**:
1. Destroy loading text BEFORE scene transitions (prevents cleanup issues)
2. Increased timeout from 0ms to 16ms (one frame at 60fps)
3. Clarified operation order with better comments

**File Changed**:
- `src/scenes/DifficultyScene.ts`

## Verification

### Expected Behavior After Fix
1. ✅ UIScene correctly displays units for current epoch
2. ✅ Epoch progression updates both ID and name
3. ✅ No timing-related crashes or undefined behavior
4. ✅ Units can be spawned immediately after difficulty selection
5. ✅ No PNGs appear in incorrect positions

### Manual Testing Steps
1. Start game and click "START GAME"
2. Select any difficulty (Easy/Medium/Hard)
3. Verify battle scene loads properly
4. Click unit spawn buttons at bottom (should spawn units)
5. Verify no images appear in top-left corner
6. Progress through epochs by gaining XP
7. Verify unit buttons update to show current epoch's units

## Impact Assessment

### Risk Level: Low
- Changes are minimal and focused
- No breaking changes to public APIs
- TypeScript compilation succeeds
- Changes follow existing patterns in codebase

### Performance Impact: Negligible
- Added 16ms delay is barely noticeable (less than one frame)
- Passing full object vs string is negligible performance difference

### Compatibility: Full
- No changes to save data, network protocols, or external interfaces
- Works with all difficulty levels
- Compatible with all epochs

## Related Files
- `src/scenes/BattleScene.ts` - Battle scene logic
- `src/scenes/UIScene.ts` - UI overlay scene
- `src/scenes/DifficultyScene.ts` - Difficulty selection scene
- `src/game/types.ts` - Type definitions for Epoch
- `data/epochs.json` - Epoch configuration data

## Technical Notes

### Epoch Object Structure
```typescript
interface Epoch {
  id: string;        // e.g., "stone", "castle", "renaissance"
  name: string;      // e.g., "Stone Age", "Castle Age"
  xpToNext: number;  // XP required to advance
  unlocks: {
    units: string[];    // Unit IDs available in this epoch
    turrets: string[];  // Turret IDs available in this epoch
  };
}
```

### Scene Lifecycle
1. DifficultyScene.create() - Player selects difficulty
2. DifficultyScene.startGame() - Initiates transition
3. UIScene is launched (parallel scene)
4. BattleScene is started (replaces DifficultyScene)
5. BattleScene.create() - Initializes game state
6. BattleScene.syncInitialStateToUI() - Syncs state to UIScene

## Future Improvements

### Potential Enhancements
1. Add explicit error handling for missing epoch data
2. Implement scene preloading to eliminate initialization delay
3. Add unit tests for epoch synchronization logic
4. Consider consolidating UI creation (currently split between BattleScene and UIScene)

### Known Limitations
- Both BattleScene and UIScene create UI elements (some duplication)
- Scene transitions rely on timing delays (could use events instead)
- No explicit validation that UIScene received epoch update

## References
- Original Issue: "PNGs are shown random on top left corner and Can't spawn Units anymore"
- Related Systems: Unit spawning, Epoch progression, Scene management
- Phaser Version: 3.90.0
