# Epoch Synchronization Bug Fix - Visual Diagram

## Problem: Epoch ID Not Synchronized

### Before Fix (Broken)
```
┌─────────────────┐                    ┌──────────────┐
│  BattleScene    │                    │   UIScene    │
│                 │                    │              │
│ currentEpoch    │ updateEpoch event  │ currentEpoch │
│ ┌─────────────┐ │ ─────────────────> │ ┌──────────┐ │
│ │id: "castle" │ │  "Castle Age"      │ │id:"stone"│ │ ❌ WRONG!
│ │name:"Castle"│ │   (only name!)     │ │name:     │ │
│ │xpToNext:400 │ │                    │ │"Castle Age"│
│ └─────────────┘ │                    │ └──────────┘ │
└─────────────────┘                    └──────────────┘
                                              │
                                              │ updateAvailableUnits()
                                              ▼
                                        Uses currentEpoch.id
                                        Still "stone" → Shows wrong units!
```

### After Fix (Working)
```
┌─────────────────┐                    ┌──────────────┐
│  BattleScene    │                    │   UIScene    │
│                 │                    │              │
│ currentEpoch    │ updateEpoch event  │ currentEpoch │
│ ┌─────────────┐ │ ─────────────────> │ ┌──────────┐ │
│ │id: "castle" │ │  Full Epoch object │ │id:       │ │ ✅ CORRECT!
│ │name:"Castle"│ │  {id,name,xp,...}  │ │"castle"  │ │
│ │xpToNext:400 │ │                    │ │name:     │ │
│ └─────────────┘ │                    │ │"Castle Age"│
└─────────────────┘                    │ └──────────┘ │
                                       └──────────────┘
                                              │
                                              │ updateAvailableUnits()
                                              ▼
                                        Uses currentEpoch.id
                                        "castle" → Shows castle units! ✓
```

## Problem: Scene Initialization Timing

### Before Fix (Race Condition)
```
DifficultyScene.startGame()
│
├─> 1. scene.launch('UIScene')           ← UIScene starts creating UI
│      └─> UIScene.create() begins
│
├─> 2. await setTimeout(0)                ← Only 0ms! Barely any time
│
├─> 3. scene.start('BattleScene')        ← Might start before UIScene ready!
│      └─> BattleScene.create()
│          └─> syncInitialStateToUI()    ← UIScene might not be ready!
│              └─> uiScene.events.emit() ← Could fail or miss events
│
├─> 4. loadingText.destroy()             ← Destroying after scene.stop!
│
└─> 5. scene.stop()                      ← Scene already stopping

RESULT: ❌ Race conditions, missed events, potential crashes
```

### After Fix (Proper Sequencing)
```
DifficultyScene.startGame()
│
├─> 1. loadingText.destroy()             ← Clean up FIRST ✓
│
├─> 2. scene.launch('UIScene')           ← UIScene starts creating UI
│      └─> UIScene.create() begins
│
├─> 3. await setTimeout(16)               ← 16ms = 1 frame at 60fps ✓
│      └─> UIScene has time to fully initialize
│
├─> 4. scene.start('BattleScene')        ← UIScene is definitely ready!
│      └─> BattleScene.create()
│          └─> syncInitialStateToUI()    ← UIScene ready to receive
│              └─> uiScene.events.emit() ← Events received correctly ✓
│
└─> 5. scene.stop()                      ← Clean shutdown

RESULT: ✅ Proper initialization order, no race conditions
```

## Data Flow: Unit Spawning

### Complete Flow After Fix
```
User clicks difficulty → DifficultyScene
│
├─> Pass difficulty to registry
│
├─> Load BattleScene & UIScene dynamically
│
├─> Launch UIScene (parallel)
│   └─> Creates UI elements at correct positions
│       └─> Gold/XP displays (top-left) ✓
│       └─> Unit buttons (bottom) ✓
│       └─> Turret buttons (bottom) ✓
│
├─> Wait 16ms for UIScene init
│
└─> Start BattleScene
    │
    ├─> Initialize game state
    │   └─> currentEpochIndex = 0
    │   └─> Load epoch data from epochs.json
    │
    ├─> syncInitialStateToUI()
    │   └─> emit('updateEpoch', fullEpochObject) ✓
    │       │
    │       └─> UIScene receives full epoch
    │           └─> this.currentEpoch = epoch ✓
    │               └─> updateAvailableUnits()
    │                   └─> Filter units by epoch.id ✓
    │                       └─> Display correct units ✓
    │
    └─> User can now spawn units successfully! ✅
```

## Key Takeaways

### What Was Broken
1. **Epoch ID mismatch**: UIScene always thought it was Stone Age
2. **Timing issues**: UIScene not ready when BattleScene needed it
3. **Wrong units displayed**: Stone Age units shown in all epochs
4. **Spawn failures**: Trying to spawn units that don't exist in current epoch

### What Was Fixed
1. **Full object sync**: Pass complete Epoch object with both ID and name
2. **Proper timing**: 16ms delay ensures UIScene is fully initialized
3. **Clean transitions**: Loading text destroyed before scene changes
4. **Correct units**: UIScene uses synchronized epoch ID to filter units

### Code Changes Summary
```typescript
// BattleScene.ts - Send full object
- uiScene.events.emit('updateEpoch', this.getCurrentEpoch().name);
+ uiScene.events.emit('updateEpoch', this.getCurrentEpoch());

// UIScene.ts - Receive full object
- this.events.on('updateEpoch', (epochName: string) => {
-   this.currentEpoch.name = epochName;
+ this.events.on('updateEpoch', (epoch: Epoch) => {
+   this.currentEpoch = epoch;

// DifficultyScene.ts - Better timing
+ loadingText.destroy();
  this.scene.launch('UIScene');
- await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));
+ await new Promise<void>((resolve) => setTimeout(() => resolve(), 16));
  this.scene.start('BattleScene');
- loadingText.destroy();
  this.scene.stop();
```
