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
import { gameLogger } from '../utils/logger';
import { XPFeedbackSystem } from '../utils/XPFeedbackSystem';
import { GoldFeedbackSystem } from '../utils/GoldFeedbackSystem';

// Lane configuration constants
const LANE_Y = 500; // Ganz unten am Boden der Basen
const LANE_WIDTH = 1280;
const LANE_HEIGHT = 120;
const PLAYER_SPAWN_X = 150;
const ENEMY_SPAWN_X = 1130;
const PLAYER_BASE_X = 100;
const ENEMY_BASE_X = 1180;
const BASE_ATTACK_RANGE = 100; // Units start attacking base from this distance
const BASE_MAX_HP = 5000; // Extracted base HP for easy tuning
const UNIT_CLEANUP_MARGIN = 50;
const KNOCKBACK_DISTANCE = 5;
const COMBAT_COOLDOWN_MS = 800; // Reduced from 1000ms to 800ms for more dynamic fights

// Turret grid constants
const TURRET_GRID_START_X = 50;
const TURRET_GRID_START_Y = 170; // Weiter nach unten verschoben, weg von der Epochenanzeige
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

interface UnitHealthBar {
  background: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  container: Phaser.GameObjects.Container;
}

interface GameUnit extends Phaser.Physics.Arcade.Sprite {
  unitData?: UnitType;
  maxHp?: number;
  currentHp?: number;
  healthBar?: UnitHealthBar;
  side?: 'player' | 'enemy';
}

export class BattleScene extends Phaser.Scene {
  private playerBase!: Base;
  private enemyBase!: Base;
  private playerBaseHealthBar?: { background: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text };
  private enemyBaseHealthBar?: { background: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text };
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
  private goldPerSecond = 8; // MCP Recommendation: Increased from 2 to 8 per balance pass
  private goldAccumulator = 0;
  private epochs: Epoch[] = epochsData as Epoch[];
  private currentEpochIndex = 0;

  // Feedback Systems
  private xpFeedback!: XPFeedbackSystem;
  private goldFeedback!: GoldFeedbackSystem;

  // Kill Streak System
  private killStreak = 0;
  private lastKillTime = 0;
  private readonly KILL_STREAK_TIMEOUT = 5000; // 5 seconds to maintain streak
  private streakText?: Phaser.GameObjects.Text;

  // Difficulty settings
  private difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  private difficultyMultipliers = {
    easy: { enemySpawnRate: 6000, enemyStats: 0.7, startingGold: 200 },
    medium: { enemySpawnRate: 4000, enemyStats: 1.0, startingGold: 100 },
    hard: { enemySpawnRate: 3000, enemyStats: 1.3, startingGold: 50 }
  };

  // Special abilities
  private rainingRocksLastUsed = -RAINING_ROCKS_COOLDOWN; // Available at start
  private artilleryStrikeLastUsed = -ARTILLERY_STRIKE_COOLDOWN; // Available at start

  // Debug overlay
  private debugEnabled = false;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private debugLastUpdate = 0;
  private readonly DEBUG_UPDATE_INTERVAL = 100; // 10 Hz throttle

  // Developer Mode - Advanced debugging
  private developerMode = false;
  private unitDebugTexts: Map<Phaser.Physics.Arcade.Sprite, Phaser.GameObjects.Text> = new Map();

  // Background
  private backgroundImage!: Phaser.GameObjects.Image;

  // Unit Formation System - DISABLED (keep on same height like original)
  private spawnQueue: Array<{ side: 'player' | 'enemy', unitData: UnitType, delay: number }> = [];
  private lastSpawnTime: Record<'player' | 'enemy', number> = { player: 0, enemy: 0 };
  private readonly SPAWN_QUEUE_DELAY = 250; // ms delay between queued spawns

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    console.log('BattleScene: Initializing battlefield...');
    
    // Load difficulty from registry
    this.difficulty = this.registry.get('difficulty') || 'medium';
    console.log(`🎮 Difficulty: ${this.difficulty.toUpperCase()}`);
    
    // Apply difficulty-based starting gold
    this.gold = this.difficultyMultipliers[this.difficulty].startingGold;
    
    // Initialize feedback systems
    this.xpFeedback = new XPFeedbackSystem(this);
    this.goldFeedback = new GoldFeedbackSystem(this);
    
    this.createBackground(); // Hintergrund zuerst erstellen
    this.createLane();     // Zuerst den Weg erstellen
    this.createBases();    // Dann die Basen darüber
    this.createTurretGrid();
    this.setupPools();
    this.setupColliders();
    this.createTestUI();   // Test UI direkt hier
    this.listenToUIEvents();
    this.syncInitialStateToUI();
    this.setupDebugControls();
    
    // Load developer mode from localStorage
    const savedDevMode = localStorage.getItem('developerMode');
    this.developerMode = savedDevMode === 'true';
    console.log(`🔧 Developer Mode: ${this.developerMode ? 'ENABLED' : 'DISABLED'}`);
    
    // Initialize debug graphics
    this.debugGfx = this.add.graphics().setDepth(9999);
    this.input.keyboard!.on('keydown-F2', () => {
      this.debugEnabled = !this.debugEnabled;
      console.log(`Debug overlay: ${this.debugEnabled ? 'ENABLED' : 'DISABLED'}`);
      if (!this.debugEnabled) this.debugGfx.clear();
    });
    
    // F3 toggles Developer Mode
    this.input.keyboard!.on('keydown-F3', () => {
      this.developerMode = !this.developerMode;
      localStorage.setItem('developerMode', this.developerMode.toString());
      console.log(`🔧 Developer Mode: ${this.developerMode ? 'ENABLED' : 'DISABLED'}`);
      
      if (this.developerMode) {
        // Developer Mode ENABLED: Create debug texts for all existing active units
        this.playerUnits.children.entries.forEach((unit) => {
          const sprite = unit as Phaser.Physics.Arcade.Sprite;
          if (sprite.active) {
            const gameUnit = sprite as GameUnit;
            // Only create if doesn't exist yet
            if (!this.unitDebugTexts.has(sprite)) {
              this.createUnitDebugText(gameUnit);
            }
          }
        });
        
        this.enemyUnits.children.entries.forEach((unit) => {
          const sprite = unit as Phaser.Physics.Arcade.Sprite;
          if (sprite.active) {
            const gameUnit = sprite as GameUnit;
            // Only create if doesn't exist yet
            if (!this.unitDebugTexts.has(sprite)) {
              this.createUnitDebugText(gameUnit);
            }
          }
        });
        
        console.log(`✅ Created debug overlays for ${this.unitDebugTexts.size} existing units`);
      } else {
        // Developer Mode DISABLED: Clear existing debug texts
        this.unitDebugTexts.forEach(text => text.destroy());
        this.unitDebugTexts.clear();
      }
      
      // Show notification
      const notif = this.add.text(640, 360, 
        `Developer Mode: ${this.developerMode ? 'ON' : 'OFF'}\n(F3 to toggle)`, 
        {
          fontSize: '32px',
          fontStyle: 'bold',
          color: this.developerMode ? '#00ff00' : '#ff0000',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 }
        }
      ).setOrigin(0.5).setDepth(10000);
      
      this.time.delayedCall(2000, () => notif.destroy());
    });
    
    // Start enemy spawning
    this.startEnemySpawner();
  }

  private syncInitialStateToUI(): void {
    const uiScene = this.scene.get('UIScene');
    uiScene.events.emit('updateGold', this.gold);
    uiScene.events.emit('updateXP', this.xp, this.getCurrentEpoch().xpToNext);
    uiScene.events.emit('updateEpoch', this.getCurrentEpoch().name);
    
    // Create kill streak UI element (top-center)
    this.streakText = this.add.text(640, 30, '', {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(3000).setVisible(false);
  }

  private getCurrentEpoch(): Epoch {
    return getEpochSafe(this.epochs, this.currentEpochIndex);
  }

  private createBackground(): void {
    // Set initial background based on current epoch
    const backgroundKey = this.getBackgroundKey();
    this.backgroundImage = this.add.image(640, 360, backgroundKey);
    
    // Scale to fit screen (1280x720)
    this.backgroundImage.setDisplaySize(1280, 720);
    this.backgroundImage.setDepth(-100); // Weit hinter allem anderen, besonders UI
  }

  private getBackgroundKey(): string {
    const epoch = this.getCurrentEpoch();
    const epochId = epoch.id;
    
    const backgroundMap: Record<string, string> = {
      'stone': 'stone-age-bg',
      'castle': 'castle-age-bg',
      'renaissance': 'renaissance-bg',
      'modern': 'modern-bg',
      'future': 'modern-bg' // Fallback to modern for future
    };
    
    return backgroundMap[epochId] || 'stone-age-bg';
  }

  private updateBackground(): void {
    const newBackgroundKey = this.getBackgroundKey();
    if (this.backgroundImage && this.backgroundImage.texture.key !== newBackgroundKey) {
      this.backgroundImage.setTexture(newBackgroundKey);
    }
  }

  private createBases(): void {
    this.playerBase = { hp: BASE_MAX_HP, maxHp: BASE_MAX_HP, x: PLAYER_BASE_X, y: LANE_Y, side: 'player' };
    this.enemyBase = { hp: BASE_MAX_HP, maxHp: BASE_MAX_HP, x: ENEMY_BASE_X, y: LANE_Y, side: 'enemy' };
    
    // Create visible base representations using PNG assets
    // Position them higher so units walk at their base (units are now at Y=500)
    const baseVisualY = LANE_Y - 40; // Basen deutlich höher, da Units jetzt bei Y=500 laufen
    this.add.image(this.playerBase.x, baseVisualY, 'player-base').setScale(0.2);
    this.add.image(this.enemyBase.x, baseVisualY, 'enemy-base').setScale(0.2);

    // Create health bars for bases
    this.createBaseHealthBar('player');
    this.createBaseHealthBar('enemy');
  }

  private createLane(): void {
    // Lane ist jetzt transparent - die visuelle Lane kommt vom Hintergrundbild
    // Keine visuellen Elemente mehr, nur Kollisionserkennung wenn nötig
  }

  private createHealthBar(unit: Phaser.Physics.Arcade.Sprite): UnitHealthBar {
    const barWidth = 30;
    const barHeight = 4;
    const barOffsetY = -35; // Höher über der Unit
    
    // Hintergrund (dunkelrot)
    const background = this.add.rectangle(
      unit.x, 
      unit.y + barOffsetY, 
      barWidth, 
      barHeight, 
      0x660000
    );
    
    // Gesundheitsbalken (grün) - anchor links setzen für right-to-left abbau
    const fill = this.add.rectangle(
      unit.x, 
      unit.y + barOffsetY, 
      barWidth, 
      barHeight, 
      0x00ff00
    );
    fill.setOrigin(1, 0.5); // Origin rechts, damit von rechts nach links abbaut
    
    // Container für einfache Bewegung
    const container = this.add.container(0, 0, [background, fill]);
    container.setDepth(10); // Über allem anderen
    
    return {
      background,
      fill,
      container
    };
  }

  private createBaseHealthBar(side: 'player' | 'enemy'): void {
    const base = side === 'player' ? this.playerBase : this.enemyBase;
    const barWidth = 200;
    const barHeight = 20;
    const barY = 420; // Position above the base
    const barX = base.x;

    // Background (dark red)
    const background = this.add.rectangle(
      barX,
      barY,
      barWidth,
      barHeight,
      0x660000
    );
    background.setOrigin(0.5, 0.5);

    // Health fill (green for player, red for enemy)
    const fillColor = side === 'player' ? 0x00ff00 : 0xff6600;
    const fill = this.add.rectangle(
      barX,
      barY,
      barWidth,
      barHeight,
      fillColor
    );
    fill.setOrigin(0.5, 0.5);

    // Health text
    const text = this.add.text(
      barX,
      barY,
      `${base.hp}/${base.maxHp}`,
      {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    );
    text.setOrigin(0.5, 0.5);
    text.setDepth(12);

    // Set depth
    background.setDepth(10);
    fill.setDepth(11);

    // Store references
    if (side === 'player') {
      this.playerBaseHealthBar = { background, fill, text };
    } else {
      this.enemyBaseHealthBar = { background, fill, text };
    }
  }

  private updateBaseHealthBar(side: 'player' | 'enemy'): void {
    const base = side === 'player' ? this.playerBase : this.enemyBase;
    const healthBar = side === 'player' ? this.playerBaseHealthBar : this.enemyBaseHealthBar;
    
    if (!healthBar) return;

    // Calculate health percentage
    const healthPercent = base.hp / base.maxHp;
    const barWidth = 200;
    
    // Update fill width
    healthBar.fill.width = barWidth * healthPercent;
    
    // Update text
    healthBar.text.setText(`${Math.ceil(base.hp)}/${base.maxHp}`);
    
    // Change color based on health percentage
    if (healthPercent > 0.6) {
      healthBar.fill.setFillStyle(side === 'player' ? 0x00ff00 : 0xff6600);
    } else if (healthPercent > 0.3) {
      healthBar.fill.setFillStyle(0xffaa00);
    } else {
      healthBar.fill.setFillStyle(0xff0000);
    }
  }

  private updateHealthBar(unit: GameUnit): void {
    if (!unit.healthBar || !unit.maxHp || !unit.currentHp) return;
    
    const healthPercent = unit.currentHp / unit.maxHp;
    const barWidth = 30;
    
    // Position der Healthbar über der Unit aktualisieren
    const barOffsetY = -35; // Höher über der Unit
    const barCenterX = unit.x;
    
    // Background bleibt zentriert
    unit.healthBar.background.setPosition(barCenterX, unit.y + barOffsetY);
    
    // Fill ist rechts-verankert, positioniere am rechten Rand
    unit.healthBar.fill.setPosition(barCenterX + barWidth / 2, unit.y + barOffsetY);
    
    // Breite des Gesundheitsbalkens anpassen (von rechts nach links)
    unit.healthBar.fill.setDisplaySize(barWidth * healthPercent, 4);
    
    // Farbe je nach Gesundheit ändern
    if (healthPercent > 0.6) {
      unit.healthBar.fill.setFillStyle(0x00ff00); // Grün
    } else if (healthPercent > 0.3) {
      unit.healthBar.fill.setFillStyle(0xffff00); // Gelb
    } else {
      unit.healthBar.fill.setFillStyle(0xff6600); // Orange
    }
    
    // Healthbar verstecken wenn Unit tot
    if (unit.currentHp <= 0) {
      unit.healthBar.container.setVisible(false);
    }
  }

  private destroyHealthBar(unit: GameUnit): void {
    if (unit.healthBar) {
      unit.healthBar.background.destroy();
      unit.healthBar.fill.destroy();
      unit.healthBar.container.destroy();
      unit.healthBar = undefined;
    }
    
    // Also destroy debug text if Developer Mode is on
    if (this.developerMode) {
      const debugText = this.unitDebugTexts.get(unit);
      if (debugText) {
        debugText.destroy();
        this.unitDebugTexts.delete(unit);
      }
    }
  }

  private goldText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private epochText!: Phaser.GameObjects.Text;
  private unitButtons: Array<{btn: Phaser.GameObjects.Rectangle, nameText: Phaser.GameObjects.Text, costText: Phaser.GameObjects.Text, unitData: UnitType | null}> = [];

  private createTestUI(): void {
    // Test UI direkt in der BattleScene erstellen
    this.goldText = this.add.text(20, 20, `Gold: ${this.gold}`, { 
      fontSize: '24px', 
      color: '#ffd700',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    this.goldText.setDepth(2000);
    
    this.xpText = this.add.text(20, 50, `XP: ${this.xp}/${this.getCurrentEpoch().xpToNext}`, { 
      fontSize: '20px', 
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    this.xpText.setDepth(2000);
    
    this.epochText = this.add.text(20, 80, `Epoch: ${this.getCurrentEpoch().name}`, { 
      fontSize: '20px', 
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    this.epochText.setDepth(2000);
    
    // Unit spawn buttons (U1-U5) - dynamisch basierend auf Epoche
    const buttonY = 660;
    for (let i = 0; i < 5; i++) {
      const btn = this.add.rectangle(200 + i * 80, buttonY, 70, 50, 0x444444).setInteractive();
      btn.setDepth(2000);
      
      const nameText = this.add.text(200 + i * 80, buttonY - 10, '', { 
        fontSize: '11px', 
        color: '#ffffff' 
      }).setOrigin(0.5);
      nameText.setDepth(2000);
      
      const costText = this.add.text(200 + i * 80, buttonY + 10, '', { 
        fontSize: '12px', 
        color: '#ffd700' 
      }).setOrigin(0.5);
      costText.setDepth(2000);
      
      this.unitButtons.push({btn, nameText, costText, unitData: null});
      
      btn.on('pointerdown', () => {
        const buttonData = this.unitButtons[i];
        if (buttonData.unitData !== null) {
          // Use queue system for formations
          this.queueUnitSpawn('player', buttonData.unitData);
        }
      });
    }
    
    // Initial update für verfügbare Units
    this.updateAvailableUnits();
    
    // Turret placement buttons (T1-T5)
    const turretButtonY = 600;
    for (let i = 0; i < 5; i++) {
      const turretData = this.turretsDatabase[i];
      const btn = this.add.rectangle(200 + i * 80, turretButtonY, 70, 50, 0x663300).setInteractive();
      btn.setDepth(2000);
      const text = this.add.text(200 + i * 80, turretButtonY - 10, turretData.name, { 
        fontSize: '11px', 
        color: '#ffffff' 
      }).setOrigin(0.5);
      text.setDepth(2000);
      const costText = this.add.text(200 + i * 80, turretButtonY + 10, `${turretData.goldCost}g`, { 
        fontSize: '12px', 
        color: '#ffd700' 
      }).setOrigin(0.5);
      costText.setDepth(2000);
      
      btn.on('pointerdown', () => {
        console.log(`Selected turret ${i + 1}: ${turretData.name}`);
        this.selectedTurretIndex = i;
      });
    }
    
    console.log('Test UI with buttons created with depth 2000');
  }

  private updateAvailableUnits(): void {
    // Hole die Units für die aktuelle Epoche
    const currentEpoch = this.getCurrentEpoch();
    const epochId = currentEpoch.id;
    
    // Filtere Units nach Epoche (alle Units dieser Epoche, maximal 5 für UI)
    const availableUnits = this.unitsDatabase.filter(unit => unit.epoch === epochId).slice(0, 5);
    
    // Aktualisiere die Button-Anzeigen
    for (let i = 0; i < this.unitButtons.length; i++) {
      const buttonData = this.unitButtons[i];
      
      if (i < availableUnits.length) {
        const unit = availableUnits[i];
        
        // Store the actual unit data reference (not the index!)
        buttonData.unitData = unit;
        buttonData.nameText.setText(unit.name);
        buttonData.costText.setText(`${unit.goldCost}g`);
        buttonData.btn.setFillStyle(0x444444);
        buttonData.btn.setInteractive();
        buttonData.nameText.setVisible(true);
        buttonData.costText.setVisible(true);
      } else {
        // Button deaktivieren (nicht genug Units in dieser Epoche)
        buttonData.unitData = null;
        buttonData.nameText.setText('---');
        buttonData.costText.setText('');
        buttonData.btn.setFillStyle(0x222222);
        buttonData.btn.disableInteractive();
        buttonData.nameText.setVisible(true);
        buttonData.costText.setVisible(false);
      }
    }
    
    console.log(`📋 ${currentEpoch.name} - Available units: ${availableUnits.map(u => u.name).join(', ')}`);
  }

  private updateAllHealthBars(): void {
    // Update healthbars for all active player units
    this.playerUnits.children.entries.forEach((unit) => {
      const gameUnit = unit as GameUnit;
      if (gameUnit.active && gameUnit.healthBar) {
        this.updateHealthBar(gameUnit);
      }
    });
    
    // Update healthbars for all active enemy units
    this.enemyUnits.children.entries.forEach((unit) => {
      const gameUnit = unit as GameUnit;
      if (gameUnit.active && gameUnit.healthBar) {
        this.updateHealthBar(gameUnit);
      }
    });
  }

  private createTurretGrid(): void {
    // Initialize turret grid slots (ohne visuelle Grid-Linien)
    for (let row = 0; row < TURRET_GRID_ROWS; row++) {
      this.turretGrid[row] = [];
      for (let col = 0; col < TURRET_GRID_COLS; col++) {
        const x = TURRET_GRID_START_X + col * TURRET_CELL_SIZE;
        const y = TURRET_GRID_START_Y + row * TURRET_CELL_SIZE;
        
        // Keine visuellen Grid-Linien mehr
        // graphics.lineStyle() - entfernt
        // graphics.strokeRect() - entfernt
        
        // Create interactive zone for placement (unsichtbar)
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
    // Use collider instead of overlap to ensure units can't pass through each other
    this.physics.add.collider(this.playerUnits, this.enemyUnits, (obj1, obj2) => {
      const unit1 = obj1 as Phaser.Physics.Arcade.Sprite;
      const unit2 = obj2 as Phaser.Physics.Arcade.Sprite;
      this.handleUnitCollision(unit1, unit2);
    }, undefined, this);
    
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
    
    // Create turret sprite with proper scaling
    const turret = this.add.sprite(slot.x, slot.y, turretTexture);
    turret.setScale(0.15); // Minimal size für perfekte Grid-Passung
    
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
    // Map unit IDs to texture keys with variants support
    // Each unit can have multiple variants that will be randomly selected
    const unitTextures: Record<string, string[]> = {
      // Stone Age
      'clubman': ['clubman', 'clubman_2'],
      'spearman': ['spearman'],
      'slinger': ['slinger'], 
      'dino-rider': ['dino-rider'],
      
      // Castle Age
      'swordsman': ['swordsman'],
      'archer': ['archer', 'archer_2'], // MOVED from Renaissance
      'knight': ['knight'],
      'ballista': ['ballista'], // MOVED from Renaissance
      
      // Renaissance Age
      'musketeer': ['musketeer'],
      'cavalry': ['cavalry'], // MOVED from Castle
      'cannon': ['cannon'], // MOVED from Castle
      'duelist': ['duelist'],
      
      // Modern Age
      'rifleman': ['rifleman', 'rifleman_2'],
      'grenadier': ['grenadier'], // MOVED from Renaissance
      'tank': ['tank'],
      'sniper': ['sniper']
    };
    
    const variants = unitTextures[unitData.id] || ['clubman'];
    // Randomly select a variant for visual variety
    const randomIndex = Math.floor(Math.random() * variants.length);
    const selectedTexture = variants[randomIndex];
    
    // Developer Mode: Log texture selection for debugging
    if (this.developerMode) {
      console.log(`🎨 Texture Selection: ${unitData.name} (${unitData.id}) → ${selectedTexture} [${randomIndex + 1}/${variants.length} variants]`);
      // Also log to game logger for MCP analysis
      gameLogger.textureSelection(unitData.name, unitData.id, selectedTexture, randomIndex + 1, variants.length);
    }
    
    return selectedTexture;
  }

  private getUnitScale(unitData: UnitType): number {
    // Size-based scaling for visual hierarchy
    const unitScales: Record<string, number> = {
      // Infantry units (64x64) - Base size
      'clubman': 0.10,
      'slinger': 0.10, 
      'spearman': 0.10,
      'swordsman': 0.10,
      'archer': 0.10,
      'musketeer': 0.10,
      'duelist': 0.10,
      'rifleman': 0.10,
      'grenadier': 0.10,
      'sniper': 0.10,
      
      // Mounted units (96x96) - 20% larger than infantry
      'dino-rider': 0.12,
      'knight': 0.12, // Increased from 0.08
      'cavalry': 0.12, // Increased from 0.08
      
      // Siege units (96x96) - Same as mounted
      'ballista': 0.12, // Increased from 0.08
      'cannon': 0.12, // Increased from 0.08
      
      // Heavy vehicles (128x96) - 40% larger than infantry
      'tank': 0.14 // Increased from 0.06
    };
    
    return unitScales[unitData.id] || 0.1;
  }

  /**
   * Spawn a unit directly using UnitType data (for UI buttons)
   * This ensures the correct unit is spawned regardless of database index changes
   */
  private spawnUnitByData(side: 'player' | 'enemy', unitData: UnitType): void {
    // Apply difficulty multiplier to enemy units
    const statMultiplier = side === 'enemy' ? this.difficultyMultipliers[this.difficulty].enemyStats : 1.0;
    
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
    const spawnY = LANE_Y; // Always spawn on same height (like original Age of War)
    
    // Get unit from appropriate collision group
    const unitGroup = side === 'player' ? this.playerUnits : this.enemyUnits;
    const unit = unitGroup.get(spawnX, spawnY, texture) as Phaser.Physics.Arcade.Sprite;

    if (unit) {
      // CRITICAL FIX: Explicitly set texture on pooled sprite to prevent old textures from persisting
      unit.setTexture(texture);
      // Initialize unit with data from JSON
      unit.setActive(true).setVisible(true);
      
      // Set appropriate scale based on unit type
      const scale = this.getUnitScale(unitData);
      unit.setScale(scale);
      
      // Set direction: Player units face right, enemy units face left
      if (side === 'enemy') {
        unit.setFlipX(true); // Flip enemy units to face left
      } else {
        unit.setFlipX(false); // Player units face right (default)
      }
      
      // Apply difficulty multiplier to stats
      const adjustedHp = Math.round(unitData.hp * statMultiplier);
      const adjustedDamage = Math.round(unitData.damage * statMultiplier);
      const adjustedSpeed = unitData.speed; // Speed nicht anpassen
      
      // Extend unit with health properties
      const gameUnit = unit as GameUnit;
      gameUnit.unitData = unitData;
      gameUnit.maxHp = adjustedHp;
      gameUnit.currentHp = adjustedHp;
      gameUnit.side = side;
      
      // Healthbar wird erst bei Schaden erstellt - nicht sofort
      gameUnit.healthBar = undefined;
      
      unit.setData('side', side);
      unit.setData('hp', adjustedHp);
      unit.setData('maxHp', adjustedHp);
      unit.setData('damage', adjustedDamage);
      unit.setData('speed', adjustedSpeed);
      unit.setData('range', unitData.range);
      unit.setData('attackSpeed', unitData.attackSpeed);
      unit.setData('cost', unitData.goldCost);
      unit.setData('type', unitData.type);
      unit.setData('inCombat', false);
      unit.setData('lastAttackTime', 0);
      
      // Set constant marching velocity
      const velocityX = side === 'player' ? adjustedSpeed : -adjustedSpeed;
      unit.setVelocityX(velocityX);
      
      // Developer Mode: Create debug text for this unit
      if (this.developerMode) {
        this.createUnitDebugText(gameUnit);
      }
      
      // Enhanced logging with texture info
      console.log(`✅ Spawned ${unitData.name} (${side}) | Texture: ${texture} | HP: ${adjustedHp}/${unitData.hp} | DMG: ${adjustedDamage} | SPD: ${adjustedSpeed} | Epoch: ${unitData.epoch}`);
      
      // Log to game logger for MCP analysis
      gameLogger.unitSpawn(unitData.name, side, texture, `${adjustedHp}/${unitData.hp}`, adjustedDamage, adjustedSpeed, unitData.epoch);
    }
  }

  private spawnUnit(side: 'player' | 'enemy', unitIndex: number): void {
    // Get unit data from database
    const unitData = this.unitsDatabase[Math.min(unitIndex, this.unitsDatabase.length - 1)];
    
    // Delegate to spawnUnitByData for consistency
    this.spawnUnitByData(side, unitData);
  }

  /**
   * Queue-based spawn system with formation support
   * Adds unit to spawn queue with calculated formation offset
   */
  private queueUnitSpawn(side: 'player' | 'enemy', unitData: UnitType): void {
    const now = this.time.now;
    const timeSinceLastSpawn = now - this.lastSpawnTime[side];
    
    // If enough time has passed, spawn immediately
    if (timeSinceLastSpawn >= this.SPAWN_QUEUE_DELAY) {
      this.spawnUnitWithFormation(side, unitData);
      this.lastSpawnTime[side] = now;
    } else {
      // Otherwise add to queue
      const delay = this.SPAWN_QUEUE_DELAY - timeSinceLastSpawn;
      this.spawnQueue.push({ side, unitData, delay });
    }
  }

  /**
   * Spawn unit without formation (like original Age of War - same height)
   */
  private spawnUnitWithFormation(side: 'player' | 'enemy', unitData: UnitType): void {
    // Just spawn directly on the lane - no formation offset
    this.spawnUnitByData(side, unitData);
  }

  /**
   * Process spawn queue in update loop
   */
  private processSpawnQueue(currentTime: number): void {
    // Process queue items whose delay has expired
    const toSpawn: Array<{ side: 'player' | 'enemy', unitData: UnitType }> = [];
    
    this.spawnQueue = this.spawnQueue.filter(item => {
      item.delay -= this.game.loop.delta;
      if (item.delay <= 0) {
        toSpawn.push({ side: item.side, unitData: item.unitData });
        return false; // Remove from queue
      }
      return true; // Keep in queue
    });
    
    // Spawn queued units
    toSpawn.forEach(({ side, unitData }) => {
      this.spawnUnitWithFormation(side, unitData);
      this.lastSpawnTime[side] = currentTime;
    });
  }

  private handleUnitCollision(unit1: Phaser.Physics.Arcade.Sprite, unit2: Phaser.Physics.Arcade.Sprite): void {
    // Check if units are already in combat (prevent multiple collision triggers)
    if (unit1.getData('inCombat') || unit2.getData('inCombat')) {
      return;
    }
    
    // Verify both units are still active before starting combat
    if (!unit1.active || !unit2.active) {
      return;
    }
    
    // Verify units are from opposite sides
    const side1 = unit1.getData('side');
    const side2 = unit2.getData('side');
    
    if (side1 === side2) {
      return; // Same side, don't fight
    }
    
    // NEW: Check if either unit is ranged - prevent melee combat
    const type1 = unit1.getData('type');
    const type2 = unit2.getData('type');
    
    if (type1 === 'ranged' || type2 === 'ranged') {
      // Ranged units don't engage in melee - push them apart
      const pushDistance = 15;
      unit1.x -= side1 === 'player' ? pushDistance : -pushDistance;
      unit2.x -= side2 === 'player' ? pushDistance : -pushDistance;
      
      // Ensure they keep moving
      const speed1 = unit1.getData('speed');
      const speed2 = unit2.getData('speed');
      unit1.setVelocityX(side1 === 'player' ? speed1 : -speed1);
      unit2.setVelocityX(side2 === 'player' ? speed2 : -speed2);
      return; // No melee combat
    }
    
    // MELEE COMBAT: Both units are melee type
    // CRITICAL FIX: Immediately stop units to prevent pass-through
    unit1.setVelocityX(0);
    unit2.setVelocityX(0);
    
    // Make bodies immovable during combat
    if (unit1.body) (unit1.body as Phaser.Physics.Arcade.Body).immovable = true;
    if (unit2.body) (unit2.body as Phaser.Physics.Arcade.Body).immovable = true;
    
    unit1.setData('inCombat', true);
    unit2.setData('inCombat', true);
    
    // Apply knockback
    unit1.x -= side1 === 'player' ? KNOCKBACK_DISTANCE : -KNOCKBACK_DISTANCE;
    unit2.x -= side2 === 'player' ? KNOCKBACK_DISTANCE : -KNOCKBACK_DISTANCE;
    
    // Schedule combat exchange after cooldown
    this.time.delayedCall(COMBAT_COOLDOWN_MS, () => {
      // Check if units still exist - if one died, release the other
      if (!unit1.active && !unit2.active) {
        return; // Both dead, nothing to do
      }
      
      if (!unit1.active) {
        // Unit1 died, release unit2
        if (unit2.active) {
          unit2.setData('inCombat', false);
          const speed2 = unit2.getData('speed');
          unit2.setVelocityX(side2 === 'player' ? speed2 : -speed2);
        }
        return;
      }
      
      if (!unit2.active) {
        // Unit2 died, release unit1
        if (unit1.active) {
          unit1.setData('inCombat', false);
          const speed1 = unit1.getData('speed');
          unit1.setVelocityX(side1 === 'player' ? speed1 : -speed1);
        }
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
      
      // Update GameUnit health properties and healthbars
      const gameUnit1 = unit1 as GameUnit;
      const gameUnit2 = unit2 as GameUnit;
      
      if (gameUnit1.currentHp !== undefined) {
        gameUnit1.currentHp = hp1;
        if (!gameUnit1.healthBar) {
          gameUnit1.healthBar = this.createHealthBar(unit1);
        }
        this.updateHealthBar(gameUnit1);
      }
      
      if (gameUnit2.currentHp !== undefined) {
        gameUnit2.currentHp = hp2;
        if (!gameUnit2.healthBar) {
          gameUnit2.healthBar = this.createHealthBar(unit2);
        }
        this.updateHealthBar(gameUnit2);
      }
      
      // Award XP for damage dealt
      if (side1 === 'player') {
        const xpFromDamage = calculateXPFromDamage(damage2, hp2Before);
        this.addXP(xpFromDamage);
      }
      if (side2 === 'player') {
        const xpFromDamage = calculateXPFromDamage(damage1, hp1Before);
        this.addXP(xpFromDamage);
      }
      
      // Handle unit death - ALWAYS clear inCombat flag before recycling
      if (hp1 <= 0) {
        if (side2 === 'player') {
          const bonusXP = calculateKillBonusXP(unit1.getData('cost') || 50);
          this.addXP(bonusXP, unit1.x, unit1.y);
          // Kill streak gold bonus
          const goldReward = this.addKillToStreak();
          this.addGold(goldReward, unit1.x, unit1.y);
          this.showGoldParticles(unit1.x, unit1.y, goldReward);
        }
        unit1.setData('inCombat', false); // Clear flag before recycling
        this.recycleUnit(unit1);
        
        // Release the survivor immediately
        if (hp2 > 0 && unit2.active) {
          unit2.setData('inCombat', false);
          if (unit2.body) (unit2.body as Phaser.Physics.Arcade.Body).immovable = false;
          const speed2 = unit2.getData('speed');
          unit2.setVelocityX(side2 === 'player' ? speed2 : -speed2);
        }
      } else if (hp2 <= 0) {
        if (side1 === 'player') {
          const bonusXP = calculateKillBonusXP(unit2.getData('cost') || 50);
          this.addXP(bonusXP, unit2.x, unit2.y);
          // Kill streak gold bonus
          const goldReward = this.addKillToStreak();
          this.addGold(goldReward, unit2.x, unit2.y);
          this.showGoldParticles(unit2.x, unit2.y, goldReward);
        }
        unit2.setData('inCombat', false); // Clear flag before recycling
        this.recycleUnit(unit2);
        
        // Release the survivor immediately
        if (hp1 > 0 && unit1.active) {
          unit1.setData('inCombat', false);
          if (unit1.body) (unit1.body as Phaser.Physics.Arcade.Body).immovable = false;
          const speed1 = unit1.getData('speed');
          unit1.setVelocityX(side1 === 'player' ? speed1 : -speed1);
        }
      } else {
        // Both survived - resume marching for both
        unit1.setData('inCombat', false);
        unit2.setData('inCombat', false);
        
        // Reset immovable state
        if (unit1.body) (unit1.body as Phaser.Physics.Arcade.Body).immovable = false;
        if (unit2.body) (unit2.body as Phaser.Physics.Arcade.Body).immovable = false;
        
        const speed1 = unit1.getData('speed');
        const speed2 = unit2.getData('speed');
        unit1.setVelocityX(side1 === 'player' ? speed1 : -speed1);
        unit2.setVelocityX(side2 === 'player' ? speed2 : -speed2);
        
        // Apply small separation to prevent instant re-collision
        unit1.x += side1 === 'player' ? 2 : -2;
        unit2.x += side2 === 'player' ? 2 : -2;
      }
    });
  }

  private recycleUnit(unit: Phaser.Physics.Arcade.Sprite): void {
    // Destroy health bar first
    const gameUnit = unit as GameUnit;
    this.destroyHealthBar(gameUnit);
    
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
    
    // Update GameUnit health properties and healthbar
    const gameUnit = target as GameUnit;
    if (gameUnit.currentHp !== undefined) {
      gameUnit.currentHp = hp;
      
      // Erstelle Healthbar erst beim ersten Schaden
      if (!gameUnit.healthBar) {
        gameUnit.healthBar = this.createHealthBar(target);
      }
      
      this.updateHealthBar(gameUnit);
    }
    
    // Award XP for damage
    if (projectile.getData('owner') === 'player') {
      const xpFromDamage = calculateXPFromDamage(damage, hpBefore);
      this.addXP(xpFromDamage, target.x, target.y);
    }
    
    if (hp <= 0) {
      if (projectile.getData('owner') === 'player') {
        const bonusXP = calculateKillBonusXP(target.getData('cost') || 50);
        this.addXP(bonusXP, target.x, target.y);
        // Also add gold reward for kill
        this.addGold(10);
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

  private attackBase(unit: Phaser.Physics.Arcade.Sprite, targetBaseSide: 'player' | 'enemy'): void {
    const now = this.time.now;
    const lastAttackTime = unit.getData('lastAttackTime') || 0;
    const attackSpeed = unit.getData('attackSpeed') || 1000; // Default 1 attack per second
    
    // Check if enough time has passed since last attack
    if (now - lastAttackTime >= attackSpeed) {
      const damage = unit.getData('damage') || 10;
      this.damageBase(targetBaseSide, damage);
      unit.setData('lastAttackTime', now);
      
      console.log(`Unit attacking ${targetBaseSide} base for ${damage} damage`);
    }
  }

  private addXP(amount: number, x?: number, y?: number): void {
    this.xp += amount;
    const currentEpoch = this.getCurrentEpoch();
    
    // Visual feedback with new XP Feedback System
    if (x !== undefined && y !== undefined) {
      this.xpFeedback.showXPGain(x, y, amount);
    }
    
    // Check for epoch progression using helper
    if (canAdvanceEpoch(this.xp, currentEpoch)) {
      if (this.currentEpochIndex < this.epochs.length - 1) {
        this.currentEpochIndex++;
        this.xp = 0; // Reset XP for new epoch
        const newEpoch = this.getCurrentEpoch();
        console.log(`🎉 Epoch advanced to: ${newEpoch.name}`);
        
        // Update background for new epoch
        this.updateBackground();
        
        // Update available units for new epoch
        this.updateAvailableUnits();
        
        // Update TestUI
        if (this.xpText) this.xpText.setText(`XP: ${this.xp}/${newEpoch.xpToNext}`);
        if (this.epochText) this.epochText.setText(`Epoch: ${newEpoch.name}`);
        
        // Notify UI
        const uiScene = this.scene.get('UIScene');
        uiScene.events.emit('updateEpoch', newEpoch.name);
        uiScene.events.emit('updateXP', this.xp, newEpoch.xpToNext);
      }
    } else {
      // Update TestUI
      if (this.xpText) this.xpText.setText(`XP: ${this.xp}/${currentEpoch.xpToNext}`);
      
      // Update UI with XP progress
      const uiScene = this.scene.get('UIScene');
      uiScene.events.emit('updateXP', this.xp, currentEpoch.xpToNext);
    }
  }

  private addGold(amount: number, x?: number, y?: number): void {
    this.gold += amount;
    
    // Update TestUI
    if (this.goldText) this.goldText.setText(`Gold: ${this.gold}`);
    
    const uiScene = this.scene.get('UIScene');
    uiScene.events.emit('updateGold', this.gold);
    
    // Visual feedback with new Gold Feedback System
    if (x !== undefined && y !== undefined) {
      this.goldFeedback.showGoldGain(x, y, amount, false);
    }
  }

  // ===== VISUAL FEEDBACK METHODS =====
  
  /**
   * Show floating text that rises and fades out
   */
  private showFloatingText(x: number, y: number, text: string, color: string, fontSize: number): void {
    const floatingText = this.add.text(x, y, text, {
      fontSize: `${fontSize}px`,
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    floatingText.setOrigin(0.5, 0.5);
    floatingText.setDepth(1000); // Above everything
    
    // Animate: Float up and fade out - reduced
    this.tweens.add({
      targets: floatingText,
      y: y - 40, // Reduced from 60
      alpha: 0,
      duration: 1000, // Reduced from 1500ms
      ease: 'Cubic.easeOut',
      onComplete: () => {
        floatingText.destroy();
      }
    });
  }
  
  /**
   * Show golden sparkle particles for XP gains
   */
  private showXPParticles(x: number, y: number): void {
    // Create temporary particle emitter with one-shot emission
    const particles = this.add.particles(x, y, 'particle-star', {
      speed: { min: 30, max: 80 }, // Reduced from 50-150
      scale: { start: 0.8, end: 0 }, // Start at 80% of 16px = ~13px
      alpha: { start: 1.0, end: 0 }, // Full visibility to fade
      angle: { min: 0, max: 360 },
      lifespan: 600, // Reduced from 800ms
      gravityY: -80, // Reduced from -100
      emitting: false
    });
    
    // Emit fewer particles (was 8)
    particles.emitParticle(4);
    
    // Destroy after animation
    this.time.delayedCall(800, () => {
      particles.destroy();
    });
  }

  private showGoldParticles(x: number, y: number, amount: number): void {
    // Create gold coin particles - reduced effect
    const particles = this.add.particles(x, y, 'particle-gold', {
      speed: { min: 40, max: 80 }, // Reduced from 50-100
      angle: { min: 240, max: 300 },
      scale: { start: 0.8, end: 0 }, // Start at 80% of 12px = ~10px
      alpha: { start: 1.0, end: 0 },
      lifespan: 600, // Reduced from 800ms
      gravityY: 250, // Faster fall
      quantity: Math.min(Math.floor(amount / 4), 4), // Reduced from /2 and max 8
      emitting: false
    });
    
    // Emit particles once
    particles.emitParticle();
    
    // Destroy after animation
    this.time.delayedCall(800, () => {
      particles.destroy();
    });
  }

  /**
   * Kill Streak System - returns gold reward based on streak
   */
  private addKillToStreak(): number {
    const now = this.time.now;
    
    // Check if streak expired
    if (now - this.lastKillTime > this.KILL_STREAK_TIMEOUT) {
      this.killStreak = 0;
    }
    
    // Increment streak
    this.killStreak++;
    this.lastKillTime = now;
    
    // Calculate gold multiplier
    let multiplier = 1.0;
    let streakName = '';
    let streakColor = '#ffffff';
    
    if (this.killStreak >= 15) {
      multiplier = 2.5;
      streakName = '🔥 MEGA STREAK! 🔥';
      streakColor = '#ff0000';
    } else if (this.killStreak >= 10) {
      multiplier = 2.0;
      streakName = '⚡ LEGENDARY! ⚡';
      streakColor = '#ff4500';
    } else if (this.killStreak >= 5) {
      multiplier = 1.5;
      streakName = '💎 ELITE STREAK!';
      streakColor = '#ffd700';
    } else if (this.killStreak >= 3) {
      multiplier = 1.2;
      streakName = '⭐ STREAK!';
      streakColor = '#ffff00';
    }
    
    // Update streak display
    if (this.killStreak >= 3 && this.streakText) {
      this.streakText.setText(`${this.killStreak}x ${streakName}`);
      this.streakText.setColor(streakColor);
      this.streakText.setVisible(true);
      
      // Pulse effect
      this.tweens.add({
        targets: this.streakText,
        scale: { from: 1.2, to: 1.0 },
        duration: 200,
        ease: 'Back.out'
      });
    } else if (this.streakText) {
      this.streakText.setVisible(false);
    }
    
    // Calculate gold reward
    const baseGold = 10;
    const reward = Math.round(baseGold * multiplier);
    
    console.log(`Kill Streak: ${this.killStreak}x | Reward: ${reward}g (${multiplier}x)`);
    return reward;
  }

  update(_time: number, delta: number): void {
    // Process spawn queue
    this.processSpawnQueue(_time);
    
    // Gold accumulator tick (8 gold per second)
    this.goldAccumulator += delta;
    const goldTickInterval = 1000 / this.goldPerSecond; // ~125ms per gold
    
    while (this.goldAccumulator >= goldTickInterval) {
      this.goldAccumulator -= goldTickInterval;
      this.addGold(1);
    }
    
    // Update health bars for all units
    this.updateAllHealthBars();
    
    // Update Developer Mode debug texts
    if (this.developerMode) {
      this.updateUnitDebugTexts();
    }
    
    // Update special ability cooldowns
    this.updateSpecialCooldowns();
    
    // Turret firing logic
    this.updateTurrets();
    
    // NEW: Ranged unit combat system
    this.updateRangedUnits();
    
    // Update debug overlay if enabled (throttled to 10 Hz)
    if (this.debugEnabled && _time - this.debugLastUpdate >= this.DEBUG_UPDATE_INTERVAL) {
      this.debugLastUpdate = _time;
      this.drawDebugOverlay();
    }
    
    // Base attack logic - Units attack bases continuously
    this.playerUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      // Skip units that are in combat with other units
      if (sprite.getData('inCombat')) return;
      
      // Player unit reached enemy base attack range - start attacking
      if (sprite.x >= ENEMY_BASE_X - BASE_ATTACK_RANGE) {
        sprite.setVelocityX(0); // Stop movement
        this.attackBase(sprite, 'enemy');
      }
    });
    
    this.enemyUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      // Skip units that are in combat with other units
      if (sprite.getData('inCombat')) return;
      
      // Enemy unit reached player base attack range - start attacking
      if (sprite.x <= PLAYER_BASE_X + BASE_ATTACK_RANGE) {
        sprite.setVelocityX(0); // Stop movement  
        this.attackBase(sprite, 'player');
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
    
    // Safety check: Ensure all non-combat units are moving
    // This catches units that got "stuck" due to race conditions
    this.playerUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      // If unit is not in combat and not at base, ensure it's moving
      if (!sprite.getData('inCombat') && sprite.x < ENEMY_BASE_X - BASE_ATTACK_RANGE) {
        const velocity = sprite.body?.velocity.x || 0;
        if (Math.abs(velocity) < 5) { // Velocity too low, unit is stuck
          const speed = sprite.getData('speed');
          sprite.setVelocityX(speed);
        }
      }
    });
    
    this.enemyUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      // If unit is not in combat and not at base, ensure it's moving
      if (!sprite.getData('inCombat') && sprite.x > PLAYER_BASE_X + BASE_ATTACK_RANGE) {
        const velocity = sprite.body?.velocity.x || 0;
        if (Math.abs(velocity) < 5) { // Velocity too low, unit is stuck
          const speed = sprite.getData('speed');
          sprite.setVelocityX(-speed);
        }
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

  /**
   * Update ranged units - handle range-based combat
   */
  private updateRangedUnits(): void {
    // Check player ranged units
    this.playerUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      if (sprite.getData('inCombat')) return; // Skip if in melee combat
      if (sprite.getData('type') !== 'ranged') return; // Only ranged units
      
      const range = sprite.getData('range') || 150;
      const target = this.findEnemyInRange(sprite.x, sprite.y, range, 'enemy');
      
      if (target) {
        // Stop and attack
        sprite.setVelocityX(0);
        this.handleRangedAttack(sprite, target);
      } else if (sprite.x < ENEMY_BASE_X - BASE_ATTACK_RANGE) {
        // No target, resume marching
        const speed = sprite.getData('speed');
        if (Math.abs(sprite.body?.velocity.x || 0) < 5) {
          sprite.setVelocityX(speed);
        }
      }
    });
    
    // Check enemy ranged units
    this.enemyUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      if (sprite.getData('inCombat')) return;
      if (sprite.getData('type') !== 'ranged') return;
      
      const range = sprite.getData('range') || 150;
      const target = this.findEnemyInRange(sprite.x, sprite.y, range, 'player');
      
      if (target) {
        sprite.setVelocityX(0);
        this.handleRangedAttack(sprite, target);
      } else if (sprite.x > PLAYER_BASE_X + BASE_ATTACK_RANGE) {
        const speed = sprite.getData('speed');
        if (Math.abs(sprite.body?.velocity.x || 0) < 5) {
          sprite.setVelocityX(-speed);
        }
      }
    });
  }

  /**
   * Find enemy unit in attack range
   */
  private findEnemyInRange(x: number, y: number, range: number, targetSide: 'player' | 'enemy'): Phaser.Physics.Arcade.Sprite | null {
    let closestTarget: Phaser.Physics.Arcade.Sprite | null = null;
    let closestDistance = Infinity;
    
    const targetGroup = targetSide === 'enemy' ? this.enemyUnits : this.playerUnits;
    
    targetGroup.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      const distance = Phaser.Math.Distance.Between(x, y, sprite.x, sprite.y);
      
      if (distance <= range && distance < closestDistance) {
        closestDistance = distance;
        closestTarget = sprite;
      }
    });
    
    return closestTarget;
  }

  /**
   * Handle ranged attack with cooldown
   */
  private handleRangedAttack(attacker: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    const now = this.time.now;
    const lastAttack = attacker.getData('lastRangedAttack') || 0;
    const attackSpeed = (attacker.getData('attackSpeed') || 2) * 1000; // Convert to ms
    
    if (now - lastAttack < attackSpeed) return;
    
    // Fire projectile
    this.fireUnitProjectile(attacker, target);
    attacker.setData('lastRangedAttack', now);
  }

  /**
   * Fire projectile from unit to target
   */
  private fireUnitProjectile(shooter: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    const projectileTexture = this.getUnitProjectileTexture(shooter);
    const projectile = this.projectiles.get(shooter.x, shooter.y, projectileTexture);
    
    if (!projectile) return;
    
    projectile.setActive(true).setVisible(true);
    projectile.setScale(0.2);
    
    // Aim at target with prediction
    const angle = Phaser.Math.Angle.Between(shooter.x, shooter.y, target.x, target.y);
    const speed = 400;
    this.physics.velocityFromRotation(angle, speed, projectile.body!.velocity);
    projectile.setRotation(angle);
    
    projectile.setData('damage', shooter.getData('damage') || 10);
    projectile.setData('owner', shooter.getData('side'));
  }

  /**
   * Get projectile texture for unit type
   */
  private getUnitProjectileTexture(unit: Phaser.Physics.Arcade.Sprite): string {
    const epoch = unit.getData('epoch') || 'stone';
    
    // Map epochs to projectile types
    const projectileMap: Record<string, string> = {
      'stone': 'rock',
      'ancient': 'arrow',
      'castle': 'arrow',
      'renaissance': 'cannonball',
      'modern': 'bullet',
      'future': 'bullet'
    };
    
    return projectileMap[epoch] || 'rock';
  }

  /**
   * Find closest target in range (simplified)
   */
  private findTargetInRange(turretX: number, turretY: number, range: number): Phaser.Physics.Arcade.Sprite | null {
    let closestTarget: Phaser.Physics.Arcade.Sprite | null = null;
    let closestDistance = Infinity;
    
    // Find closest enemy unit in range
    this.enemyUnits.children.entries.forEach((unit) => {
      const sprite = unit as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
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
    
    // Get appropriate projectile texture based on turret type
    const projectileTexture = this.getProjectileTexture(slot.turretData);
    
    // Get projectile from pool
    const projectile = this.projectiles.get(slot.x, slot.y, projectileTexture) as Phaser.Physics.Arcade.Sprite;
    
    if (projectile) {
      projectile.setActive(true).setVisible(true);
      
      // Scale projectiles appropriately
      const scale = this.getProjectileScale(projectileTexture);
      projectile.setScale(scale);
      
      projectile.setData('owner', 'player');
      projectile.setData('damage', slot.turretData.damage);
      
      // Calculate velocity toward target
      const angle = Phaser.Math.Angle.Between(slot.x, slot.y, target.x, target.y);
      const velocityX = Math.cos(angle) * slot.turretData.projectileSpeed;
      const velocityY = Math.sin(angle) * slot.turretData.projectileSpeed;
      
      projectile.setVelocity(velocityX, velocityY);
      
      console.log(`Turret fired: ${slot.turretData.name} → Target at (${Math.round(target.x)}, ${Math.round(target.y)})`);
    }
  }

  private getProjectileTexture(turretData: TurretType): string {
    // Map turret types to projectile textures
    const projectileTextures: Record<string, string> = {
      // Stone Age
      'rock-thrower': 'rock',
      'wooden-spike': 'rock',
      'basic-tower': 'rock',
      
      // Castle Age  
      'arrow-tower': 'arrow',
      'ballista': 'arrow',
      'trebuchet': 'rock',
      
      // Renaissance
      'cannon': 'cannonball',
      'musket-tower': 'bullet',
      'fortress': 'cannonball',
      
      // Modern
      'machine-gun': 'bullet',
      'anti-tank': 'bullet',
      'artillery': 'cannonball',
      
      // Future (no laser texture yet, use bullet)
      'laser-turret': 'bullet',
      'rail-gun': 'bullet', 
      'ion-cannon': 'bullet'
    };
    
    return projectileTextures[turretData.id] || 'rock';
  }

  private getProjectileScale(projectileTexture: string): number {
    // Set appropriate scales for different projectile types (minimal!)
    const projectileScales: Record<string, number> = {
      'rock': 0.2,
      'arrow': 0.25,
      'cannonball': 0.2,
      'bullet': 0.15
    };
    
    return projectileScales[projectileTexture] || 0.2;
  }

  private damageBase(side: 'player' | 'enemy', damage: number): void {
    const base = side === 'player' ? this.playerBase : this.enemyBase;
    base.hp = Math.max(0, base.hp - damage);
    
    // Update visual health bar
    this.updateBaseHealthBar(side);
    
    // Update UI
    const uiScene = this.scene.get('UIScene');
    uiScene.events.emit('updateBaseHP', base.hp, base.maxHp, side);
    
    if (base.hp <= 0) {
      console.log(`💥 ${side === 'player' ? 'Player' : 'Enemy'} base destroyed!`);
      this.handleGameOver(side);
    }
  }

  private handleGameOver(loserSide: 'player' | 'enemy'): void {
    // Stop the game
    this.scene.pause();
    
    // Show game over message
    const winnerText = loserSide === 'player' ? 'ENEMY WINS!' : 'PLAYER WINS!';
    const gameOverText = this.add.text(640, 360, winnerText, {
      fontSize: '64px',
      color: loserSide === 'player' ? '#ff0000' : '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    gameOverText.setDepth(2000); // Über allem anderen
    
    // Add restart hint
    const restartText = this.add.text(640, 420, 'Press F5 to restart', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);
    restartText.setDepth(2000);
    
    console.log(`🎮 Game Over! ${winnerText}`);
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
    // Get spawn rate based on difficulty
    const spawnRate = this.difficultyMultipliers[this.difficulty].enemySpawnRate;
    console.log(`⏱️ Enemy spawn rate: ${spawnRate}ms (${this.difficulty})`);
    
    this.time.addEvent({
      delay: spawnRate,
      callback: () => {
        const enemyUnitIndex = this.getSmartEnemyUnit();
        const unitData = this.unitsDatabase[enemyUnitIndex];
        // Use formation queue system
        this.queueUnitSpawn('enemy', unitData);
      },
      loop: true
    });
  }

  /**
   * Smart Enemy AI: Spawns varied units from current epoch
   */
  private getSmartEnemyUnit(): number {
    // Get available units for current epoch
    const currentEpoch = this.epochs[this.currentEpochIndex];
    const availableUnits = this.unitsDatabase
      .map((unit, index) => ({ unit, index }))
      .filter(({unit}) => unit.epoch === currentEpoch.id);
    
    if (availableUnits.length === 0) {
      // Fallback to random unit
      return Math.floor(Math.random() * Math.min(this.currentEpochIndex + 3, this.unitsDatabase.length));
    }
    
    // Random unit from current epoch for variety
    const chosen = availableUnits[Math.floor(Math.random() * availableUnits.length)];
    return chosen.index;
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

  // Developer Mode Methods

  /**
   * Create detailed debug text for a unit (Developer Mode)
   */
  private createUnitDebugText(unit: GameUnit): void {
    if (!unit.unitData) return;

    const debugText = this.add.text(unit.x, unit.y - 50, '', {
      fontSize: '9px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 3, y: 2 },
      align: 'left'
    }).setOrigin(0.5, 1).setDepth(5000);

    // Store reference using sprite instance as key
    this.unitDebugTexts.set(unit, debugText);
  }

  /**
   * Update all unit debug texts (called every frame if Developer Mode is on)
   */
  private updateUnitDebugTexts(): void {
    if (!this.developerMode) return;

    // Update player units
    this.playerUnits.children.entries.forEach(child => {
      const unit = child as GameUnit;
      if (!unit.active || !unit.unitData) return;
      this.updateSingleUnitDebugText(unit);
    });

    // Update enemy units
    this.enemyUnits.children.entries.forEach(child => {
      const unit = child as GameUnit;
      if (!unit.active || !unit.unitData) return;
      this.updateSingleUnitDebugText(unit);
    });

    // Clean up destroyed units: Remove debug texts for inactive sprites
    this.unitDebugTexts.forEach((text, sprite) => {
      if (!sprite.active) {
        text.destroy();
        this.unitDebugTexts.delete(sprite);
      }
    });
  }

  /**
   * Update debug text for a single unit
   */
  private updateSingleUnitDebugText(unit: GameUnit): void {
    const debugText = this.unitDebugTexts.get(unit);
    if (!debugText) return;

    const data = unit.unitData!;
    const currentHp = unit.currentHp || 0;
    const maxHp = unit.maxHp || 0;
    const damage = unit.getData('damage') || 0;
    const speed = unit.getData('speed') || 0;
    const range = unit.getData('range') || 0;
    const attackSpeed = unit.getData('attackSpeed') || 0;
    const cost = unit.getData('cost') || 0;
    const type = unit.getData('type') || 'unknown';
    const inCombat = unit.getData('inCombat') || false;
    const side = unit.side || 'unknown';
    const velocityX = Math.round(unit.body?.velocity.x || 0);
    const scale = unit.scaleX;
    const texture = unit.texture.key;

    // Build comprehensive debug info
    const lines = [
      `${data.name} (${side.toUpperCase()})`,
      `HP: ${currentHp}/${maxHp}`,
      `DMG: ${damage} | SPD: ${speed}`,
      `RNG: ${range} | ATK: ${attackSpeed}s`,
      `Type: ${type} | Cost: ${cost}g`,
      `Combat: ${inCombat ? 'YES' : 'NO'}`,
      `Vel: ${velocityX} | Scale: ${scale.toFixed(2)}`,
      `Texture: ${texture}`,
      `Epoch: ${data.epoch}`
    ];

    debugText.setText(lines.join('\n'));
    
    // Position above unit
    debugText.setPosition(unit.x, unit.y - 60);
    
    // Color code by side
    debugText.setBackgroundColor(side === 'player' ? '#003300' : '#330000');
  }
}

