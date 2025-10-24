import Phaser from 'phaser';
import type { Base, Epoch, UnitType, TurretType } from '../game/types';
import epochsData from '../../data/epochs.json';
import unitsData from '../../data/units.json';
import turretsData from '../../data/turrets.json';
import { 
  calculateXPFromDamage, 
  calculateKillBonusXP, 
  canAdvanceEpoch,
  getEpochSafe
} from '../utils/gameHelpers';

// Lane configuration constants
const LANE_Y = 360;
const LANE_WIDTH = 1280;
const LANE_HEIGHT = 120;
const PLAYER_SPAWN_X = 150;
const ENEMY_SPAWN_X = 1130;
const PLAYER_BASE_X = 100;
const ENEMY_BASE_X = 1180;
const UNIT_CLEANUP_MARGIN = 50;
const KNOCKBACK_DISTANCE = 5;
const COMBAT_COOLDOWN_MS = 1000;

// Turret grid constants
const TURRET_GRID_START_X = 50;
const TURRET_GRID_START_Y = 150;
const TURRET_CELL_SIZE = 60;
const TURRET_GRID_ROWS = 3;
const TURRET_GRID_COLS = 5;

// Special abilities constants
const RAINING_ROCKS_COOLDOWN = 45000; // 45 seconds
const ARTILLERY_STRIKE_COOLDOWN = 60000; // 60 seconds
const RAINING_ROCKS_DAMAGE = 30;
const RAINING_ROCKS_RADIUS = 80;
const RAINING_ROCKS_COUNT = 8;
const ARTILLERY_STRIKE_DAMAGE = 50;
const ARTILLERY_STRIKE_RADIUS = 60;
const ARTILLERY_STRIKE_COUNT = 10;

interface TurretSlot {
  x: number;
  y: number;
  occupied: boolean;
  turret?: Phaser.GameObjects.Sprite;
  turretData?: TurretType;
  lastFireTime: number;
}

export class BattleScene extends Phaser.Scene {
  private playerBase!: Base;
  private enemyBase!: Base;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private playerUnits!: Phaser.Physics.Arcade.Group;
  private enemyUnits!: Phaser.Physics.Arcade.Group;
  private visualEffects!: Phaser.GameObjects.Group;
  private unitsDatabase: UnitType[] = unitsData as UnitType[];
  private turretsDatabase: TurretType[] = turretsData as TurretType[];
  private turretGrid: TurretSlot[][] = [];
  
  // Economy & Progression
  private gold = 100;
  private xp = 0;
  private goldPerSecond = 2; // Reduced from 8 to 2 for better game balance
  private goldAccumulator = 0;
  private epochs: Epoch[] = epochsData as Epoch[];
  private currentEpochIndex = 0;

  // Special abilities
  private rainingRocksLastUsed = -RAINING_ROCKS_COOLDOWN; // Available at start
  private artilleryStrikeLastUsed = -ARTILLERY_STRIKE_COOLDOWN; // Available at start

  // Debug overlay
  private debugEnabled = false;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private debugLastUpdate = 0;
  private readonly DEBUG_UPDATE_INTERVAL = 100; // 10 Hz throttle

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    console.log('BattleScene: Initializing battlefield...');
    this.createBases();
    this.createLane();
    this.createTurretGrid();
    this.setupPools();
    this.setupColliders();
    this.listenToUIEvents();
    this.syncInitialStateToUI();
    this.setupDebugControls();
    
    // Initialize debug graphics
    this.debugGfx = this.add.graphics().setDepth(9999);
    this.input.keyboard!.on('keydown-F2', () => {
      this.debugEnabled = !this.debugEnabled;
      console.log(`Debug overlay: ${this.debugEnabled ? 'ENABLED' : 'DISABLED'}`);
      if (!this.debugEnabled) this.debugGfx.clear();
    });
    
    // Start enemy spawning
    this.startEnemySpawner();
  }

  private syncInitialStateToUI(): void {
    const uiScene = this.scene.get('UIScene');
    uiScene.events.emit('updateGold', this.gold);
    uiScene.events.emit('updateXP', this.xp, this.getCurrentEpoch().xpToNext);
    uiScene.events.emit('updateEpoch', this.getCurrentEpoch().name);
  }

  private getCurrentEpoch(): Epoch {
    return getEpochSafe(this.epochs, this.currentEpochIndex);
  }

  private createBases(): void {
    this.playerBase = { hp: 1000, maxHp: 1000, x: PLAYER_BASE_X, y: LANE_Y, side: 'player' };
    this.enemyBase = { hp: 1000, maxHp: 1000, x: ENEMY_BASE_X, y: LANE_Y, side: 'enemy' };
    
    // Create visible base representations (larger rectangles)
    this.add.rectangle(this.playerBase.x, this.playerBase.y, 40, 80, 0x4169E1); // Blue player base
    this.add.rectangle(this.enemyBase.x, this.enemyBase.y, 40, 80, 0xFF4444); // Red enemy base
  }

  private createLane(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x333333);
    graphics.fillRect(0, LANE_Y - LANE_HEIGHT / 2, LANE_WIDTH, LANE_HEIGHT);
  }

  private createTurretGrid(): void {
    const graphics = this.add.graphics();
    
    // Initialize turret grid slots
    for (let row = 0; row < TURRET_GRID_ROWS; row++) {
      this.turretGrid[row] = [];
      for (let col = 0; col < TURRET_GRID_COLS; col++) {
        const x = TURRET_GRID_START_X + col * TURRET_CELL_SIZE;
        const y = TURRET_GRID_START_Y + row * TURRET_CELL_SIZE;
        
        // Draw grid cell border
        graphics.lineStyle(2, 0x555555);
        graphics.strokeRect(x - TURRET_CELL_SIZE / 2, y - TURRET_CELL_SIZE / 2, TURRET_CELL_SIZE, TURRET_CELL_SIZE);
        
        // Create interactive zone for placement
        const zone = this.add.zone(x, y, TURRET_CELL_SIZE, TURRET_CELL_SIZE).setInteractive();
        zone.setData('row', row);
        zone.setData('col', col);
        
        zone.on('pointerdown', () => {
          this.onTurretSlotClick(row, col);
        });
        
        // Initialize slot data
        this.turretGrid[row][col] = {
          x,
          y,
          occupied: false,
          lastFireTime: 0
        };
      }
    }
  }

  private setupPools(): void {
    // Separate groups for collision optimization and efficient unit recycling
    this.playerUnits = this.physics.add.group({ 
      classType: Phaser.Physics.Arcade.Sprite, 
      maxSize: 50,
      runChildUpdate: false
    });
    this.enemyUnits = this.physics.add.group({ 
      classType: Phaser.Physics.Arcade.Sprite, 
      maxSize: 50,
      runChildUpdate: false
    });
    
    this.projectiles = this.physics.add.group({ 
      classType: Phaser.Physics.Arcade.Sprite, 
      maxSize: 200,
      runChildUpdate: false
    });
    
    // Visual effects pool (for explosions, impacts)
    this.visualEffects = this.add.group({ 
      maxSize: 30,
      runChildUpdate: false
    });
  }

  private setupColliders(): void {
    // Optimized collision groups - only check enemy vs player
    this.physics.add.overlap(this.playerUnits, this.enemyUnits, (obj1, obj2) => {
      const unit1 = obj1 as Phaser.Physics.Arcade.Sprite;
      const unit2 = obj2 as Phaser.Physics.Arcade.Sprite;
      this.handleUnitCollision(unit1, unit2);
    });
    
    // Projectiles vs enemy units
    this.physics.add.overlap(this.projectiles, this.enemyUnits, (proj, unit) => {
      const projectile = proj as Phaser.Physics.Arcade.Sprite;
      const target = unit as Phaser.Physics.Arcade.Sprite;
      if (projectile.getData('owner') === 'player') {
        this.handleProjectileHit(projectile, target);
      }
    });
    
    // Projectiles vs player units (for enemy projectiles)
    this.physics.add.overlap(this.projectiles, this.playerUnits, (proj, unit) => {
      const projectile = proj as Phaser.Physics.Arcade.Sprite;
      const target = unit as Phaser.Physics.Arcade.Sprite;
      if (projectile.getData('owner') === 'enemy') {
        this.handleProjectileHit(projectile, target);
      }
    });
  }

  private listenToUIEvents(): void {
    const uiScene = this.scene.get('UIScene');
    uiScene.events.on('spawnUnit', (index: number) => {
      this.spawnUnit('player', index);
    });
    uiScene.events.on('selectTurret', (index: number) => {
      this.selectTurretType(index);
    });
    uiScene.events.on('useRainingRocks', () => {
      this.useRainingRocks();
    });
    uiScene.events.on('useArtilleryStrike', () => {
      this.useArtilleryStrike();
    });
  }

  private selectedTurretIndex: number = -1;

  private selectTurretType(index: number): void {
    this.selectedTurretIndex = index;
    console.log(`Selected turret type: ${this.turretsDatabase[index]?.name || 'Unknown'}`);
  }

  private onTurretSlotClick(row: number, col: number): void {
    if (this.selectedTurretIndex < 0) {
      console.log('No turret selected');
      return;
    }

    const slot = this.turretGrid[row][col];
    
    if (slot.occupied) {
      console.log('Slot already occupied');
      return;
    }

    const turretData = this.turretsDatabase[this.selectedTurretIndex];
    if (!turretData) {
      console.log('Invalid turret data');
      return;
    }

    // Check cost
    if (this.gold < turretData.goldCost) {
      console.log(`Not enough gold! Need ${turretData.goldCost}, have ${this.gold}`);
      const uiScene = this.scene.get('UIScene');
      uiScene.events.emit('turretPlacementFailed', 'Not enough gold!');
      return;
    }

    // Place turret
    this.placeTurret(row, col, turretData);
    this.addGold(-turretData.goldCost);
    this.selectedTurretIndex = -1; // Reset selection
  }

  private placeTurret(row: number, col: number, turretData: TurretType): void {
    const slot = this.turretGrid[row][col];
    
    // Get appropriate turret texture based on type and epoch
    const turretTexture = this.getTurretTexture(turretData);
    
    // Create turret sprite
    const turret = this.add.sprite(slot.x, slot.y, turretTexture);
    
    // Update slot
    slot.occupied = true;
    slot.turret = turret;
    slot.turretData = turretData;
    slot.lastFireTime = this.time.now;
    
    console.log(`Placed ${turretData.name} at (${row}, ${col}) - Range: ${turretData.range}, DPS: ${turretData.damage / turretData.attackSpeed}`);
  }

  private getTurretTexture(turretData: TurretType): string {
    // Map turret IDs to texture keys
    const turretTextures: Record<string, string> = {
      // Stone Age turrets
      'rock-thrower': 'stone-tower-1',
      'wooden-spike': 'stone-tower-2', 
      'basic-tower': 'stone-tower-3',
      
      // Castle Age turrets
      'arrow-tower': 'castle-tower-1',
      'ballista': 'castle-tower-2',
      'trebuchet': 'castle-tower-3',
      
      // Renaissance turrets
      'cannon': 'renaissance-tower-1',
      'musket-tower': 'renaissance-tower-2',
      'fortress': 'renaissance-tower-3',
      
      // Modern turrets (use renaissance for now)
      'machine-gun': 'renaissance-tower-1',
      'anti-tank': 'renaissance-tower-2',
      'artillery': 'renaissance-tower-3',
      
      // Future turrets (use renaissance for now)
      'laser-turret': 'renaissance-tower-1',
      'rail-gun': 'renaissance-tower-2',
      'ion-cannon': 'renaissance-tower-3'
    };
    
    return turretTextures[turretData.id] || 'stone-tower-1';
  }

  private getUnitTexture(unitData: UnitType): string {
    // Map unit IDs to texture keys  
    const unitTextures: Record<string, string> = {
      'clubman': 'clubman',
      'slinger': 'slinger', 
      'spearman': 'spearman',
      'swordsman': 'swordsman',
      'archer': 'archer',
      'knight': 'knight',
      'cavalry': 'cavalry',
      'musketeer': 'musketeer',
      'duelist': 'duelist',
      'rifleman': 'rifleman',
      'tank': 'tank',
      'grenadier': 'grenadier',
      'sniper': 'sniper'
    };
    
    return unitTextures[unitData.id] || 'clubman';
  }

  private getTurretColor(epoch: string): number {
    const colors: Record<string, number> = {
      stone: 0x8B4513,
      castle: 0x808080,
      renaissance: 0xCD7F32,
      modern: 0x4169E1,
      future: 0x00FFFF
    };
    return colors[epoch] || 0xFFFFFF;
  }

  private spawnUnit(side: 'player' | 'enemy', unitIndex: number): void {
    // Get unit data from database
    const unitData = this.unitsDatabase[Math.min(unitIndex, this.unitsDatabase.length - 1)];
    
    // Check cost for player units
    if (side === 'player') {
      if (this.gold < unitData.goldCost) {
        console.log(`Not enough gold! Need ${unitData.goldCost}, have ${this.gold}`);
        return;
      }
      // Deduct gold
      this.addGold(-unitData.goldCost);
    }
    
    // Get appropriate unit texture based on unit type
    const texture = this.getUnitTexture(unitData);
    const spawnX = side === 'player' ? PLAYER_SPAWN_X : ENEMY_SPAWN_X;
    
    // Get unit from appropriate collision group
    const unitGroup = side === 'player' ? this.playerUnits : this.enemyUnits;
    const unit = unitGroup.get(spawnX, LANE_Y, texture) as Phaser.Physics.Arcade.Sprite;
    
    if (unit) {
      // Initialize unit with data from JSON
      unit.setActive(true).setVisible(true);
      unit.setData('side', side);
      unit.setData('hp', unitData.hp);
      unit.setData('maxHp', unitData.hp);
      unit.setData('damage', unitData.damage);
      unit.setData('speed', unitData.speed);
      unit.setData('range', unitData.range);
      unit.setData('attackSpeed', unitData.attackSpeed);
      unit.setData('cost', unitData.goldCost);
      unit.setData('type', unitData.type);
      unit.setData('inCombat', false);
      unit.setData('lastAttackTime', 0);
      
      // Set constant marching velocity
      const velocityX = side === 'player' ? unitData.speed : -unitData.speed;
      unit.setVelocityX(velocityX);
      
      console.log(`Spawned ${unitData.name} (${side}) - HP: ${unitData.hp}, Speed: ${unitData.speed}, Damage: ${unitData.damage}`);
    }
  }

  private handleUnitCollision(unit1: Phaser.Physics.Arcade.Sprite, unit2: Phaser.Physics.Arcade.Sprite): void {
    // Check if units are already in combat (prevent multiple collision triggers)
    if (unit1.getData('inCombat') || unit2.getData('inCombat')) {
      return;
    }
    
    // Stop units and apply minimal knockback
    const side1 = unit1.getData('side');
    const side2 = unit2.getData('side');
    
    unit1.setVelocityX(0);
    unit2.setVelocityX(0);
    unit1.setData('inCombat', true);
    unit2.setData('inCombat', true);
    
    // Apply knockback
    unit1.x -= side1 === 'player' ? KNOCKBACK_DISTANCE : -KNOCKBACK_DISTANCE;
    unit2.x -= side2 === 'player' ? KNOCKBACK_DISTANCE : -KNOCKBACK_DISTANCE;
    
    // Schedule combat exchange after cooldown
    this.time.delayedCall(COMBAT_COOLDOWN_MS, () => {
      // Check if units still exist
      if (!unit1.active || !unit2.active) {
        return;
      }
      
      const damage1 = unit2.getData('damage');
      const damage2 = unit1.getData('damage');
      const hp1Before = unit1.getData('hp');
      const hp2Before = unit2.getData('hp');
      const hp1 = hp1Before - damage1;
      const hp2 = hp2Before - damage2;
      
      unit1.setData('hp', hp1);
      unit2.setData('hp', hp2);
      
      // Award XP for damage dealt
      if (side1 === 'player') {
        const xpFromDamage = calculateXPFromDamage(damage2, hp2Before);
        this.addXP(xpFromDamage);
      }
      if (side2 === 'player') {
        const xpFromDamage = calculateXPFromDamage(damage1, hp1Before);
        this.addXP(xpFromDamage);
      }
      
      // Handle unit death
      if (hp1 <= 0) {
        if (side2 === 'player') {
          const bonusXP = calculateKillBonusXP(unit1.getData('cost') || 50);
          this.addXP(bonusXP);
        }
        this.recycleUnit(unit1);
      } else {
        // Resume marching if still alive
        unit1.setData('inCombat', false);
        const speed1 = unit1.getData('speed');
        unit1.setVelocityX(side1 === 'player' ? speed1 : -speed1);
      }
      
      if (hp2 <= 0) {
        if (side1 === 'player') {
          const bonusXP = calculateKillBonusXP(unit2.getData('cost') || 50);
          this.addXP(bonusXP);
        }
        this.recycleUnit(unit2);
      } else {
        // Resume marching if still alive
        unit2.setData('inCombat', false);
        const speed2 = unit2.getData('speed');
        unit2.setVelocityX(side2 === 'player' ? speed2 : -speed2);
      }
    });
  }

  private recycleUnit(unit: Phaser.Physics.Arcade.Sprite): void {
    // Return unit to pool for recycling
    const side = unit.getData('side') as 'player' | 'enemy';
    unit.setActive(false);
    unit.setVisible(false);
    unit.setVelocity(0, 0);
    unit.setData('inCombat', false);
    
    // Return to appropriate group pool
    if (side === 'player') {
      this.playerUnits.killAndHide(unit);
    } else {
      this.enemyUnits.killAndHide(unit);
    }
  }

  private handleProjectileHit(projectile: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    const damage = projectile.getData('damage');
    const hpBefore = target.getData('hp');
    const hp = hpBefore - damage;
    target.setData('hp', hp);
    
    // Award XP for damage
    if (projectile.getData('owner') === 'player') {
      const xpFromDamage = calculateXPFromDamage(damage, hpBefore);
      this.addXP(xpFromDamage);
    }
    
    if (hp <= 0) {
      if (projectile.getData('owner') === 'player') {
        const bonusXP = calculateKillBonusXP(target.getData('cost') || 50);
        this.addXP(bonusXP);
      }
      this.recycleUnit(target);
    }
    
    // Recycle projectile
    this.recycleProjectile(projectile);
  }

  private recycleProjectile(projectile: Phaser.Physics.Arcade.Sprite): void {
    // Return projectile to pool for recycling
    projectile.setActive(false);
    projectile.setVisible(false);
    projectile.setVelocity(0, 0);
  }

  private addXP(amount: number): void {
    this.xp += amount;
    const currentEpoch = this.getCurrentEpoch();
    
    // Check for epoch progression using helper
    if (canAdvanceEpoch(this.xp, currentEpoch)) {
      if (this.currentEpochIndex < this.epochs.length - 1) {
        this.currentEpochIndex++;
        this.xp = 0; // Reset XP for new epoch
        const newEpoch = this.getCurrentEpoch();
        console.log(`🎉 Epoch advanced to: ${newEpoch.name}`);
        
        // Notify UI
        const uiScene = this.scene.get('UIScene');
        uiScene.events.emit('updateEpoch', newEpoch.name);
        uiScene.events.emit('updateXP', this.xp, newEpoch.xpToNext);
      }
    } else {
      // Update UI with XP progress
      const uiScene = this.scene.get('UIScene');
      uiScene.events.emit('updateXP', this.xp, currentEpoch.xpToNext);
    }
  }

  private addGold(amount: number): void {
    this.gold += amount;
    const uiScene = this.scene.get('UIScene');
    uiScene.events.emit('updateGold', this.gold);
  }

  update(_time: number, delta: number): void {
    // Gold accumulator tick (6 gold per second)
    this.goldAccumulator += delta;
    const goldTickInterval = 1000 / this.goldPerSecond; // ~166ms per gold
    
    while (this.goldAccumulator >= goldTickInterval) {
      this.goldAccumulator -= goldTickInterval;
      this.addGold(1);
    }
    
    // Update special ability cooldowns
    this.updateSpecialCooldowns();
    
    // Turret firing logic
    this.updateTurrets();
    
    // Update debug overlay if enabled (throttled to 10 Hz)
    if (this.debugEnabled && _time - this.debugLastUpdate >= this.DEBUG_UPDATE_INTERVAL) {
      this.debugLastUpdate = _time;
      this.drawDebugOverlay();
    }
    
    // Clean up units that left the battlefield (recycling to pool)
    this.playerUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      if (sprite.x > LANE_WIDTH + UNIT_CLEANUP_MARGIN) {
        // Player unit reached enemy base
        this.damageBase('enemy', sprite.getData('damage'));
        this.recycleUnit(sprite);
      }
    });
    
    this.enemyUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      if (sprite.x < -UNIT_CLEANUP_MARGIN) {
        // Enemy unit reached player base
        this.damageBase('player', sprite.getData('damage'));
        this.recycleUnit(sprite);
      }
    });
    
    // Clean up projectiles that left the battlefield
    this.projectiles.children.entries.forEach((proj) => {
      const sprite = proj as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      if (sprite.x < -UNIT_CLEANUP_MARGIN || sprite.x > LANE_WIDTH + UNIT_CLEANUP_MARGIN) {
        this.recycleProjectile(sprite);
      }
    });
  }

  private updateTurrets(): void {
    const now = this.time.now;
    
    for (let row = 0; row < TURRET_GRID_ROWS; row++) {
      for (let col = 0; col < TURRET_GRID_COLS; col++) {
        const slot = this.turretGrid[row][col];
        
        if (!slot.occupied || !slot.turretData) continue;
        
        // Check fire rate cooldown
        const cooldown = slot.turretData.attackSpeed * 1000; // Convert to ms
        if (now - slot.lastFireTime < cooldown) continue;
        
        // Find target in range
        const target = this.findTargetInRange(slot.x, slot.y, slot.turretData.range);
        
        if (target) {
          this.fireTurretProjectile(slot, target);
          slot.lastFireTime = now;
        }
      }
    }
  }

  private findTargetInRange(turretX: number, turretY: number, range: number): Phaser.Physics.Arcade.Sprite | null {
    let closestTarget: Phaser.Physics.Arcade.Sprite | null = null;
    let closestDistance = Infinity;
    
    // Only target enemy units
    this.enemyUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      // Only target enemy units
      if (sprite.getData('side') !== 'enemy') return;
      
      const distance = Phaser.Math.Distance.Between(turretX, turretY, sprite.x, sprite.y);
      
      if (distance <= range && distance < closestDistance) {
        closestDistance = distance;
        closestTarget = sprite;
      }
    });
    
    return closestTarget;
  }

  private fireTurretProjectile(slot: TurretSlot, target: Phaser.Physics.Arcade.Sprite): void {
    if (!slot.turretData) return;
    
    // Get projectile from pool
    const projectile = this.projectiles.get(slot.x, slot.y, 'projectile') as Phaser.Physics.Arcade.Sprite;
    
    if (projectile) {
      projectile.setActive(true).setVisible(true);
      projectile.setData('owner', 'player');
      projectile.setData('damage', slot.turretData.damage);
      projectile.setTint(0xFFFF00); // Yellow for turret projectiles
      
      // Calculate velocity toward target
      const angle = Phaser.Math.Angle.Between(slot.x, slot.y, target.x, target.y);
      const velocityX = Math.cos(angle) * slot.turretData.projectileSpeed;
      const velocityY = Math.sin(angle) * slot.turretData.projectileSpeed;
      
      projectile.setVelocity(velocityX, velocityY);
      
      console.log(`Turret fired: ${slot.turretData.name} → Target at (${Math.round(target.x)}, ${Math.round(target.y)})`);
    }
  }

  private damageBase(side: 'player' | 'enemy', damage: number): void {
    const base = side === 'player' ? this.playerBase : this.enemyBase;
    base.hp = Math.max(0, base.hp - damage);
    
    // Update UI
    const uiScene = this.scene.get('UIScene');
    uiScene.events.emit('updateBaseHP', base.hp, base.maxHp, side);
    
    if (base.hp <= 0) {
      console.log(`💥 ${side === 'player' ? 'Player' : 'Enemy'} base destroyed!`);
      // TODO: Trigger game over
    }
  }

  // Special Abilities

  private updateSpecialCooldowns(): void {
    const now = this.time.now;
    const uiScene = this.scene.get('UIScene');
    
    // Raining Rocks cooldown
    const rainingRocksRemaining = Math.max(0, RAINING_ROCKS_COOLDOWN - (now - this.rainingRocksLastUsed));
    uiScene.events.emit('updateRainingRocksCooldown', rainingRocksRemaining, RAINING_ROCKS_COOLDOWN);
    
    // Artillery Strike cooldown
    const artilleryStrikeRemaining = Math.max(0, ARTILLERY_STRIKE_COOLDOWN - (now - this.artilleryStrikeLastUsed));
    uiScene.events.emit('updateArtilleryStrikeCooldown', artilleryStrikeRemaining, ARTILLERY_STRIKE_COOLDOWN);
  }

  private useRainingRocks(): void {
    const now = this.time.now;
    const cooldownRemaining = now - this.rainingRocksLastUsed;
    
    if (cooldownRemaining < RAINING_ROCKS_COOLDOWN) {
      console.log(`Raining Rocks on cooldown: ${Math.ceil((RAINING_ROCKS_COOLDOWN - cooldownRemaining) / 1000)}s remaining`);
      return;
    }
    
    this.rainingRocksLastUsed = now;
    console.log('🪨 Raining Rocks activated!');
    
    // Create multiple impacts along the lane
    for (let i = 0; i < RAINING_ROCKS_COUNT; i++) {
      const delay = i * 200; // 200ms between impacts
      
      this.time.delayedCall(delay, () => {
        // Random position along the lane
        const impactX = 300 + Math.random() * 600; // Mid-field area
        const impactY = LANE_Y + (Math.random() - 0.5) * LANE_HEIGHT;
        
        this.createRockImpact(impactX, impactY);
      });
    }
  }

  private createRockImpact(x: number, y: number): void {
    // Get visual effect from pool or create new
    let impact = this.visualEffects.getFirstDead(false) as ReturnType<Phaser.GameObjects.GameObjectFactory['circle']> | null;
    if (!impact) {
      impact = this.add.circle(x, y, RAINING_ROCKS_RADIUS, 0x8B4513, 0.5);
      this.visualEffects.add(impact);
    } else {
      impact.setPosition(x, y);
      impact.setRadius(RAINING_ROCKS_RADIUS);
      impact.setFillStyle(0x8B4513, 0.5);
      impact.setActive(true);
      impact.setVisible(true);
      impact.setAlpha(0.5);
      impact.setScale(1);
    }
    
    this.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 1.2,
      duration: 500,
      onComplete: () => {
        impact.setActive(false);
        impact.setVisible(false);
      }
    });
    
    // Damage all enemy units in radius
    this.enemyUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      const distance = Phaser.Math.Distance.Between(x, y, sprite.x, sprite.y);
      
      if (distance <= RAINING_ROCKS_RADIUS) {
        const hpBefore = sprite.getData('hp');
        const hp = hpBefore - RAINING_ROCKS_DAMAGE;
        sprite.setData('hp', hp);
        
        // Award XP for damage
        const xpFromDamage = calculateXPFromDamage(RAINING_ROCKS_DAMAGE, hpBefore);
        this.addXP(xpFromDamage);
        
        // Visual feedback - flash white
        sprite.setTint(0xFFFFFF);
        this.time.delayedCall(100, () => {
          if (sprite.active) sprite.clearTint();
        });
        
        if (hp <= 0) {
          const bonusXP = calculateKillBonusXP(sprite.getData('cost') || 50);
          this.addXP(bonusXP);
          this.recycleUnit(sprite);
        }
      }
    });
  }

  private useArtilleryStrike(): void {
    const now = this.time.now;
    const cooldownRemaining = now - this.artilleryStrikeLastUsed;
    
    if (cooldownRemaining < ARTILLERY_STRIKE_COOLDOWN) {
      console.log(`Artillery Strike on cooldown: ${Math.ceil((ARTILLERY_STRIKE_COOLDOWN - cooldownRemaining) / 1000)}s remaining`);
      return;
    }
    
    this.artilleryStrikeLastUsed = now;
    console.log('💥 Artillery Strike activated!');
    
    // Linear salvo along predefined Y-line (lane center)
    const strikeY = LANE_Y;
    const startX = 400;
    const spacing = 80;
    
    for (let i = 0; i < ARTILLERY_STRIKE_COUNT; i++) {
      const delay = i * 150; // 150ms between strikes
      
      this.time.delayedCall(delay, () => {
        const strikeX = startX + i * spacing;
        this.createArtilleryExplosion(strikeX, strikeY);
      });
    }
  }

  private createArtilleryExplosion(x: number, y: number): void {
    // Get explosion effect from pool or create new
    let explosion = this.visualEffects.getFirstDead(false) as ReturnType<Phaser.GameObjects.GameObjectFactory['circle']> | null;
    if (!explosion) {
      explosion = this.add.circle(x, y, ARTILLERY_STRIKE_RADIUS, 0xFF4500, 0.7);
      this.visualEffects.add(explosion);
    } else {
      explosion.setPosition(x, y);
      explosion.setRadius(ARTILLERY_STRIKE_RADIUS);
      explosion.setFillStyle(0xFF4500, 0.7);
      explosion.setActive(true);
      explosion.setVisible(true);
      explosion.setAlpha(0.7);
      explosion.setScale(1);
    }
    
    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.5,
      duration: 400,
      onComplete: () => {
        explosion.setActive(false);
        explosion.setVisible(false);
      }
    });
    
    // Get ring effect from pool or create new
    let ring = this.visualEffects.getFirstDead(false) as ReturnType<Phaser.GameObjects.GameObjectFactory['circle']> | null;
    if (!ring) {
      ring = this.add.circle(x, y, 10, 0xFFFF00, 0.8);
      this.visualEffects.add(ring);
    } else {
      ring.setPosition(x, y);
      ring.setRadius(10);
      ring.setFillStyle(0xFFFF00, 0.8);
      ring.setActive(true);
      ring.setVisible(true);
      ring.setAlpha(0.8);
      ring.setScale(1);
    }
    
    this.tweens.add({
      targets: ring,
      radius: ARTILLERY_STRIKE_RADIUS * 1.2,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        ring.setActive(false);
        ring.setVisible(false);
      }
    });
    
    // Damage all enemy units in radius
    this.enemyUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      const distance = Phaser.Math.Distance.Between(x, y, sprite.x, sprite.y);
      
      if (distance <= ARTILLERY_STRIKE_RADIUS) {
        const hpBefore = sprite.getData('hp');
        const hp = hpBefore - ARTILLERY_STRIKE_DAMAGE;
        sprite.setData('hp', hp);
        
        // Award XP for damage
        const xpFromDamage = calculateXPFromDamage(ARTILLERY_STRIKE_DAMAGE, hpBefore);
        this.addXP(xpFromDamage);
        
        // Visual feedback - flash red
        sprite.setTint(0xFF0000);
        this.time.delayedCall(100, () => {
          if (sprite.active) sprite.clearTint();
        });
        
        // Knockback effect
        const angle = Phaser.Math.Angle.Between(x, y, sprite.x, sprite.y);
        sprite.x += Math.cos(angle) * 15;
        sprite.y += Math.sin(angle) * 15;
        
        if (hp <= 0) {
          const bonusXP = calculateKillBonusXP(sprite.getData('cost') || 50);
          this.addXP(bonusXP);
          this.recycleUnit(sprite);
        }
      }
    });
  }

  // Enemy AI System

  private startEnemySpawner(): void {
    // Spawn enemy units periodically
    this.time.addEvent({
      delay: 5000, // Every 5 seconds
      callback: () => {
        // Random unit from current epoch
        const unitIndex = Math.floor(Math.random() * Math.min(this.currentEpochIndex + 3, this.unitsDatabase.length));
        this.spawnUnit('enemy', unitIndex);
      },
      loop: true
    });
  }

  // Debug Overlay System

  private setupDebugControls(): void {
    // This method is now empty - F2 handler is in create()
  }

  private drawDebugOverlay(): void {
    const g = this.debugGfx;
    g.clear();

    // Units (player/enemy): Hitbox + HP-Bar
    const drawUnitGroup = (group: Phaser.Physics.Arcade.Group, color: number) => {
      group.children.entries.forEach((c) => {
        const s = c as Phaser.Physics.Arcade.Sprite;
        if (!s.active || !s.body) return;
        const body = s.body as Phaser.Physics.Arcade.Body;
        
        // Hitbox
        g.lineStyle(1, color, 1);
        g.strokeRect(body.x, body.y, body.width, body.height);
        
        // HP-Bar
        const hp = (s.getData('hp') as number) ?? 0;
        const maxHp = (s.getData('maxHp') as number) ?? Math.max(1, hp);
        const w = Math.max(20, body.width);
        const pct = Phaser.Math.Clamp(hp / maxHp, 0, 1);
        const x = body.center.x - w / 2;
        const y = body.y - 8;
        g.fillStyle(0x000000, 0.6);
        g.fillRect(x, y, w, 4);
        g.fillStyle(0x00ff00, 0.9);
        g.fillRect(x, y, w * pct, 4);
      });
    };

    // Projectiles
    const drawProjectileGroup = (group: Phaser.Physics.Arcade.Group) => {
      group.children.entries.forEach(c => {
        const s = c as Phaser.Physics.Arcade.Sprite;
        if (!s.active || !s.body) return;
        const b = s.body as Phaser.Physics.Arcade.Body;
        g.lineStyle(1, 0xffff00, 1);
        g.strokeRect(b.x, b.y, b.width, b.height);
      });
    };

    // Turret ranges
    for (let row = 0; row < TURRET_GRID_ROWS; row++) {
      for (let col = 0; col < TURRET_GRID_COLS; col++) {
        const slot = this.turretGrid[row][col];
        if (slot.occupied && slot.turretData) {
          g.lineStyle(1, 0x00ffff, 0.7);
          g.strokeCircle(slot.x, slot.y, slot.turretData.range);
        }
      }
    }

    // Bases: HP-Bars
    const drawBaseHP = (base: Base, x: number, y: number) => {
      const hp = base.hp;
      const maxHp = base.maxHp;
      const w = 80;
      const pct = Phaser.Math.Clamp(hp / maxHp, 0, 1);
      const barX = x - w / 2;
      const barY = y - 40;
      g.fillStyle(0x000000, 0.6);
      g.fillRect(barX, barY, w, 6);
      g.fillStyle(0xff4444, 0.9);
      g.fillRect(barX, barY, w * pct, 6);
    };

    drawBaseHP(this.playerBase, this.playerBase.x, this.playerBase.y);
    drawBaseHP(this.enemyBase, this.enemyBase.x, this.enemyBase.y);

    // Draw unit groups
    drawUnitGroup(this.playerUnits, 0x00ff00);
    drawUnitGroup(this.enemyUnits, 0xff0000);
    drawProjectileGroup(this.projectiles);
  }
}
