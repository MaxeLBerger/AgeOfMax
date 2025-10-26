# Age of Max - New GitHub Issues

Generated: 2025-10-26 23:13:25

## SUMMARY

- **Existing Issues:** 14 (in generated-issues/ folder)
- **New Issues to Create:** 20
- **Total Priority Distribution:**
  - CRITICAL: 2
  - HIGH: 8
  - MEDIUM: 8
  - LOW: 2

---

## ISSUE STATUS

### Already Implemented
-  ISSUE #3: XP Visual Feedback (Option A done)
-  ISSUE #4: Gold Visual Feedback (Option A done)

### From INTEGRATION_GUIDE.md (7 issues)

---

## NEW ISSUES TO CREATE

### ISSUE #1: [Integration] Complete Sound Effects System Integration
**Priority:** HIGH
**Category:** Audio
**Labels:** integration, audio, enhancement

**Description:**
Vollständige Integration von SoundEffectsManager.ts in BattleScene.ts gemäß INTEGRATION_GUIDE.md.

**Implementation Steps:**
1. Import SoundEffectsManager in BattleScene.ts
2. Declare property: \private soundEffects!: SoundEffectsManager;\
3. Initialize in create(): \	his.soundEffects = new SoundEffectsManager(this);\
4. Integrate at these points:
   - \spawnUnit()\  \playUnitSpawn(epoch)\
   - \handleCombat()\  \playCombat(weaponType)\
   - \dvanceEpoch()\  \playEpochAdvance()\
   - \damageBase()\  \playBaseDamage()\
   - \ddGold()\  \playGoldCollect()\
   - \ddXP()\  \playXPGain()\

**Files:**
- src/scenes/BattleScene.ts
- src/utils/SoundEffectsManager.ts

**Dependencies:**
- Requires ISSUE #6 (Audio Assets) to be completed first

---

### ISSUE #2: [Integration] Complete Music Manager Integration
**Priority:** HIGH
**Category:** Audio
**Labels:** integration, audio, music, enhancement

**Description:**
Integration von MusicManager.ts für epochenbasierte dynamische Hintergrundmusik.

**Implementation Steps:**
1. Import MusicManager in BattleScene.ts
2. Declare property: \private musicManager!: MusicManager;\
3. Initialize in create(): \	his.musicManager = new MusicManager(this);\
4. Start battle music: \	his.musicManager.playBattleMusic(currentEpochIndex);\
5. On epoch change: \	his.musicManager.playBattleMusic(newEpochIndex);\
6. On victory: \	his.musicManager.playVictoryMusic();\
7. On defeat: \	his.musicManager.playDefeatMusic();\

**Files:**
- src/scenes/BattleScene.ts
- src/utils/MusicManager.ts

**Dependencies:**
- Requires ISSUE #7 (Music Assets)

---

### ISSUE #3: [Integration] Complete Unit Selection System Integration
**Priority:** HIGH  
**Category:** Gameplay
**Labels:** integration, gameplay, ui, enhancement

**Description:**
Integration von UnitSelectionSystem.ts für klickbare Units mit Info-Panel.

**Implementation Steps:**
1. Import UnitSelectionSystem
2. Declare property: \private unitSelection!: UnitSelectionSystem;\
3. Initialize in create(): \	his.unitSelection = new UnitSelectionSystem(this);\
4. Bei Unit-Erstellung \setData('isUnit', true)\ setzen
5. Bei Unit-Erstellung Stats setzen:
\\\	ypescript
unit.setData('stats', {
  name: unitData.name,
  maxHealth: unitData.hp,
  damage: unitData.damage,
  speed: unitData.speed
});
unit.setData('kills', 0);
unit.setData('rank', 'Recruit');
\\\

**Files:**
- src/scenes/BattleScene.ts
- src/utils/UnitSelectionSystem.ts

---

### ISSUE #4: [Integration] Complete Formation Manager Integration
**Priority:** MEDIUM
**Category:** Gameplay
**Labels:** integration, gameplay, enhancement

**Description:**
Integration von FormationManager.ts für gestaffelte Unit-Spawns (keine Überlappung).

**Implementation Steps:**
1. Import FormationManager
2. Declare property: \private formationManager!: FormationManager;\
3. Initialize: \	his.formationManager = new FormationManager(this);\
4. In spawnUnit() method:
\\\	ypescript
const baseX = side === 'player' ? PLAYER_SPAWN_X : ENEMY_SPAWN_X;
const baseY = LANE_Y;
const spawnPos = this.formationManager.getSpawnPosition(baseX, baseY, lane);
const unit = this.playerUnits.get(spawnPos.x, spawnPos.y, texture);
\\\

**Files:**
- src/scenes/BattleScene.ts
- src/utils/FormationManager.ts

---

### ISSUE #5: [Integration] Complete Kill Streak Manager Integration
**Priority:** MEDIUM
**Category:** Gameplay
**Labels:** integration, gameplay, enhancement

**Description:**
Integration von KillStreakManager.ts für Streak-Boni (3x, 5x, 10x) und visuelles Feedback.

**Implementation Steps:**
1. Import KillStreakManager
2. Declare property: \private killStreakManager!: KillStreakManager;\
3. Initialize: \	his.killStreakManager = new KillStreakManager(this);\
4. Bei Enemy Kill:
\\\	ypescript
private onEnemyKilled(enemy: Unit) {
  const baseGold = 10;
  const bonusGold = this.killStreakManager.registerKill(baseGold);
  const totalGold = baseGold + bonusGold;
  this.addGold(totalGold, enemy.x, enemy.y);
}
\\\

**Files:**
- src/scenes/BattleScene.ts
- src/utils/KillStreakManager.ts

---

### ISSUE #6: [Audio Assets] Add all required Sound Effect files
**Priority:** HIGH
**Category:** Content
**Labels:** assets, audio, content

**Description:**
13 Sound Effect Dateien müssen zu \public/assets/sounds/\ hinzugefügt werden.

**Required Files:**
1. unit_spawn.mp3 - When unit spawns
2. sword_clash.mp3 - Melee combat sound
3. arrow_fire.mp3 - Arrow projectile sound
4. gun_shot.mp3 - Gun/rifle sound
5. explosion.mp3 - Explosions (grenades, rockets)
6. base_damage.mp3 - When base takes damage
7. gold_collect.mp3 - When gold is gained
8. xp_gain.mp3 - When XP is gained
9. epoch_advance.mp3 - Fanfare for epoch progression
10. ability_cast.mp3 - Special ability activation
11. turret_fire.mp3 - Turret shooting
12. victory.mp3 - Victory jingle
13. defeat.mp3 - Defeat sound

**Target Directory:** \public/assets/sounds/\

**Notes:**
- MP3 format preferred
- Short duration (< 3 seconds for effects)
- Volume normalized

---

### ISSUE #7: [Audio Assets] Add all required Music files
**Priority:** MEDIUM
**Category:** Content
**Labels:** assets, audio, music, content

**Description:**
8 Background Music Tracks für verschiedene Epochen und Game States.

**Required Files:**
1. menu_music.mp3 - Main menu background music
2. battle_ancient.mp3 - Stone Age + Ancient battle music
3. battle_medieval.mp3 - Castle Age battle music
4. battle_renaissance.mp3 - Renaissance battle music
5. battle_modern.mp3 - Modern Age battle music
6. battle_future.mp3 - Future Age battle music
7. victory_music.mp3 - Victory screen music
8. defeat_music.mp3 - Defeat screen music

**Target Directory:** \public/assets/sounds/\

**Notes:**
- MP3 format
- Looping tracks (2-3 minutes)
- Epoch-appropriate style (ancient  medieval  modern  futuristic)

---

### ISSUE #8: [Assets] Missing PNG animations for all units
**Priority:** HIGH
**Category:** Content
**Labels:** assets, sprites, animations, content

**Description:**
Fehlende Sprite-Animationen für alle 16 Units. Jede Unit braucht mindestens 3 Animationszustände.

**Required Animations per Unit:**
1. **WALK** - Laufen/Marschieren (2-4 frames)
2. **ATTACK** - Kämpfen/Angreifen (3-5 frames)
3. **DEATH** - Sterben (2-3 frames)

**Affected Units (16 total):**
- Stone Age: Clubman, Spearman, Slinger, Dino Rider
- Ancient: Swordsman, Archer, Cavalry, Catapult
- Castle: Knight, Ballista
- Renaissance: Musketeer, Cannon, Duelist, Cavalry
- Modern: Rifleman, Grenadier, Tank, Sniper
- Future: Laser Soldier, Mech, Plasma Trooper, Super Heavy

**Format:**
- PNG sprite sheets
- Transparent background
- Consistent sizing (64x64 per frame)
- Side view, facing right

**Reference:** \docs/UNIT_SPRITE_PROMPTS_OPTIMIZED.md\

---

### ISSUE #9: [Bug] Units can walk past enemy units
**Priority:** CRITICAL
**Category:** Gameplay
**Labels:** bug, collision, combat, critical

**Description:**
Units können manchmal an gegnerischen Units vorbeilaufen, wodurch das Spiel vorzeitig endet obwohl noch kämpfende Truppen auf dem Feld sind.

**Current Behavior:**
- Units collide  enter combat
- Sometimes units slip past each other
- Game ends prematurely (base destroyed while units still fighting)

**Expected Behavior:**
- All enemy units MUST collide
- No unit should bypass enemy units
- Combat should be guaranteed

**Root Cause:**
- Race condition in handleUnitCollision()
- Velocity not set to 0 fast enough
- Physics body overlap detection issues

**Proposed Fix:**
1. Increase collision detection frequency
2. Add collision bounds check every frame
3. Implement "collision lanes" (units in same Y-range must collide)
4. Add safety check: if unit passes X-threshold without combat  force stop

**Files:**
- src/scenes/BattleScene.ts (handleUnitCollision method)
- src/scenes/BattleScene.ts (setupColliders method)

**Testing:**
- Spawn 10 units each side  verify all collide
- Check combat flag persistence
- Verify no units reach enemy base while combat ongoing

---

### ISSUE #10: [Feature] Display Player Base Health
**Priority:** HIGH
**Category:** UI/UX
**Labels:** feature, ui, enhancement

**Description:**
Base-Leben soll für beide Basen angezeigt werden (aktuell: BASE_MAX_HP = 1500).

**Current State:**
- Base HP exists (\playerBase.hp\, \enemyBase.hp\)
- No visual display
- Player doesn't know how much HP base has left

**Required Implementation:**
1. Health bars above both bases
2. HP text (e.g., "1200 / 1500 HP")
3. Color-coded bars (green  yellow  red)
4. Update on damage

**UI Elements:**
\\\	ypescript
// Player Base (left)
- Health bar at (100, 450)
- Text: "BASE HP: 1500/1500"
- Green fill bar

// Enemy Base (right)
- Health bar at (1080, 450)
- Text: "ENEMY HP: 1500/1500"
- Red fill bar
\\\

**Files:**
- src/scenes/BattleScene.ts (createBases method)
- src/scenes/BattleScene.ts (damageBase method)

---

### ISSUE #11: [Feature] Epoch-specific Base PNGs
**Priority:** MEDIUM
**Category:** Content
**Labels:** assets, feature, visual

**Description:**
Pro Epoche verschiedene PNG-Grafiken für Player und Enemy Base.

**Required Assets:**
1. **Stone Age:** Stone hut, cave entrance
2. **Ancient:** Wood palisade fort
3. **Castle:** Stone castle, medieval fortress
4. **Renaissance:** Renaissance fortress, cannon fort
5. **Modern:** Concrete bunker, military base
6. **Future:** Sci-fi base, energy shield base

**Format:**
- PNG with transparency
- Size: 128x128 or 256x256
- Left-facing (Player Base) and right-facing (Enemy Base) versions

**Implementation:**
- Load epoch-specific texture on epoch change
- Update in \updateBackground()\ method
- Smooth transition between epochs

**Target Directory:** \public/assets/buildings/bases/\

**Files:**
- src/scenes/BattleScene.ts (updateBackground method)

---

### ISSUE #12: [Balance] Drastically increase Base HP
**Priority:** HIGH
**Category:** Gameplay
**Labels:** balance, gameplay

**Description:**
Base HP drastisch erhöhen. Aktuell verliert man sofort wenn ein einzelner Gegner die Base erreicht.

**Current Values:**
\\\	ypescript
const BASE_MAX_HP = 1500;
\\\

**Problem:**
- Single enemy unit deals 10-50 damage per second
- Base destroyed in 30-150 seconds
- No time to react or defend
- Game too fast/unfair

**Proposed New Values:**
\\\	ypescript
const BASE_MAX_HP = 5000; // Starting value (Stone Age)
\\\

**Recommended HP per Epoch:**
- Stone Age: 5000 HP
- Ancient: 7500 HP
- Castle: 10000 HP
- Renaissance: 15000 HP
- Modern: 20000 HP
- Future: 30000 HP

**Files:**
- src/scenes/BattleScene.ts (line 25: BASE_MAX_HP constant)

**Related:** See ISSUE #13 for automatic scaling

---

### ISSUE #13: [Balance] Scale Base HP per Epoch
**Priority:** MEDIUM
**Category:** Gameplay
**Labels:** balance, feature, gameplay

**Description:**
Base HP soll automatisch pro Epoche erhöht werden (progressives Scaling).

**Implementation:**
\\\	ypescript
private getBaseMaxHP(epochIndex: number): number {
  const baseHP = [5000, 7500, 10000, 15000, 20000, 30000];
  return baseHP[epochIndex] || 5000;
}

// In advanceEpoch():
private advanceEpoch() {
  this.currentEpochIndex++;
  
  // Scale base HP
  const newMaxHP = this.getBaseMaxHP(this.currentEpochIndex);
  this.playerBase.maxHp = newMaxHP;
  this.enemyBase.maxHp = newMaxHP;
  
  // Heal bases to new max (or keep percentage)
  const playerHPPercent = this.playerBase.hp / this.playerBase.maxHp;
  this.playerBase.hp = Math.floor(newMaxHP * playerHPPercent);
  
  // ...
}
\\\

**Files:**
- src/scenes/BattleScene.ts
- src/game/types.ts (Base interface needs maxHp property)

**Dependencies:**
- ISSUE #12 (Base HP increase)
- ISSUE #10 (Base health display)

---

### ISSUE #14: [Feature] Turret Drag & Drop System
**Priority:** HIGH
**Category:** Gameplay
**Labels:** feature, turrets, gameplay, enhancement

**Description:**
Implementation von Drag & Drop Mechanic für Defense Towers auf der Player Base.

**Requirements:**
1. **Drag & Drop UI:**
   - Turret-Menü mit verfügbaren Türmen
   - Drag from menu
   - Drop on Player Base (valid zone)
   - Visual feedback (green = valid, red = invalid)

2. **Turret Placement:**
   - Only on Player Base (X: 50-250, Y: 400-550)
   - Max 5-8 turrets total
   - No overlapping turrets
   - Grid-snapping for clean placement

3. **Turret Range:**
   - Turrets can only fire up to ~40% of battlefield
   - Range: 250-350 pixels from base
   - Visual range indicator on placement

4. **Turret Upgrading:**
   - Drag new turret onto existing  upgrade
   - Cost: turret price + upgrade fee
   - Stats improve (damage, range, fire rate)

**Files to Create/Modify:**
- src/utils/TurretDragDropSystem.ts (NEW)
- src/scenes/BattleScene.ts (integrate system)
- src/scenes/UIScene.ts (turret menu)

**Data Changes:**
- data/turrets.json (ensure range values correct)

**UI Elements:**
- Turret menu panel (bottom-left or right side)
- Drag preview sprite
- Placement grid overlay
- Range circle indicator

**Dependencies:**
- ISSUE #15 (Turret PNG assets)
- ISSUE #16 (Elevated base visual)

---

### ISSUE #15: [Assets] Defense Tower PNGs per Epoch
**Priority:** MEDIUM
**Category:** Content
**Labels:** assets, turrets, content

**Description:**
PNG-Grafiken für Defense Towers pro Epoche (5-6 tower types  6 epochs).

**Required Turret Types per Epoch:**

**Stone Age:**
- Watchtower (throws rocks)
- Slingshot tower

**Ancient:**
- Archer tower (shoots arrows)
- Ballista tower (large bolts)

**Castle:**
- Cannon tower (cannonballs)
- Crossbow tower

**Renaissance:**
- Musket tower (bullets)
- Artillery tower (shells)

**Modern:**
- Machine gun tower (rapid fire)
- AA Gun tower (anti-air)

**Future:**
- Laser turret (energy beams)
- Plasma cannon (plasma bolts)

**Format:**
- PNG with transparency
- Size: 64x64 or 128x128
- Top-down view (turret on top of base)
- Multiple states: idle, firing (optional)

**Target Directory:** \public/assets/turrets/\

**Naming Convention:**
\\\
stone_watchtower.png
ancient_archer_tower.png
castle_cannon_tower.png
renaissance_musket_tower.png
modern_mg_tower.png
future_laser_turret.png
\\\

---

### ISSUE #16: [Feature] Elevated Base for Turret Placement
**Priority:** MEDIUM
**Category:** Gameplay
**Labels:** feature, visual, turrets

**Description:**
Player Base sollte visuell erhöht dargestellt werden damit Türme klar 'auf' der Base platziert werden können.

**Visual Requirements:**
1. **Elevated Platform:**
   - Base sits on platform/hill
   - 20-30 pixels higher than ground
   - Shadow underneath for depth

2. **Turret Placement Zone:**
   - Clear grid/slots visible on base
   - 5-8 positions marked
   - Glowing when turret can be placed

3. **Depth Effect:**
   - Parallax effect (optional)
   - Base appears "behind" ground units
   - Turrets appear "above" ground units

**Implementation:**
\\\	ypescript
// Base depth layers:
- Ground layer (z: 0)
- Base platform (z: 10)
- Turrets on base (z: 15)
- Units (z: 20)
- UI (z: 1000)
\\\

**Files:**
- src/scenes/BattleScene.ts (createBases method)
- public/assets/buildings/base_platform.png (NEW asset)

**Related:**
- ISSUE #14 (Turret Drag & Drop)
- ISSUE #11 (Epoch-specific bases)

---

### ISSUE #17: [Bug] Unit size inconsistencies - Duelist too small
**Priority:** MEDIUM
**Category:** Visual
**Labels:** bug, visual, units

**Description:**
Duelist (Renaissance) ist zu klein im Vergleich zu anderen Units.

**Current State:**
- Duelist sprite scale: ~1.0
- Appears significantly smaller than Knight, Cavalry, etc.
- Hard to see and click

**Expected:**
- Duelist should be similar size to Knight
- Suggested scale: 1.3-1.5

**Fix:**
\\\	ypescript
// In spawnPlayerUnit() or enemy spawner:
if (unitData.id === 'duelist') {
  unit.setScale(1.4);
}
\\\

**Alternative Fix:**
- Adjust in units.json if scale property exists
- Or create unit-specific scale mapping

**Files:**
- src/scenes/BattleScene.ts
- data/units.json (if adding scale property)

**Testing:**
- Visual comparison with Knight
- Ensure hitbox matches visual size

---

### ISSUE #18: [Bug] Cannon positioning too high
**Priority:** LOW
**Category:** Visual
**Labels:** bug, visual, units

**Description:**
Cannon (Renaissance) sollte visuell etwas tiefer/weiter unten positioniert sein.

**Current State:**
- Cannon Y position: same as other units (LANE_Y = 500)
- Appears to "float" because of its horizontal shape

**Expected:**
- Cannon should appear more grounded
- Suggested: Y + 10-15 pixels

**Fix:**
\\\	ypescript
// In spawnPlayerUnit():
if (unitData.id === 'cannon') {
  unit.y += 12;
}
\\\

**Files:**
- src/scenes/BattleScene.ts (spawnPlayerUnit, spawnEnemyUnit)

**Note:** Low priority, purely cosmetic

---

### ISSUE #19: [Bug] Ranged Units attack in melee range
**Priority:** CRITICAL
**Category:** Gameplay
**Labels:** bug, combat, critical, ranged-units

**Description:**
Fernkampf-Units haben zwar 'range' Werte (150-400 pixels) in units.json, greifen aber nur im Nahkampf an wie Melee-Units.

**Current Behavior:**
- Slinger (range: 150), Archer (range: 200), Musketeer (range: 250) laufen bis zur Collision
- Dann handleUnitCollision()  Nahkampf-System
- Ranged units schlagen mit Fäusten statt zu schießen

**Expected Behavior:**
- Ranged units stop at their attack range distance
- Fire projectiles at enemy
- Never enter melee combat unless forced

**Root Cause:**
- \handleRangedAttack()\ method does NOT exist
- No range-check before collision
- No projectile spawning for units (only turrets have projectiles)

**Affected Units (11 total):**
1. Slinger (range: 150)
2. Archer (range: 200)
3. Ballista (range: 250)
4. Musketeer (range: 250)
5. Cannon (range: 280)
6. Rifleman (range: 300)
7. Grenadier (range: 220)
8. Tank (range: 280)
9. Sniper (range: 400)
10. Laser Soldier (range: 320)
11. Mech (range: 300)
12. Plasma Trooper (range: 340)

**Files:**
- src/scenes/BattleScene.ts
- data/units.json

**Dependencies:**
- ISSUE #20 (Ranged Combat System implementation)

---

### ISSUE #20: [Feature] Implement Ranged Unit Combat System
**Priority:** CRITICAL
**Category:** Gameplay
**Labels:** feature, combat, ranged-units, enhancement

**Description:**
Komplettes Ranged Combat System für alle Fernkampf-Units implementieren.

**Required Implementation:**

**1. Range Detection:**
\\\	ypescript
private checkUnitsInRange(): void {
  this.playerUnits.children.entries.forEach(unit => {
    if (unit.getData('type') !== 'ranged') return;
    
    const range = unit.getData('range');
    const target = this.findTargetInRange(unit.x, unit.y, range, 'enemy');
    
    if (target) {
      unit.setVelocityX(0); // Stop moving
      this.handleRangedAttack(unit, target);
    }
  });
}
\\\

**2. Ranged Attack Handler:**
\\\	ypescript
private handleRangedAttack(attacker: Sprite, target: Sprite): void {
  const now = this.time.now;
  const lastAttack = attacker.getData('lastRangedAttack') || 0;
  const attackSpeed = attacker.getData('attackSpeed') * 1000;
  
  if (now - lastAttack < attackSpeed) return;
  
  // Fire projectile
  this.fireUnitProjectile(attacker, target);
  attacker.setData('lastRangedAttack', now);
}
\\\

**3. Unit Projectile System:**
\\\	ypescript
private fireUnitProjectile(shooter: Sprite, target: Sprite): void {
  const projectile = this.projectiles.get(shooter.x, shooter.y, this.getProjectileTexture(shooter));
  projectile.setActive(true).setVisible(true);
  
  // Aim at target
  const angle = Phaser.Math.Angle.Between(shooter.x, shooter.y, target.x, target.y);
  const speed = 300;
  this.physics.velocityFromRotation(angle, speed, projectile.body.velocity);
  
  projectile.setData('damage', shooter.getData('damage'));
  projectile.setData('owner', shooter.getData('side'));
}
\\\

**4. Collision Modification:**
\\\	ypescript
private handleUnitCollision(unit1: Sprite, unit2: Sprite): void {
  // Check if either unit is ranged
  const type1 = unit1.getData('type');
  const type2 = unit2.getData('type');
  
  if (type1 === 'ranged' || type2 === 'ranged') {
    // Ranged units don't melee - separate them
    unit1.x -= unit1.getData('side') === 'player' ? 10 : -10;
    unit2.x -= unit2.getData('side') === 'player' ? 10 : -10;
    return; // No melee combat
  }
  
  // Proceed with melee combat for melee units
  // ... existing melee code ...
}
\\\

**Testing Checklist:**
- [ ] Slinger stops at 150px and shoots rocks
- [ ] Archer shoots arrows at 200px range
- [ ] Musketeer fires bullets at 250px
- [ ] Sniper has longest range (400px)
- [ ] Projectiles travel in correct direction
- [ ] Damage applies on hit
- [ ] Attack speed cooldown works
- [ ] Ranged units never enter melee
- [ ] Mixed armies (melee + ranged) work together

**Files:**
- src/scenes/BattleScene.ts (multiple methods)

**Dependencies:**
- ISSUE #19 (Bug report)

---

## PRIORITIZATION

### Immediate (CRITICAL):
1. ISSUE #9 - Units walking past each other
2. ISSUE #19 - Ranged units melee bug
3. ISSUE #20 - Ranged combat system

### High Priority (Must Have):
4. ISSUE #1 - Sound Effects Integration
5. ISSUE #2 - Music Integration
6. ISSUE #3 - Unit Selection Integration
7. ISSUE #6 - Sound Effect Assets
8. ISSUE #8 - Unit Animation PNGs
9. ISSUE #10 - Base Health Display
10. ISSUE #12 - Base HP Increase
11. ISSUE #14 - Turret Drag & Drop

### Medium Priority (Should Have):
12. ISSUE #4 - Formation Integration
13. ISSUE #5 - Kill Streak Integration
14. ISSUE #7 - Music Assets
15. ISSUE #11 - Epoch-specific Base PNGs
16. ISSUE #13 - Scale Base HP per Epoch
17. ISSUE #15 - Turret PNG Assets
18. ISSUE #16 - Elevated Base Visual
19. ISSUE #17 - Duelist size fix

### Low Priority (Nice to Have):
20. ISSUE #18 - Cannon positioning

---

## NEXT STEPS

1. Review this list
2. Create GitHub Issues using \gh issue create\ or web interface
3. Assign labels, milestones, projects
4. Start with CRITICAL issues first
5. Track progress in GitHub Projects

