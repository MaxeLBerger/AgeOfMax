# MCP LOGGING SYSTEM - Age of Max

## Overview
Dieses Dokument beschreibt das Logging-System für Developer Mode und MCP-Analyse.

## Console Logging Structure

### Unit Spawn Logs
\\\
Format:  Spawned {Name} ({side}) | Texture: {texture} | HP: {current}/{max} | DMG: {damage} | SPD: {speed} | Epoch: {epoch}

Example:
 Spawned Spearman (player) | Texture: spearman | HP: 120/120 | DMG: 10 | SPD: 38 | Epoch: stone
 Spawned Clubman (enemy) | Texture: clubman_2 | HP: 67/96 | DMG: 5 | SPD: 40 | Epoch: stone
\\\

### Texture Selection Logs (Developer Mode Only)
\\\
Format:  Texture Selection: {Name} ({id})  {selectedTexture} [{index}/{totalVariants} variants]

Example:
 Texture Selection: Clubman (clubman)  clubman_2 [2/2 variants]
 Texture Selection: Archer (archer)  archer [1/2 variants]
 Texture Selection: Rifleman (rifleman)  rifleman_2 [2/2 variants]
\\\

## Developer Mode Features

### F3 Toggle
- Aktiviert/Deaktiviert umfassendes Logging
- Zeigt Texture-Selection-Logs
- Zeigt Unit Debug Overlays
- Speichert Einstellung in localStorage

### Debug Overlays
Jede Unit zeigt:
- Name & Side
- HP (current/max)
- Damage, Speed, Range, Attack Speed
- Type, Cost
- Combat Status
- Velocity, Scale
- **Texture Key**  Wichtig für Debugging
- Epoch

## Known Issues & Solutions

### Issue: Wrong Texture Displayed
**Symptom:** Unit name is "Spearman" but shows clubman texture

**Debugging Steps:**
1. Enable Developer Mode (F3)
2. Spawn the problematic unit
3. Check console for texture selection log
4. Check unit debug overlay for texture key
5. Compare with BootScene.ts load.image() calls

**Example Analysis:**
\\\
Console:  Texture Selection: Spearman (spearman)  spearman [1/1 variants]
Console:  Spawned Spearman (player) | Texture: spearman | ...
Debug Overlay: Texture: spearman

Expected:  Correct
Problem: If overlay shows different texture than console log
Solution: Check BootScene.ts load paths
\\\

### Issue: Variant Randomization Not Working
**Symptom:** Always shows same variant (e.g., always clubman, never clubman_2)

**Debugging:**
\\\
Expected logs:
 Texture Selection: Clubman (clubman)  clubman [1/2 variants]
 Texture Selection: Clubman (clubman)  clubman_2 [2/2 variants]
 Texture Selection: Clubman (clubman)  clubman [1/2 variants]

If only seeing [1/2 variants]:
- Check Math.random() in getUnitTexture()
- Verify both clubman.png and clubman_2.png exist
- Check BootScene.ts loads both variants
\\\

### Issue: Particle White Background
**Status:** FIXED (commit be27568)

**Previous Problem:**
- Used 'xp-star' and 'rock' textures from PNGs
- PNGs had white backgrounds

**Solution:**
- Created procedural textures in BootScene.ts
- particle-star: Generated golden sparkle
- particle-gold: Generated golden coin
- Both have proper alpha transparency

## Texture Mapping Verification

### Current Mappings (BattleScene.ts getUnitTexture())
\\\	ypescript
// Stone Age
'clubman': ['clubman', 'clubman_2'],
'spearman': ['spearman'],
'slinger': ['slinger'], 
'dino-rider': ['dino-rider'],

// Castle Age
'swordsman': ['swordsman'],
'archer': ['archer', 'archer_2'],
'knight': ['knight'],
'ballista': ['ballista'],

// Renaissance Age
'musketeer': ['musketeer'],
'cavalry': ['cavalry'],
'cannon': ['cannon'],
'duelist': ['duelist'],

// Modern Age
'rifleman': ['rifleman', 'rifleman_2'],
'grenadier': ['grenadier'],
'tank': ['tank'],
'sniper': ['sniper']
\\\

### Asset Loading (BootScene.ts)
Each texture key must have corresponding load.image() call:
\\\	ypescript
// Stone Age
this.load.image('clubman', 'assets/units/stone_age/clubman.png');
this.load.image('clubman_2', 'assets/units/stone_age/clubman_2.png');
// ... etc
\\\

### Verification Checklist
- [ ] Units.json has correct epoch assignment
- [ ] getUnitTexture() maps unit.id to texture array
- [ ] BootScene.ts loads all texture keys
- [ ] PNG files exist in correct epoch folders
- [ ] Developer Mode shows correct texture in logs
- [ ] Unit debug overlay shows correct texture key

## MCP Analysis Workflow

### Step 1: Identify Issue
User reports: "Spearman shows wrong sprite"

### Step 2: Enable Developer Mode
Press F3 in game

### Step 3: Reproduce Issue
Spawn Spearman unit

### Step 4: Analyze Logs
\\\
Console Output:
 Texture Selection: Spearman (spearman)  spearman [1/1 variants]
 Spawned Spearman (player) | Texture: spearman | HP: 120/120 | ...

Debug Overlay:
Name: Spearman (PLAYER)
Texture: spearman
Epoch: stone
\\\

### Step 5: Cross-Reference
1. Check units.json: id="spearman", epoch="stone" 
2. Check getUnitTexture(): 'spearman': ['spearman'] 
3. Check BootScene.ts: load.image('spearman', 'assets/units/stone_age/spearman.png') 
4. Check file exists: public/assets/units/stone_age/spearman.png 

### Step 6: Root Cause
If all checks pass but wrong sprite shows:
- PNG file is wrong image (replace PNG)
- Browser cache (Ctrl+F5)
- Asset not loading (check console errors)

## Performance Impact

### Developer Mode OFF
- Zero overhead
- No extra logging
- No debug overlays

### Developer Mode ON
- ~2ms per frame (60 FPS  59 FPS negligible)
- Console logs for each spawn
- Debug text updates every frame
- Minimal memory usage (Map cleanup)

## Integration with MCP Server

### Semantic Search Queries
\\\
"getUnitTexture random variant selection"
"spawn logging texture debug"
"particle transparency background white"
\\\

### Grep Search Patterns
\\\
"Spawned.*Texture"
" Texture Selection"
"particle-star|particle-gold"
\\\

### Log Analysis
MCP can analyze console logs to detect:
- Missing textures (undefined in array)
- Wrong epoch mappings (epoch mismatch)
- Variant distribution (randomization bias)
- Performance issues (spawn rate too high)

## Future Enhancements

### Planned Features
- [ ] Export logs to file
- [ ] Screenshot with debug overlay
- [ ] Unit spawn history viewer
- [ ] Texture atlas verification tool
- [ ] Automated testing with log analysis

### Data Collection
- [ ] Track variant usage percentages
- [ ] Monitor texture loading errors
- [ ] Detect missing assets automatically
- [ ] Generate missing asset reports

---

**Version:** 1.0
**Last Updated:** 2025-01-25
**Commit:** be27568
