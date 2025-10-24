#  GAME IMPROVEMENT PLAN - MCP Analysis

##  Analysierte Probleme & Lösungen

###  Problem 1: Ranged Units kämpfen im Nahkampf
**IST**: Alle Units stoppen bei Kollision und schlagen sich
**SOLL**: Ranged Units bleiben auf Distanz und schießen

**Lösung**:
- Range-Check vor Kollision
- Ranged units stoppen bei

 range Distanz
- Projektile für Ranged Unit Angriffe

---

###  Problem 2: Attack Speed inkonsistent  
**IST**: attackSpeed in Sekunden (1.5, 2.0) aber Cooldown erwartet MS
**SOLL**: Konsistente Millisekunden-Werte

**Lösung**:
- Konvertiere attackSpeed * 1000 beim Laden
- Oder ändere Daten zu MS-Werten

---

###  Problem 3: Enemy AI zu simpel
**IST**: Spawnt random unit alle 5 Sekunden
**SOLL**: Intelligentes Counter-System

**Lösung**:
- Analysiere Spieler-Units
- Spawne Counter-Units (Melee vs Ranged Balance)
- Adaptive Spawn-Rate basierend auf Gold

---

###  Problem 4: Turret-Targeting suboptimal
**IST**: Targetiert nächste Unit
**SOLL**: Intelligentes Target-Priority-System

**Lösung**:
- Priorisiere: Low HP > Hoher Schaden > Nah
- Configurable per Turret-Typ

---

###  Problem 5: Keine Projektil-Physik für Ranged Units
**IST**: Ranged units nutzen Nahkampf-System
**SOLL**: Eigene Projektile wie Turrets

**Lösung**:
- Erweitere spawnUnit mit Projektil-Support
- Ranged attack = spawn projectile
- Separate Collision-Layer

---

###  Problem 6: Base Attack Range zu gering
**IST**: Units müssen bis x=100/1180 kommen
**SOLL**: Größere Attack-Zone vor Base

**Lösung**:
- Erhöhe Attack-Zone auf 100px
- Base-Damage-Reduction bei Distanz

---

###  Problem 7: Gold Economy zu simpel
**IST**: Flache 6 Gold/Sekunde
**SOLL**: Dynamisches System

**Lösung**:
- Kill-Streak Bonusse
- Economy-Buildings (später)
- Epoch-Multipliers

---

##  Implementierungs-Priorität

### PHASE 1: Critical Gameplay (JETZT)
1.  Ranged Unit Projektil-System
2.  Attack Speed Konvertierung
3.  Base Attack Range

### PHASE 2: AI & Balance (NÄCHSTE)
4.  Smarter Enemy AI
5.  Turret Priority Targeting
6.  Unit Formation Spawn

### PHASE 3: Economy & Polish (SPÄTER)
7.  Dynamic Gold Multipliers
8.  Kill Streak System
9.  Unit Retreat Mechanik

---

##  Balance-Recommendations

### Unit-Typen Balance:

**Melee Units** (aktuell OK):
- Clubman: 96 HP, 8 DMG = 12 Hits to kill
- Spearman: 120 HP, 10 DMG = 12 Hits
-  Balanced

**Ranged Units** (Problem: zu stark im Nahkampf):
- Slinger: 50 HP, 11 DMG = 5 Hits to kill  
-  ZU FRAGIL für Nahkampf
-  Mit Range-System: OK

**Turrets** (aktuell OK):
- Rock Thrower: 180 range, 10 dmg, 2.5s = 4 DPS
- Arrow Tower: 250 range, 20 dmg, 1.8s = 11 DPS
-  Gute Progression

---

##  Code-Changes Needed

### BattleScene.ts Änderungen:

1. **Add Range-Based Combat**:
\\\	ypescript
private checkUnitRange(unit1, unit2): boolean {
  const distance = Phaser.Math.Distance.Between(unit1.x, unit1.y, unit2.x, unit2.y);
  const attackRange = unit1.getData('range');
  return distance <= attackRange;
}
\\\

2. **Ranged Unit Attack**:
\\\	ypescript
private rangedAttack(attacker, target) {
  const projectile = this.projectiles.get(attacker.x, attacker.y, 'arrow');
  // Ähnlich wie fireTurretProjectile
}
\\\

3. **Smart Enemy AI**:
\\\	ypescript
private getCounterUnit(): number {
  const playerMelee = this.playerUnits.countActive(u => u.getData('type') === 'melee');
  const playerRanged = this.playerUnits.countActive(u => u.getData('type') === 'ranged');
  
  if (playerRanged > playerMelee * 1.5) {
    return this.getRandomMeleeUnit(); // Counter mit Melee
  }
  return this.getRandomRangedUnit(); // Sonst Ranged
}
\\\

---

##  Testing Plan

### Test-Szenarien:

1. **Ranged vs Melee**:
   - Spawn 5x Slinger vs 5x Clubman
   - Erwarte: Slinger gewinnt (Distanz-Vorteil)

2. **Turret Effectiveness**:
   - 3x Arrow Tower vs 10x Clubman
   - Erwarte: Towers reduzieren auf 5-6 Units

3. **Enemy AI Adaptation**:
   - Spawne nur Ranged Units
   - Erwarte: Enemy spawnt mehr Melee

4. **Base Attack**:
   - Single Unit reaches base
   - Erwarte: Damage startet bei distance 100

---

##  Expected Improvements

### Gameplay Feel:
-  Ranged Units fühlen sich unterschiedlich an
-  Tactical Positioning wichtiger
-  Enemy AI herausfordernder
-  Turrets wirkungsvoller

### Balance:
-  Unit-Vielfalt wichtiger (nicht nur Spam)
-  Epoch-Progression belohnender
-  Gold-Management interessanter

### Code Quality:
-  Klarer Unterschied Unit-Typen
-  Bessere Performance (range-checks)
-  Einfacher zu erweitern

---

##  Implementation Checklist

- [ ] 1. Ranged Unit Projectile System
- [ ] 2. Range-Based Combat Check
- [ ] 3. Attack Speed MS Conversion
- [ ] 4. Base Attack Zone Expansion
- [ ] 5. Smart Enemy AI
- [ ] 6. Turret Priority Targeting
- [ ] 7. Unit Formation Spawning
- [ ] 8. Kill Streak Gold Bonus
- [ ] 9. Unit Retreat Mechanik
- [ ] 10. Balance Pass Re-Run

---

**NEXT STEP**: Implementiere Phase 1 (Critical Gameplay) JETZT! 
