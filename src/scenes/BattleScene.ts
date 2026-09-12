import { clampXPEvent } from '../utils/xpClamp.ts';
import Phaser from 'phaser';
import type { Base, Epoch, UnitType, TurretType } from '../game/types';
import epochsData from '../../data/epochs.json';
import unitsData from '../../data/units.json';
import turretsData from '../../data/turrets.json';
import { 
  calculateXPFromDamage, 
  calculateKillBonusXP, 
  canAdvanceEpoch,
  getEpochSafe,
  calculateKillGoldBounty
} from '../utils/gameHelpers';
import { gameLogger } from '../utils/logger';
import { XPFeedbackSystem } from '../utils/XPFeedbackSystem';
import { GoldFeedbackSystem } from '../utils/GoldFeedbackSystem';
import { SoundEffectsManager } from '../utils/SoundEffectsManager';
import { MusicManager } from '../utils/MusicManager';
import { BattleEffects } from '../game/BattleEffects';
import { muzzlePoint, unitTargetHeight, projectileTexture, type WeaponSockets } from '../game/projectilePresentation';
import { turretNames } from '../ui/catalog';
import { formatSeconds, loadGameSettings, saveGameSettings } from '../ui/theme';
import { consumeKeyboardEvent } from '../ui/keyboard';
import { UnitSelectionSystem } from '../utils/UnitSelectionSystem';
import { ARMY_LIMIT, BASE_HP, DIFFICULTY, FORTRESS_GUN, EPOCH_INCOME, INITIAL_PREPARE_MS, type Difficulty, WAVE_ASSAULT_MS, WAVE_RESPITE_MS, canAttack, damageAgainst, enemyEpochAt, segmentHitFraction, unitRole, FORMATION_OFFSETS, formationGap, segmentBoxHitFraction } from '../game/combatRules';
import { KillStreakManager } from '../utils/KillStreakManager';
import { planEnemyWave, type EnemyWavePlan } from '../game/enemyWaves';

// Every battlefield label uses the same face as the HUD; Phaser's default is a monospace fallback.
const UI_FONT = 'Segoe UI, Arial, sans-serif';

// Lane configuration constants
const LANE_Y = 500; // Ganz unten am Boden der Basen
const LANE_WIDTH = 1280;
const PLAYER_SPAWN_X = 150;
const ENEMY_SPAWN_X = 1130;
const PLAYER_BASE_X = 100;
const ENEMY_BASE_X = 1180;
const BASE_ATTACK_RANGE = 100; // Units start attacking base from this distance
const UNIT_CLEANUP_MARGIN = 50;

// Turret grid constants
const TURRET_GRID_START_X = 55;
const TURRET_GRID_START_Y = 521; // Lowered to sit visually on the castle architecture
const TURRET_CELL_SIZE = 90;
const TURRET_GRID_ROWS = 1;
const TURRET_GRID_COLS = 3;

// Special abilities constants
const RAINING_ROCKS_COOLDOWN = 45000; // 45 seconds
const ARTILLERY_STRIKE_COOLDOWN = 60000; // 60 seconds
const RAINING_ROCKS_DAMAGE = 30;
const RAINING_ROCKS_RADIUS = 80;
const RAINING_ROCKS_COUNT = 8;
const ARTILLERY_STRIKE_DAMAGE = 50;
const ARTILLERY_STRIKE_RADIUS = 60;
const ARTILLERY_STRIKE_COUNT = 10;

interface BaseProjectileTarget { x: number; y: number; baseSide: 'player' | 'enemy' }

interface TurretSlot {
  x: number;
  y: number;
  occupied: boolean;
  turret?: Phaser.GameObjects.Sprite;
  turretData?: TurretType;
  lastFireTime: number;
  gridVisual?: Phaser.GameObjects.Rectangle;
  level?: number;
  levelText?: Phaser.GameObjects.Text;
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
  private gameOver: boolean = false;
  private effects?: BattleEffects;
  private playerBase!: Base;
  private enemyBase!: Base;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private playerUnits!: Phaser.Physics.Arcade.Group;
  private enemyUnits!: Phaser.Physics.Arcade.Group;
  private unitsDatabase: UnitType[] = unitsData as UnitType[];
  private turretsDatabase: TurretType[] = turretsData as TurretType[];
  private turretGrid: TurretSlot[][] = [];
  
  // Economy & Progression
  private gold = 100;
  private xp = 0;
  private simulationSpeed = 1;

  private epochs: Epoch[] = epochsData as Epoch[];
  private currentEpochIndex = 0;

  // Enemy has its own epoch progression (advances on timer independently)
  private enemyEpochIndex = 0;
  private simulationTime = 0;
  private paused = false;
  private incomeAccumulator = 0;
  private waveNumber = 0;
  private wavePhase: 'prepare' | 'assault' | 'respite' = 'prepare';
  private phaseEndsAt = INITIAL_PREPARE_MS;
  private nextEnemySpawnAt = 0;
  private waveSpawned = 0;
  private waveArrived = 0;
  private wavePlan?: EnemyWavePlan;
  private lastStatusAt = -1000;
  private kills = 0;
  /** Income and bounty of the running battle; a tower refund is returned money, not earnings. */
  private goldEarned = 0;
  private uiSubscriptions: Array<{ event: string; callback: (...args: any[]) => void }> = [];

  // Feedback Systems
  private xpFeedback!: XPFeedbackSystem;
  private goldFeedback!: GoldFeedbackSystem;
  
  // Audio Systems
  private soundEffects!: SoundEffectsManager;
  private music!: MusicManager;
  
  // Unit Selection System (instantiated for side effects)
  private killStreakManager!: KillStreakManager;

  // Difficulty settings live in DIFFICULTY (combatRules).
  private difficulty: Difficulty = 'medium';

  // Special abilities
  private rainingRocksLastUsed = -RAINING_ROCKS_COOLDOWN; // Available at start
  private artilleryStrikeLastUsed = -ARTILLERY_STRIKE_COOLDOWN; // Available at start
  private fortressShotAt = 0;
  private finalWaves = 0;
  private waveSurge = 1;

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
  private baseImages!: Record<'player' | 'enemy', Phaser.GameObjects.Image>;
  private unitShadows!: Phaser.GameObjects.Graphics;

  // Recruitment queue and stable three-row ground formation
  private spawnQueue: Array<{ side: 'player' | 'enemy', unitData: UnitType, delay: number }> = [];
  private lastSpawnTime: Record<'player' | 'enemy', number> = { player: 0, enemy: 0 };
  private readonly SPAWN_QUEUE_DELAY = 250; // ms delay between queued spawns
  // Internal UID counter to deduplicate projectile hits across frames
  private unitUidCounter = 1;

  // Turret references
  private turretMenuContainer?: Phaser.GameObjects.Container;
  private turretRangeGraphics?: Phaser.GameObjects.Graphics;
  private turretDragPreview?: Phaser.GameObjects.Sprite;
  private draggedTurretData?: TurretType;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    console.log('BattleScene: Initializing battlefield...');
    
    // Reset state properties to ensure clean restarts
    this.gameOver = false;
    this.xp = 0;
    this.simulationSpeed = 1;
    this.currentEpochIndex = 0;
    this.enemyEpochIndex = 0;
    this.simulationTime = 0;
    this.paused = false;
    this.incomeAccumulator = 0;
    this.waveNumber = 0;
    this.wavePhase = 'prepare';
    this.phaseEndsAt = INITIAL_PREPARE_MS;
    this.nextEnemySpawnAt = 0;
    this.waveSpawned = 0;
    this.waveArrived = 0;
    this.wavePlan = undefined;
    this.lastStatusAt = -1000;
    this.kills = 0;
    this.goldEarned = 0;
    this.selectedTurretIndex = -1;
    this.turretGrid = [];
    this.turretMenuContainer = undefined;
    this.turretDragPreview = undefined;
    this.draggedTurretData = undefined;
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.physics.world.timeScale = 1;
    this.physics.resume();
    this.rainingRocksLastUsed = -RAINING_ROCKS_COOLDOWN;
    this.artilleryStrikeLastUsed = -ARTILLERY_STRIKE_COOLDOWN;
    this.fortressShotAt = 0;
    this.finalWaves = 0;
    this.waveSurge = 1;
    this.debugEnabled = false;
    this.spawnQueue = [];
    this.lastSpawnTime = { player: 0, enemy: 0 };
    this.unitUidCounter = 1;
    this.unitDebugTexts.clear();
    
    // Load difficulty from registry
    const requestedDifficulty = this.registry.get('difficulty');
    this.difficulty = ['easy', 'medium', 'hard'].includes(requestedDifficulty) ? requestedDifficulty : 'medium';
    console.log(`🎮 Difficulty: ${this.difficulty.toUpperCase()}`);
    
    // Apply difficulty-based starting gold
    this.gold = DIFFICULTY[this.difficulty].startingGold;
    this.wavePlan = this.makeWavePlan(1, INITIAL_PREPARE_MS);
    
    // Initialize feedback systems
    this.xpFeedback = new XPFeedbackSystem(this);
    this.goldFeedback = new GoldFeedbackSystem(this);
    
    // Initialize audio systems
    this.soundEffects = new SoundEffectsManager(this);
    this.music = new MusicManager(this);
    
    // Initialize unit selection system (no persistent reference needed)
    new UnitSelectionSystem(this);
    
    // Initialize combat feedback systems
    this.killStreakManager = new KillStreakManager(this);
    
    this.createBackground(); // Hintergrund zuerst erstellen
    this.createLane();     // Zuerst den Weg erstellen
    this.createBases();    // Dann die Basen darüber
    this.createTurretGrid();
    this.turretRangeGraphics = this.add.graphics();
    this.turretRangeGraphics.setDepth(1450);
    this.setupPools();
    this.effects = new BattleEffects(this);
    this.setupColliders();
    this.listenToUIEvents();
    this.syncInitialStateToUI();
    this.setupDebugControls();
    
    // Ensure the UI scene is rendered on top of the battle scene
    this.scene.bringToTop('UIScene');
    
    // Start battle music for current epoch
    this.music.playBattleMusic(this.currentEpochIndex + 1);
    
    // Share the same session fallback as the settings screen.
    this.developerMode = loadGameSettings(this).developerMode;
    console.log(`🔧 Developer Mode: ${this.developerMode ? 'ENABLED' : 'DISABLED'}`);
    
    // Initialize debug graphics
    this.debugGfx = this.add.graphics().setDepth(9999);
    this.input.keyboard!.on('keydown-F2', (event: KeyboardEvent) => {
      if (!consumeKeyboardEvent(event)) return;
      this.debugEnabled = !this.debugEnabled;
      console.log(`Debug overlay: ${this.debugEnabled ? 'ENABLED' : 'DISABLED'}`);
      if (!this.debugEnabled) this.debugGfx.clear();
    });
    
    // F3 toggles Developer Mode
    this.input.keyboard!.on('keydown-F3', (event: KeyboardEvent) => {
      if (!consumeKeyboardEvent(event)) return;
      this.developerMode = !this.developerMode;
      saveGameSettings(this, { ...loadGameSettings(this), developerMode: this.developerMode });
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
    
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownBattle, this);
  }

  private syncInitialStateToUI(): void {
    // UIScene might not be ready in the very first tick if scenes were launched
    // dynamically. Retry briefly until available to avoid runtime errors.
    let uiScene: Phaser.Scene | undefined;
    try { uiScene = this.scene.get('UIScene'); } catch { /* not ready yet */ }
    if (!uiScene) {
      this.time.delayedCall(16, () => this.syncInitialStateToUI());
      return;
    }
    uiScene.events.emit('updateGold', this.gold);
    uiScene.events.emit('updateXP', this.xp, this.getCurrentEpoch().xpToNext);
    uiScene.events.emit('updateEpoch', this.getCurrentEpoch());
    uiScene.events.emit('updateBaseHP', this.playerBase.hp, this.playerBase.maxHp, 'player');
    uiScene.events.emit('updateBaseHP', this.enemyBase.hp, this.enemyBase.maxHp, 'enemy');
    uiScene.events.emit('updateSimulationSpeed', this.simulationSpeed);
    uiScene.events.emit('updatePaused', this.paused);
    uiScene.events.emit('updateEpochReady', canAdvanceEpoch(this.xp, this.getCurrentEpoch()));
    this.emitBattleStatus();
    
    // Create kill streak UI element (top-center)
    this.add.text(640, 30, '', {
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

  private getBaseMaxHP(epochIndex: number, side: 'player' | 'enemy' = 'player'): number {
    const hp = BASE_HP[Math.max(0, Math.min(epochIndex, BASE_HP.length - 1))];
    return side === 'enemy' ? Math.round(hp * DIFFICULTY[this.difficulty].enemyFortress) : hp;
  }

  private createBackground(): void {
    this.backgroundImage = this.add.image(640, 360, this.getBackgroundKey()).setDisplaySize(1280, 720).setDepth(-100);
    this.add.image(640, 360, 'battle-vignette').setDepth(-90);
    this.unitShadows = this.add.graphics().setDepth(1);
  }

  private getBackgroundKey(): string {
    const epoch = this.getCurrentEpoch();
    const epochId = epoch.id;
    
    const backgroundMap: Record<string, string> = {
      'stone': 'stone-age-bg',
      'castle': 'castle-age-bg',
      'renaissance': 'renaissance-bg',
      'modern': 'modern-bg',
      'future': 'future-bg'
    };
    
    return backgroundMap[epochId] || 'stone-age-bg';
  }

  private updateBackground(): void {
    const key = this.getBackgroundKey();
    if (this.backgroundImage.texture.key === key) return;
    const old = this.add.image(640, 360, this.backgroundImage.texture.key).setDisplaySize(1280, 720).setDepth(-99);
    this.backgroundImage.setTexture(key).setDisplaySize(1280, 720);
    this.tweens.add({ targets: old, alpha: 0, duration: this.registry.get('settings')?.reducedMotion ? 0 : 1200, onComplete: () => old.destroy() });
    this.updateBaseHealthBar('player');
  }

  private createBases(): void {
    const playerHP = this.getBaseMaxHP(this.currentEpochIndex, 'player');
    const enemyHP = this.getBaseMaxHP(this.enemyEpochIndex, 'enemy');
    this.playerBase = { hp: playerHP, maxHp: playerHP, x: PLAYER_BASE_X, y: LANE_Y, side: 'player' };
    this.enemyBase = { hp: enemyHP, maxHp: enemyHP, x: ENEMY_BASE_X, y: LANE_Y, side: 'enemy' };
    const make = (x: number, enemy: boolean) => {
      this.add.ellipse(x, LANE_Y + 2, 184, 20, 0x0b1720, 0.27).setDepth(-3);
      const image = this.add.image(x, LANE_Y + 2, enemy ? 'base-stone-enemy' : 'base-stone').setOrigin(0.5, 0.92).setDisplaySize(236, 236).setDepth(0);
      if (enemy) image.setFlipX(true);
      const bannerX = x + (enemy ? -62 : 62);
      this.add.rectangle(bannerX, LANE_Y - 97, 2, 102, 0x62574b).setDepth(2);
      this.add.triangle(bannerX + (enemy ? -12 : 12), LANE_Y - 137, 0, 0, 24, 8, 0, 23, enemy ? 0xba796c : 0x6caea6).setScale(enemy ? -1 : 1, 1).setDepth(2);
      return image;
    };
    this.baseImages = { player: make(PLAYER_BASE_X, false), enemy: make(ENEMY_BASE_X, true) };
  }

  private createLane(): void {
    // Lane ist jetzt transparent - die visuelle Lane kommt vom Hintergrundbild
    // Keine visuellen Elemente mehr, nur Kollisionserkennung wenn nötig
  }

  private createHealthBar(unit: Phaser.Physics.Arcade.Sprite): UnitHealthBar {
    const background = this.add.rectangle(-18, 0, 36, 3, 0x17242a, 0.85).setOrigin(0, 0.5);
    const fill = this.add.rectangle(-18, 0, 36, 3, unit.getData('side') === 'player' ? 0x88bdb1 : 0xd89081).setOrigin(0, 0.5);
    const container = this.add.container(unit.x, unit.y - unit.displayHeight * 0.72, [background, fill]).setDepth(1450);
    return { background, fill, container };
  }



  private updateBaseHealthBar(side: 'player' | 'enemy'): void {
    const base = side === 'player' ? this.playerBase : this.enemyBase;
    const epoch = side === 'player' ? this.currentEpochIndex : this.enemyEpochIndex;
    this.baseImages?.[side]?.setTexture(`base-${this.epochs[epoch].id}${side === 'enemy' ? '-enemy' : ''}`).setDisplaySize(236, 236);
    this.scene.get('UIScene').events.emit('updateBaseHP', base.hp, base.maxHp, side);
  }

  private updateHealthBar(unit: GameUnit): void {
    if (!unit.healthBar || !unit.maxHp) return;
    const hp = Math.max(0, unit.currentHp ?? 0);
    unit.healthBar.container.setPosition(unit.x, unit.y - unit.displayHeight * 0.72).setVisible(unit.active && hp > 0);
    unit.healthBar.fill.width = 36 * Phaser.Math.Clamp(hp / unit.maxHp, 0, 1);
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
    // Initialize turret grid slots with visual highlights
    for (let row = 0; row < TURRET_GRID_ROWS; row++) {
      this.turretGrid[row] = [];
      for (let col = 0; col < TURRET_GRID_COLS; col++) {
        const x = TURRET_GRID_START_X + col * TURRET_CELL_SIZE;
        const y = TURRET_GRID_START_Y + row * TURRET_CELL_SIZE;
        this.add.ellipse(x, y, 72, 16, 0x292f28, 0.28).setStrokeStyle(1, 0xc4b88f, 0.5).setDepth(3);
        this.add.text(x, y + 13, `BAUPLATZ ${col + 1}`, { fontFamily: UI_FONT, fontSize: '9px', color: '#ddd2b4' })
          .setOrigin(0.5).setAlpha(0.9).setDepth(3);
        
        // Create visual grid slot highlight (hidden by default)
        const gridVisual = this.add.rectangle(x, y, TURRET_CELL_SIZE - 4, TURRET_CELL_SIZE - 4);
        gridVisual.setStrokeStyle(2, 0x7dbbae, 0.8);
        gridVisual.setFillStyle(0x7dbbae, 0.15);
        gridVisual.setDepth(1500);
        gridVisual.setVisible(false);
        
        // Create interactive zone for placement
        const zone = this.add.zone(x, y, TURRET_CELL_SIZE, TURRET_CELL_SIZE).setInteractive();
        zone.setData('row', row);
        zone.setData('col', col);
        
        zone.on('pointerdown', () => {
          this.onTurretSlotClick(row, col);
        });
        
        zone.on('pointerover', () => {
          this.onTurretSlotHover(row, col);
        });
        
        zone.on('pointerout', () => {
          this.onTurretSlotHoverOut(row, col);
        });
        
        // Initialize slot data
        this.turretGrid[row][col] = {
          x,
          y,
          occupied: false,
          lastFireTime: 0,
          gridVisual
        };
      }
    }
  }

  private showTurretGrid(): void {
    this.updateGridVisuals(-1, -1);
    for (let row = 0; row < TURRET_GRID_ROWS; row++) {
      for (let col = 0; col < TURRET_GRID_COLS; col++) {
        const slot = this.turretGrid[row][col];
        if (slot.gridVisual) {
          slot.gridVisual.setVisible(true);
        }
      }
    }
  }

  private hideTurretGrid(): void {
    for (let row = 0; row < TURRET_GRID_ROWS; row++) {
      for (let col = 0; col < TURRET_GRID_COLS; col++) {
        const slot = this.turretGrid[row][col];
        if (slot.gridVisual) {
          slot.gridVisual.setVisible(false);
        }
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
    const ui = this.scene.get('UIScene');
    const on = (event: string, callback: (...args: any[]) => void) => {
      ui.events.on(event, callback);
      this.uiSubscriptions.push({ event, callback });
    };
    const active = () => !this.gameOver && !this.paused;
    on('spawnUnit', (unitId: string) => {
      const data = this.unitsDatabase.find(unit => unit.id === unitId && unit.epoch === this.getCurrentEpoch().id);
      if (active() && data) this.spawnUnitByData('player', data);
    });
    on('selectTurret', (index: number) => { if (active()) this.selectTurretType(index); });
    on('closeTurretMenu', () => this.closeTurretMenu());
    on('useRainingRocks', () => { if (active()) this.useRainingRocks(); });
    on('useArtilleryStrike', () => { if (active()) this.useArtilleryStrike(); });
    on('startTurretDrag', (index: number) => { if (active()) this.onStartTurretDrag(index); });
    on('dragTurretMove', (x: number, y: number) => { if (active()) this.onDragTurretMove(x, y); });
    on('endTurretDrag', (x: number, y: number) => { if (active()) this.onEndTurretDrag(x, y); });
    on('advanceEpoch', () => { if (active()) this.advanceEpoch(); });
    on('setSimulationSpeed', (speed: number) => this.setSimulationSpeed(speed));
    on('togglePause', () => this.setPaused(!this.paused));
  }

  private shutdownBattle(): void {
    const ui = this.scene.get('UIScene');
    this.uiSubscriptions.forEach(({ event, callback }) => ui.events.off(event, callback));
    this.uiSubscriptions = [];
    this.music?.stop();
    this.effects?.destroy();
    this.effects = undefined;
    this.soundEffects?.stopAll();
    this.killStreakManager?.reset();
    this.unitDebugTexts.clear();
    this.spawnQueue = [];
  }

  private setPaused(paused: boolean): void {
    if (this.gameOver) return;
    this.paused = paused;
    // Nothing stays open behind the pause screen and reappears on resume.
    if (paused) this.closeTurretMenu();
    this.time.timeScale = paused ? 0 : this.simulationSpeed;
    this.tweens.timeScale = paused ? 0 : this.simulationSpeed;
    if (paused) this.physics.pause(); else this.physics.resume();
    this.scene.get('UIScene').events.emit('updatePaused', paused);
  }

  private selectedTurretIndex: number = -1;

  private selectTurretType(index: number): void {
    if (index >= 0 && this.turretsDatabase[index]?.epoch !== this.getCurrentEpoch().id) return;
    this.closeTurretMenu();
    this.selectedTurretIndex = index;
    if (index >= 0) {
      console.log(`Selected turret type: ${this.turretsDatabase[index]?.name || 'Unknown'}`);
      this.showTurretGrid();
    } else {
      this.hideTurretGrid();
    }
  }

  private onStartTurretDrag(index: number): void {
    this.closeTurretMenu();

    this.draggedTurretData = this.turretsDatabase[index];
    if (!this.draggedTurretData || this.draggedTurretData.epoch !== this.getCurrentEpoch().id) {
      this.draggedTurretData = undefined;
      return;
    }

    const texture = this.getTurretTexture(this.draggedTurretData);
    this.turretDragPreview = this.add.sprite(0, 0, texture);
    this.turretDragPreview.setDisplaySize(88, 88).setOrigin(0.5, 0.92);
    this.turretDragPreview.setAlpha(0.6);
    this.turretDragPreview.setDepth(2100);

    this.showTurretGrid();
  }

  private onDragTurretMove(x: number, y: number): void {
    if (!this.draggedTurretData) return;

    if (this.turretDragPreview) {
      this.turretDragPreview.setPosition(x, y);
    }

    const slotInfo = this.getSlotAtPosition(x, y);
    const isValid = slotInfo !== null && !slotInfo.occupied;

    if (this.turretRangeGraphics) {
      this.turretRangeGraphics.clear();
      const color = isValid ? 0x7dbbae : 0xff0000;
      this.turretRangeGraphics.lineStyle(2, color, 0.8);
      this.turretRangeGraphics.fillStyle(color, 0.15);
      this.turretRangeGraphics.strokeCircle(x, y, this.draggedTurretData.range);
      this.turretRangeGraphics.fillCircle(x, y, this.draggedTurretData.range);
    }

    if (slotInfo) {
      this.updateGridVisuals(slotInfo.row, slotInfo.col);
    } else {
      this.updateGridVisuals(-1, -1);
    }
  }

  private onEndTurretDrag(x: number, y: number): void {
    if (!this.draggedTurretData) return;

    const slotInfo = this.getSlotAtPosition(x, y);
    if (slotInfo && !slotInfo.occupied) {
      if (this.gold >= this.draggedTurretData.goldCost) {
        this.placeTurret(slotInfo.row, slotInfo.col, this.draggedTurretData);
        this.addGold(-this.draggedTurretData.goldCost);
      } else {
        const missing = Math.ceil(this.draggedTurretData.goldCost - this.gold);
        this.scene.get('UIScene')?.events.emit('turretPlacementFailed',
          `Für ${turretNames[this.draggedTurretData.id] || this.draggedTurretData.name} fehlen ${missing} Gold.`);
      }
    }

    if (this.turretDragPreview) {
      this.turretDragPreview.destroy();
      this.turretDragPreview = undefined;
    }
    if (this.turretRangeGraphics) {
      this.turretRangeGraphics.clear();
    }
    this.draggedTurretData = undefined;
    this.hideTurretGrid();
  }

  private getSlotAtPosition(x: number, y: number): { row: number; col: number; occupied: boolean } | null {
    for (let row = 0; row < TURRET_GRID_ROWS; row++) {
      for (let col = 0; col < TURRET_GRID_COLS; col++) {
        const slot = this.turretGrid[row][col];
        const dist = Phaser.Math.Distance.Between(x, y, slot.x, slot.y);
        if (dist <= TURRET_CELL_SIZE / 2) {
          return { row, col, occupied: slot.occupied };
        }
      }
    }
    return null;
  }

  private updateGridVisuals(hoverRow: number = -1, hoverCol: number = -1): void {
    for (let row = 0; row < TURRET_GRID_ROWS; row++) {
      for (let col = 0; col < TURRET_GRID_COLS; col++) {
        const slot = this.turretGrid[row][col];
        if (slot.gridVisual) {
          if (row === hoverRow && col === hoverCol) {
            if (slot.occupied) {
              slot.gridVisual.setStrokeStyle(4, 0xff0000, 1.0);
              slot.gridVisual.setFillStyle(0xff0000, 0.3);
            } else {
              slot.gridVisual.setStrokeStyle(4, 0xd8b574, 1.0);
              slot.gridVisual.setFillStyle(0xd8b574, 0.3);
            }
          } else {
            if (slot.occupied) {
              slot.gridVisual.setStrokeStyle(2, 0xff0000, 0.8);
              slot.gridVisual.setFillStyle(0xff0000, 0.15);
            } else {
              slot.gridVisual.setStrokeStyle(2, 0x7dbbae, 0.8);
              slot.gridVisual.setFillStyle(0x7dbbae, 0.15);
            }
          }
        }
      }
    }
  }

  private onTurretSlotHover(row: number, col: number): void {
    if (this.gameOver || this.paused) return;
    const slot = this.turretGrid[row][col];
    this.updateGridVisuals(row, col);

    let range = 0;
    let color = 0x7dbbae;

    if (this.selectedTurretIndex >= 0) {
      const selectedTurret = this.turretsDatabase[this.selectedTurretIndex];
      if (selectedTurret) {
        range = selectedTurret.range;
        color = slot.occupied ? 0xff0000 : 0x7dbbae;
      }
    } else if (slot.occupied && slot.turretData) {
      range = this.getTurretRange(slot);
      color = 0xffff00;
    }

    if (range > 0 && this.turretRangeGraphics) {
      this.turretRangeGraphics.clear();
      this.turretRangeGraphics.lineStyle(2, color, 0.8);
      this.turretRangeGraphics.fillStyle(color, 0.15);
      this.turretRangeGraphics.strokeCircle(slot.x, slot.y, range);
      this.turretRangeGraphics.fillCircle(slot.x, slot.y, range);
    }
  }

  private onTurretSlotHoverOut(_row: number, _col: number): void {
    if (this.gameOver) return;
    this.updateGridVisuals(-1, -1);
    if (this.turretRangeGraphics) {
      this.turretRangeGraphics.clear();
    }
  }

  private onTurretSlotClick(row: number, col: number): void {
    if (this.gameOver || this.paused) return;
    const slot = this.turretGrid[row][col];

    if (this.selectedTurretIndex >= 0) {
      this.closeTurretMenu();
      if (slot.occupied) {
        console.log('Slot already occupied');
        return;
      }

      const turretData = this.turretsDatabase[this.selectedTurretIndex];
      if (!turretData) return;

      if (this.gold < turretData.goldCost) {
        const missing = Math.ceil(turretData.goldCost - this.gold);
        this.scene.get('UIScene')?.events.emit('turretPlacementFailed',
          `Für ${turretNames[turretData.id] || turretData.name} fehlen ${missing} Gold.`);
        return;
      }

      this.placeTurret(row, col, turretData);
      this.addGold(-turretData.goldCost);
      this.selectedTurretIndex = -1;

      const uiScene = this.scene.get('UIScene');
      uiScene.events.emit('selectTurret', -1);
      this.hideTurretGrid();
    } else {
      if (slot.occupied) {
        this.showTurretMenu(slot, row, col);
      } else {
        this.closeTurretMenu();
      }
    }
  }

  private placeTurret(row: number, col: number, turretData: TurretType): void {
    const slot = this.turretGrid[row][col];
    const turretTexture = this.getTurretTexture(turretData);
    const turret = this.add.sprite(slot.x, slot.y, turretTexture);
    turret.setDisplaySize(88, 88).setOrigin(0.5, 0.92);
    turret.setDepth(1400);
    turret.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.onTurretSlotClick(row, col));
    
    slot.occupied = true;
    slot.turret = turret;
    slot.turretData = turretData;
    slot.lastFireTime = this.simulationTime;
    slot.level = 1;
    
    if (slot.levelText) {
      slot.levelText.destroy();
      slot.levelText = undefined;
    }
    
    // Replace the standing "choose a building site" instruction with the result of the order.
    this.scene.get('UIScene')?.events.emit('feedback', `${turretNames[turretData.id] || turretData.name} gebaut.`);
    console.log(`Placed ${turretData.name} at (${row}, ${col}) - Range: ${turretData.range}`);
  }

  private showTurretMenu(slot: TurretSlot, row: number, col: number): void {
    this.closeTurretMenu();

    if (!slot.turretData) return;

    const turretData = slot.turretData;
    const lvl = slot.level || 1;

    const upgradeLvl2Cost = Math.round(turretData.goldCost * 0.6);
    const upgradeLvl3Cost = Math.round(turretData.goldCost * 0.8);
    let totalInvested = turretData.goldCost;
    if (lvl >= 2) totalInvested += upgradeLvl2Cost;
    if (lvl >= 3) totalInvested += upgradeLvl3Cost;
    const sellRefund = Math.round(totalInvested * 0.7);

    const upgradeCost = lvl === 1 ? upgradeLvl2Cost : (lvl === 2 ? upgradeLvl3Cost : 0);

    const menuWidth = 300;
    const menuHeight = 152;
    const menuX = Phaser.Math.Clamp(slot.x, menuWidth / 2 + 12, 1280 - menuWidth / 2 - 12);
    const menuY = Math.max(menuHeight / 2 + 90, slot.y - 128);

    this.turretMenuContainer = this.add.container(menuX, menuY);
    this.turretMenuContainer.setDepth(3000);

    // The panel swallows its own clicks so only a click outside dismisses it.
    const bg = this.add.rectangle(0, 0, menuWidth, menuHeight, 0x101f2a, 0.96).setInteractive();
    bg.setStrokeStyle(2, 0xc9a66a, 1.0);
    this.turretMenuContainer.add(bg);

    const title = this.add.text(0, -menuHeight / 2 + 22, `${turretNames[turretData.id] || turretData.name}  ·  Stufe ${lvl}`, {
      fontFamily: UI_FONT,
      fontSize: '15px',
      color: '#e6c58b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.turretMenuContainer.add(title);

    const currentDmg = this.getTurretDamage(slot);
    const currentRange = this.getTurretRange(slot);
    const currentSpeed = this.getTurretAttackSpeed(slot);

    let statsStr = `${currentDmg} Schaden  ·  ${currentRange} Reichweite  ·  alle ${formatSeconds(currentSpeed)} s`;
    if (lvl < 3) {
      const nextLvlSlot = { ...slot, level: lvl + 1 };
      const nextDmg = this.getTurretDamage(nextLvlSlot);
      const nextRange = this.getTurretRange(nextLvlSlot);
      const nextSpeed = this.getTurretAttackSpeed(nextLvlSlot);
      statsStr += `\nNächste Stufe: +${nextDmg - currentDmg} Schaden · +${nextRange - currentRange} Reichweite`
        + `\n${formatSeconds(currentSpeed - nextSpeed)} s schnellerer Takt`;
    } else {
      statsStr += '\nHöchste Stufe erreicht';
    }

    // The upgrade line is long: wrap it inside the panel instead of letting it run off the screen.
    const statsText = this.add.text(0, -6, statsStr, {
      fontFamily: UI_FONT,
      fontSize: '11px',
      color: '#c3d0cf',
      align: 'center',
      lineSpacing: 5,
      wordWrap: { width: menuWidth - 34 }
    }).setOrigin(0.5);
    this.turretMenuContainer.add(statsText);

    const btnY = menuHeight / 2 - 26;

    const upgradeBtn = this.add.rectangle(-73, btnY, 132, 30, 0x222222).setName('turret-upgrade');
    upgradeBtn.setStrokeStyle(1.5, 0x86bcb0, 0.8);
    const upgradeText = this.add.text(-73, btnY, lvl < 3 ? `Ausbau  ·  ${upgradeCost} Gold` : 'Höchste Stufe', {
      fontFamily: UI_FONT,
      fontSize: '11px',
      color: lvl < 3 ? '#92c9b7' : '#7f8c8a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    if (lvl < 3) {
      const refreshUpgrade = () => {
        const affordable = this.gold >= upgradeCost;
        upgradeBtn.setFillStyle(affordable ? 0x35564e : 0x222222, 0.4)
          .setStrokeStyle(1.5, affordable ? 0x86bcb0 : 0x555555, affordable ? 0.8 : 0.5);
        upgradeText.setColor(affordable ? '#92c9b7' : '#6f7e7c');
        if (affordable) upgradeBtn.setInteractive({ useHandCursor: true });
        else upgradeBtn.disableInteractive();
      };
      // Income and spending must update an already open menu immediately.
      const uiEvents = this.scene.get('UIScene').events;
      uiEvents.on('updateGold', refreshUpgrade);
      this.turretMenuContainer.once('destroy', () => uiEvents.off('updateGold', refreshUpgrade));
      refreshUpgrade();
      upgradeBtn.on('pointerover', () => { if (this.gold >= upgradeCost) upgradeBtn.setFillStyle(0x86bcb0, 0.6); });
      upgradeBtn.on('pointerout', refreshUpgrade);
      upgradeBtn.on('pointerdown', () => this.upgradeTurret(slot, row, col, upgradeCost));
    } else {
      upgradeBtn.setStrokeStyle(1.5, 0x555555, 0.5);
      upgradeText.setColor('#666666');
    }
    this.turretMenuContainer.add([upgradeBtn, upgradeText]);

    const sellBtn = this.add.rectangle(73, btnY, 132, 30, 0x222222).setName('turret-sell');
    sellBtn.setStrokeStyle(1.5, 0xd39383, 0.8);
    sellBtn.setFillStyle(0x623e37, 0.4);
    sellBtn.setInteractive({ useHandCursor: true });
    sellBtn.on('pointerover', () => { sellBtn.setFillStyle(0xd39383, 0.6); });
    sellBtn.on('pointerout', () => { sellBtn.setFillStyle(0x623e37, 0.4); });
    sellBtn.on('pointerdown', () => {
      this.sellTurret(slot, row, col, sellRefund);
    });

    const sellText = this.add.text(73, btnY, `Verkauf  ·  ${sellRefund} Gold`, {
      fontFamily: UI_FONT,
      fontSize: '11px',
      color: '#e0afa1',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.turretMenuContainer.add([sellBtn, sellText]);

    const closeBtn = this.add.text(menuWidth / 2 - 16, -menuHeight / 2 + 16, '✕', {
      fontFamily: UI_FONT,
      fontSize: '15px',
      color: '#9fb0af',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setName('turret-close');
    closeBtn.on('pointerover', () => closeBtn.setColor('#f1ebde'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#9fb0af'));
    closeBtn.on('pointerdown', () => this.closeTurretMenu());
    this.turretMenuContainer.add(closeBtn);

    if (this.turretRangeGraphics) {
      this.turretRangeGraphics.clear();
      this.turretRangeGraphics.lineStyle(2, 0xffff00, 0.8);
      this.turretRangeGraphics.fillStyle(0xffff00, 0.12);
      this.turretRangeGraphics.strokeCircle(slot.x, slot.y, currentRange);
      this.turretRangeGraphics.fillCircle(slot.x, slot.y, currentRange);
    }
    this.updateGridVisuals(row, col);
    this.dismissTurretMenuOnOutsideClick(slot);
    this.scene.get('UIScene')?.events.emit('turretMenuOpen', true);
  }

  /** A click that lands neither in the panel nor on its tower closes the menu, like any popover. */
  private dismissTurretMenuOnOutsideClick(slot: TurretSlot): void {
    const openedFrame = this.game.loop.frame;
    const dismiss = (_pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      const menu = this.turretMenuContainer;
      // The click that opened this menu is still being delivered in the very same frame.
      if (!menu || this.game.loop.frame === openedFrame) return;
      if (over.some(object => object === slot.turret || menu.list.includes(object))) return;
      this.closeTurretMenu();
    };
    this.input.on('pointerdown', dismiss);
    this.turretMenuContainer?.once('destroy', () => this.input.off('pointerdown', dismiss));
  }

  private upgradeTurret(slot: TurretSlot, _row: number, _col: number, cost: number): void {
    if (this.gameOver) return;
    if (!slot.occupied || !slot.turretData) return;

    if (this.paused || (slot.level || 1) >= 3 || this.gold < cost || cost <= 0) return;
    this.addGold(-cost);
    slot.level = (slot.level || 1) + 1;

    if (!slot.levelText) {
      slot.levelText = this.add.text(slot.x, slot.y - 25, `Stufe ${slot.level}`, {
        fontFamily: UI_FONT,
        fontSize: '11px',
        color: '#e6c58b',
        fontStyle: 'bold',
        stroke: '#0a151c',
        strokeThickness: 3
      }).setOrigin(0.5);
      slot.levelText.setDepth(1600);
    } else {
      slot.levelText.setText(`Stufe ${slot.level}`);
    }

    this.soundEffects.playXPGain();
    this.showFloatingFeedback(slot.x, slot.y - 40, `Stufe ${slot.level}`, '#92c9b7');
    this.closeTurretMenu();
  }

  private sellTurret(slot: TurretSlot, _row: number, _col: number, refund: number): void {
    if (this.gameOver) return;
    if (!slot.occupied) return;

    this.addGold(refund, undefined, undefined, false);

    if (slot.turret) {
      slot.turret.destroy();
      slot.turret = undefined;
    }
    if (slot.levelText) {
      slot.levelText.destroy();
      slot.levelText = undefined;
    }

    this.showFloatingFeedback(slot.x, slot.y - 20, `+${refund} Gold`, '#e6c58b');
    this.soundEffects.playGoldCollect();

    slot.occupied = false;
    slot.turretData = undefined;
    slot.level = undefined;

    this.closeTurretMenu();
  }

  private closeTurretMenu(): void {
    if (this.turretMenuContainer) {
      this.turretMenuContainer.destroy();
      this.turretMenuContainer = undefined;
    }
    this.scene.get('UIScene')?.events.emit('turretMenuOpen', false);
    if (this.turretRangeGraphics) {
      this.turretRangeGraphics.clear();
    }
    this.updateGridVisuals(-1, -1);
  }

  private showFloatingFeedback(x: number, y: number, text: string, color: string = '#ffd700'): void {
    const fbText = this.add.text(x, y, text, {
      fontFamily: UI_FONT,
      fontSize: '15px',
      fontStyle: 'bold',
      color: color,
      stroke: '#0a151c',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(3000);
    
    this.tweens.add({
      targets: fbText,
      y: y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => fbText.destroy()
    });
  }

  private getTurretDamage(slot: TurretSlot): number {
    if (!slot.turretData) return 0;
    const lvl = slot.level || 1;
    return Math.round(slot.turretData.damage * (1 + (lvl - 1) * 0.4));
  }

  private getTurretRange(slot: TurretSlot): number {
    if (!slot.turretData) return 0;
    const lvl = slot.level || 1;
    return Math.round(slot.turretData.range * (1 + (lvl - 1) * 0.15));
  }

  private getTurretAttackSpeed(slot: TurretSlot): number {
    if (!slot.turretData) return 0;
    const lvl = slot.level || 1;
    return slot.turretData.attackSpeed * Math.pow(0.85, lvl - 1);
  }

  private getTurretTexture(turretData: TurretType): string {
    const turretTextures: Record<string, string> = {
      'rock-thrower': 'stone-tower-1',
      'wooden-spike': 'stone-tower-2', 
      'basic-tower': 'stone-tower-3',
      'arrow-tower': 'castle-tower-1',
      'ballista': 'castle-tower-2',
      'trebuchet': 'castle-tower-3',
      'cannon': 'renaissance-tower-1',
      'musket-tower': 'renaissance-tower-2',
      'fortress': 'renaissance-tower-3',
      'machine-gun': 'modern-tower-1',
      'anti-tank': 'modern-tower-2',
      'artillery': 'modern-tower-3',
      'laser-turret': 'future-tower-1',
      'rail-gun': 'future-tower-2',
      'ion-cannon': 'future-tower-3'
    };
    
    return turretTextures[turretData.id] || 'stone-tower-1';
  }

  private getUnitTexture(unitData: UnitType, side: 'player' | 'enemy' = 'player'): string { return `${unitData.id}${side === 'enemy' ? '-enemy' : ''}`; }

  private getUnitScale(unitData: UnitType): number {
    if (['super-heavy', 'mech'].includes(unitData.id)) return 0.57;
    if (['dino-rider', 'knight', 'cavalry', 'tank', 'ballista', 'cannon'].includes(unitData.id)) return 0.51;
    return 0.43;
  }

  private spawnUnitByData(side: 'player' | 'enemy', unitData: UnitType): boolean {
    if (this.gameOver || this.paused) return false;
    const unitGroup = side === 'player' ? this.playerUnits : this.enemyUnits;
    if (unitGroup.countActive(true) >= ARMY_LIMIT) {
      if (side === 'player') this.scene.get('UIScene').events.emit('commandFailed', `Armee voll (${ARMY_LIMIT})`);
      return false;
    }
    if (side === 'player' && unitData.epoch !== this.getCurrentEpoch().id) return false;
    // Enemy units carry the difficulty multiplier and the late wave strength
    const statMultiplier = side === 'enemy' ? DIFFICULTY[this.difficulty].enemyStats * this.waveSurge : 1.0;
    
    // Check cost for player units
    if (side === 'player') {
      if (this.gold < unitData.goldCost) {
        this.scene.get('UIScene').events.emit('commandFailed', `Benötigt ${unitData.goldCost} Gold`);
        return false;
      }

    }
    
    const spawn = this.findFormationSpawn(side, unitData.id);
    if (!spawn) {
      if (side === 'player') this.scene.get('UIScene').events.emit('commandFailed', 'Ausgang belegt: warte einen Moment.');
      return false;
    }
    const texture = this.getUnitTexture(unitData, side);
    const { x: spawnX, y: spawnY, row } = spawn;

    // Get unit from appropriate collision group
    const unit = unitGroup.get(spawnX, spawnY, texture) as Phaser.Physics.Arcade.Sprite;

    if (unit) {
      if (side === 'player') this.addGold(-unitData.goldCost);
      this.tweens.killTweensOf(unit);
      unit.setPosition(spawnX, spawnY).setAlpha(1).setRotation(0);
      unit.setVelocity(0, 0);
      unit.setAcceleration(0, 0);
      unit.setData('unitId', unitData.id);
      unit.setData('formationRow', row);
      unit.setData('formationBlocked', false);
      unit.setData('lastAttackTime', -Infinity);
      unit.setData('lastRangedAttack', -Infinity);
      // Reset any pooled state that may persist from a previous life
      unit.clearTint();
      if (unit.body) {
        const body = unit.body as Phaser.Physics.Arcade.Body;
        body.enable = true;
        body.immovable = false;
      }
      // CRITICAL FIX: Explicitly set texture on pooled sprite to prevent old textures from persisting
      unit.setTexture(texture);
      // Initialize unit with data from JSON
      unit.setActive(true).setVisible(true);
      // Movement tracking for stuck detection
      unit.setData('lastMoveX', unit.x);
      unit.setData('lastMoveTime', this.simulationTime);
      
      // Set appropriate scale based on unit type
      const scale = this.getUnitScale(unitData);
      unit.setScale(scale).setOrigin(0.5, 0.92).setFrame(0).setDepth(100);
      const bodyWidth = 28 / scale, bodyHeight = 44 / scale;
      unit.setSize(bodyWidth, bodyHeight).setOffset((256 - bodyWidth) / 2, 256 * 0.92 - bodyHeight);
      unit.setInteractive(new Phaser.Geom.Rectangle(92, 65, 72, 175), Phaser.Geom.Rectangle.Contains);
      unit.setData('attackUntil', 0);
      
      
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
  // Assign a unique, stable UID so projectiles can avoid re-hitting the same unit
  unit.setData('uid', this.unitUidCounter++);
      
      // Healthbar wird erst bei Schaden erstellt - nicht sofort
      gameUnit.healthBar = undefined;
      
  unit.setData('side', side);
  unit.setData('epoch', unitData.epoch);
  unit.setData('isUnit', true);
      unit.setData('hp', adjustedHp);
      unit.setData('maxHp', adjustedHp);
      unit.setData('damage', adjustedDamage);
      unit.setData('speed', adjustedSpeed);
      unit.setData('range', unitData.range);
  unit.setData('attackSpeed', unitData.attackSpeed);
      unit.setData('cost', unitData.goldCost);
      unit.setData('type', unitData.type);
      unit.setData('inCombat', false);
  unit.setData('lastAttackTime', -Infinity);
  // XP tracking flags (reset whenever sprite reused from pool)
  unit.setData('xpAwarded', false);
  unit.setData('spawnTimestamp', this.simulationTime);
      
      // Set constant marching velocity
      const velocityX = side === 'player' ? adjustedSpeed : -adjustedSpeed;
      unit.setVelocityX(velocityX);
  unit.setData('initialVelocityX', velocityX);
      
      // Developer Mode: Create debug text for this unit
      if (this.developerMode) {
        this.createUnitDebugText(gameUnit);
      }
      
      // Enhanced logging with texture info
      console.log(`✅ Spawned ${unitData.name} (${side}) | Texture: ${texture} | HP: ${adjustedHp}/${unitData.hp} | DMG: ${adjustedDamage} | SPD: ${adjustedSpeed} | Epoch: ${unitData.epoch}`);
      
      // Play spawn sound effect
      this.soundEffects.playUnitSpawn(this.currentEpochIndex);
      
      // Log to game logger for MCP analysis
      gameLogger.unitSpawn(unitData.name, side, texture, `${adjustedHp}/${unitData.hp}`, adjustedDamage, adjustedSpeed, unitData.epoch);
      return true;
    }
    return false;
  }

  private processSpawnQueue(currentTime: number): void {
    for (const side of ['player', 'enemy'] as const) {
      const index = this.spawnQueue.findIndex(item => item.side === side);
      if (index < 0 || currentTime - this.lastSpawnTime[side] < this.SPAWN_QUEUE_DELAY) continue;
      const [item] = this.spawnQueue.splice(index, 1);
      this.spawnUnitByData(side, item.unitData);
      this.lastSpawnTime[side] = currentTime;
    }
  }

  private handleUnitCollision(unit1: Phaser.Physics.Arcade.Sprite, unit2: Phaser.Physics.Arcade.Sprite): void {
    if (!unit1.active || !unit2.active || this.gameOver || this.paused) return;
    if (unit1.getData('side') === unit2.getData('side')) return;
    unit1.setVelocityX(0);
    unit2.setVelocityX(0);
    this.attackUnit(unit1, unit2);
    if (unit2.active && unit1.active) this.attackUnit(unit2, unit1);
  }

  private attackUnit(attacker: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    if (!attacker.active || !target.active || this.gameOver || this.paused) return;
    if (attacker.getData('type') === 'ranged') {
      this.handleRangedAttack(attacker, target);
      return;
    }
    if (!canAttack(this.simulationTime, attacker.getData('lastAttackTime') ?? -Infinity, attacker.getData('attackSpeed'))) return;
    attacker.setData('lastAttackTime', this.simulationTime);
    attacker.setData('attackUntil', this.simulationTime + 320);
    const attackerUid = attacker.getData('uid'), targetUid = target.getData('uid');
    // Attack frames 4–7 use 80ms each: frame 6 is the visible contact.
    this.time.delayedCall(160, () => {
      if (this.gameOver || this.paused || !attacker.active || !target.active) return;
      if (attacker.getData('uid') !== attackerUid || target.getData('uid') !== targetUid) return;
      const range = Math.max(34, attacker.getData('range') as number);
      if (Phaser.Math.Distance.Between(attacker.x, attacker.y, target.x, target.y) > range) return;
      const data = (attacker as GameUnit).unitData!;
      this.damageUnit(target, damageAgainst(data, (target as GameUnit).unitData, attacker.getData('damage')), attacker.getData('side'));
      this.soundEffects.playCombat(['clubman', 'dino-rider'].includes(data.id) ? 'wood' : 'melee');
    });
  }

  private damageUnit(target: Phaser.Physics.Arcade.Sprite, damage: number, owner: 'player' | 'enemy'): void {
    if (!target.active || this.gameOver || !Number.isFinite(damage) || damage <= 0) return;
    const before = target.getData('hp') as number;
    if (before <= 0) return;
    const dealt = Math.min(before, damage);
    const hp = Math.max(0, before - damage);
    target.setData('hp', hp);
    const gameUnit = target as GameUnit;
    gameUnit.currentHp = hp;
    const uid = target.getData('uid');
    this.effects?.impact(target.x, this.getUnitTargetY(target), 'hit', owner);
    target.setTint(0xffb18a);
    this.time.delayedCall(90, () => { if (target.active && target.getData('uid') === uid) target.clearTint(); });
    this.showFloatingDamage(target.x, this.getUnitTargetY(target) - 10, dealt);
    if (hp > 0) {
      if (!gameUnit.healthBar) gameUnit.healthBar = this.createHealthBar(target);
      this.updateHealthBar(gameUnit);
    }
    if (owner === 'player') this.addXP(calculateXPFromDamage(damage, before));
    if (hp <= 0) {
      if (owner === 'player' && !target.getData('xpAwarded')) {
        target.setData('xpAwarded', true);
        this.addXP(calculateKillBonusXP(target.getData('cost')));
        this.awardEnemyKill(target);
        this.kills++;
      }
      this.showDeathEffect(target.x, target.y);
      this.recycleUnit(target);
    }
  }

  private recycleUnit(unit: Phaser.Physics.Arcade.Sprite): void {
    this.tweens.killTweensOf(unit);
    // Destroy health bar first
    const gameUnit = unit as GameUnit;
    this.destroyHealthBar(gameUnit);
    
    // Return unit to pool for recycling
    const side = unit.getData('side') as 'player' | 'enemy';
    // Ensure any visual/physics state is reset so pooled sprite doesn't carry over
    unit.clearTint();
    unit.setActive(false);
    unit.setVisible(false);
    unit.setVelocity(0, 0);
    unit.setData('inCombat', false);
    if (unit.body) {
      const body = unit.body as Phaser.Physics.Arcade.Body;
      body.immovable = false;
      body.enable = false;
    }
    
    // Return to appropriate group pool
    if (side === 'player') {
      this.playerUnits.killAndHide(unit);
    } else {
      this.enemyUnits.killAndHide(unit);
    }
  }

  private handleProjectileHit(projectile: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    if (!projectile.active || !target.active || projectile.getData('manualCollision') || projectile.getData('consumed')) return;
    this.applyProjectileHit(projectile, target);
  }

  private applyProjectileHit(projectile: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    const uid = target.getData('uid') as number;
    const hitUids = projectile.getData('hitUids') as Set<number>;
    if (hitUids.has(uid)) return;
    hitUids.add(uid);
    const owner = projectile.getData('owner') as 'player' | 'enemy';
    const damage = projectile.getData('damage') as number;
    const x = target.x;
    const y = target.y;
    this.damageUnit(target, damage, owner);
    const splash = projectile.getData('splash') as number;
    if (splash > 0) {
      const group = owner === 'player' ? this.enemyUnits : this.playerUnits;
      group.children.entries.forEach(child => {
        const nearby = child as Phaser.Physics.Arcade.Sprite;
        if (nearby !== target && nearby.active && Math.abs(nearby.x - x) <= splash && Math.abs(nearby.y - y) < 50) {
          this.damageUnit(nearby, Math.round(damage * 0.5), owner);
        }
      });
    }
    const pierce = projectile.getData('pierce') as number;
    if (pierce > 0) projectile.setData('pierce', pierce - 1);
    else this.recycleProjectile(projectile);
  }

  private recycleProjectile(projectile: Phaser.Physics.Arcade.Sprite): void {
    projectile.setActive(false).setVisible(false).setVelocity(0, 0).setAcceleration(0, 0);
    projectile.setData('consumed', true);
    if (projectile.body) (projectile.body as Phaser.Physics.Arcade.Body).enable = false;
  }

  private attackBase(unit: Phaser.Physics.Arcade.Sprite, targetBaseSide: 'player' | 'enemy'): void {
    if (!unit.active || this.gameOver || this.paused) return;
    if (!canAttack(this.simulationTime, unit.getData('lastAttackTime') ?? -Infinity, unit.getData('attackSpeed'))) return;
    unit.setData('lastAttackTime', this.simulationTime);
    unit.setData('attackUntil', this.simulationTime + 320);
    const uid = unit.getData('uid');
    const base = targetBaseSide === 'player' ? this.playerBase : this.enemyBase;
    this.time.delayedCall(160, () => {
      if (this.gameOver || this.paused || !unit.active || unit.getData('uid') !== uid || base.hp <= 0) return;
      const range = Math.max(34, unit.getData('range') as number);
      const baseRange = unit.getData('type') === 'ranged' ? Math.max(BASE_ATTACK_RANGE, range * 0.8) : BASE_ATTACK_RANGE;
      if (Math.abs(base.x - unit.x) > baseRange) return;
      const data = (unit as GameUnit).unitData!;
      if (unit.getData('type') === 'ranged') this.fireBaseProjectile(unit, targetBaseSide);
      else this.damageBase(targetBaseSide, damageAgainst(data, undefined, unit.getData('damage')));
    });
  }

  private addXP(amount: number, x?: number, y?: number): void {
    const safeAmount = clampXPEvent(amount);
    if (safeAmount <= 0 || this.currentEpochIndex === this.epochs.length - 1) return;
    this.xp += safeAmount;
    if (x !== undefined && y !== undefined) this.xpFeedback.showXPGain(x, y, safeAmount);
    const ui = this.scene.get('UIScene');
    ui.events.emit('updateXP', this.xp, this.getCurrentEpoch().xpToNext);
    ui.events.emit('updateEpochReady', canAdvanceEpoch(this.xp, this.getCurrentEpoch()));
  }

  private advanceEpoch(): void {
    const epoch = this.getCurrentEpoch();
    if (!canAdvanceEpoch(this.xp, epoch) || this.currentEpochIndex >= this.epochs.length - 1) return;
    this.xp -= epoch.xpToNext;
    this.currentEpochIndex++;
    const next = this.getCurrentEpoch();
    const ratio = this.playerBase.hp / this.playerBase.maxHp;
    this.playerBase.maxHp = this.getBaseMaxHP(this.currentEpochIndex);
    // Advancement preserves damage; the extra 10% is a visible reinforcement reward.
    this.playerBase.hp = Math.min(this.playerBase.maxHp, Math.round(this.playerBase.maxHp * (ratio + 0.1)));
    this.updateBaseHealthBar('player');
    this.updateBackground();
    this.soundEffects.playEpochAdvance();
    this.music.playBattleMusic(this.currentEpochIndex + 1);
    this.selectedTurretIndex = -1;
    this.hideTurretGrid();
    this.closeTurretMenu();
    const ui = this.scene.get('UIScene');
    ui.events.emit('updateEpoch', next);
    ui.events.emit('updateXP', this.xp, next.xpToNext);
    ui.events.emit('updateEpochReady', canAdvanceEpoch(this.xp, next));
    ui.events.emit('updateBaseHP', this.playerBase.hp, this.playerBase.maxHp, 'player');
    ui.events.emit('selectTurret', -1);
    this.emitBattleStatus();
  }

  private addGold(amount: number, x?: number, y?: number, earned = true): void {
    if (!Number.isFinite(amount)) return;
    this.gold = Math.max(0, this.gold + amount);
    if (amount > 0 && earned) this.goldEarned += amount;
    
    // Play sound only for positive gains (not for spending)
    if (amount > 0 && x !== undefined) {
      this.soundEffects.playGoldCollect();
    }
    
    const uiScene = this.scene.get('UIScene');
    uiScene.events.emit('updateGold', this.gold);
    
    // Visual feedback with new Gold Feedback System
    if (x !== undefined && y !== undefined) {
      this.goldFeedback.showGoldGain(x, y, amount, false);
    }
  }

  // ===== VISUAL FEEDBACK METHODS =====

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
   * Show floating damage number above a unit
   */
  private showFloatingDamage(x: number, y: number, damage: number): void {
    const dmgText = this.add.text(x, y, `-${damage}`, {
      fontFamily: UI_FONT,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#e4bcaa',
      stroke: '#0a151c',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(3000);
    
    this.tweens.add({
      targets: dmgText,
      y: y - (this.registry.get('settings')?.reducedMotion ? 0 : 22),
      alpha: 0,
      duration: 550,
      ease: 'Power2',
      onComplete: () => dmgText.destroy()
    });
  }

  /**
   * Show death puff effect when a unit dies
   */
  private showDeathEffect(x: number, y: number): void {
    this.effects?.impact(x, y, 'death');
  }

  private addKillToStreak(unitCost: number): number {
    const share = DIFFICULTY[this.difficulty].bounty;
    const baseBounty = Math.round(calculateKillGoldBounty(unitCost) * share);
    const bonus = this.killStreakManager.registerKill(baseBounty, this.simulationTime);
    return baseBounty + Math.round(bonus * share);
  }

  private awardEnemyKill(unit: Phaser.Physics.Arcade.Sprite): void {
    const unitCost = unit.getData('cost') || 50;
    const totalGold = this.addKillToStreak(unitCost);
    this.addGold(totalGold, unit.x, unit.y);
    this.showGoldParticles(unit.x, unit.y, totalGold);
  }

  private setSimulationSpeed(speed: number): void {
    if (this.gameOver || ![1, 2, 4].includes(speed)) return;
    this.simulationSpeed = speed;
    this.time.timeScale = this.paused ? 0 : speed;
    this.tweens.timeScale = this.paused ? 0 : speed;
    this.physics.world.timeScale = 1 / speed;
    this.scene.get('UIScene').events.emit('updateSimulationSpeed', speed);
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.paused) return;
    // Phaser already smooths/caps delta for Clock and Arcade World. A second,
    // scene-only cap would slow income, waves and attack frames on slower displays.
    const step = Math.max(0, delta) * this.simulationSpeed;
    this.simulationTime += step;
    this.processSpawnQueue(this.simulationTime);
    this.updateBattleEconomy(step);
    this.updateWaves();
    this.updateRangedUnits(step);
    this.updateTurrets();
    this.updateFortressGun();
    this.updateAllHealthBars();
    this.updateUnitPresentation();
    this.updateSpecialCooldowns();
    if (this.developerMode) this.updateUnitDebugTexts();
    if (this.debugEnabled && this.simulationTime - this.debugLastUpdate >= this.DEBUG_UPDATE_INTERVAL) {
      this.debugLastUpdate = this.simulationTime;
      this.drawDebugOverlay();
    }
    this.projectiles.children.entries.forEach(child => {
      const shot = child as Phaser.Physics.Arcade.Sprite;
      if (!shot.active) return;
      if (this.simulationTime - shot.getData('bornAt') > 4500) {
        this.recycleProjectile(shot);
        return;
      }
      // A fast shot may cross a target and the screen edge in the same physics step.
      // Resolve the complete flight segment before removing it outside the field.
      if (shot.getData('manualCollision')) this.processManualProjectile(shot);
      if (!shot.active) return;
      if (shot.x < -UNIT_CLEANUP_MARGIN || shot.x > LANE_WIDTH + UNIT_CLEANUP_MARGIN || shot.y < -50 || shot.y > 650) {
        this.recycleProjectile(shot);
        return;
      }
      shot.setData('prevX', shot.x);
      shot.setData('prevY', shot.y);
    });
    if (this.simulationTime - this.lastStatusAt >= 250) this.emitBattleStatus();
  }

  private updateBattleEconomy(delta: number): void {
    this.incomeAccumulator += delta;
    while (this.incomeAccumulator >= 1000) {
      this.incomeAccumulator -= 1000;
      this.addGold(this.incomePerSecond());
    }
  }

  private incomePerSecond(): number {
    return Math.round(EPOCH_INCOME[this.currentEpochIndex] * DIFFICULTY[this.difficulty].income);
  }

  private emitBattleStatus(): void {
    this.lastStatusAt = this.simulationTime;
    this.wavePlan ??= this.makeWavePlan(Math.max(1, this.waveNumber + (this.wavePhase === 'assault' ? 0 : 1)), this.phaseEndsAt);
    this.scene.get('UIScene').events.emit('updateWave', {
      number: Math.max(1, this.waveNumber), phase: this.wavePhase,
      remainingMs: Math.max(0, this.phaseEndsAt - this.simulationTime),
      enemyEpoch: this.epochs[this.enemyEpochIndex].id,
      incomePerSecond: this.incomePerSecond(), elapsedMs: this.simulationTime,
      army: this.playerUnits?.countActive(true) ?? 0, armyLimit: ARMY_LIMIT,
      plan: this.wavePlan, surge: this.upcomingSurge(), attempted: this.wavePhase === 'assault' ? this.waveSpawned : 0,
      arrived: this.wavePhase === 'assault' ? this.waveArrived : 0,
    });
  }

  private makeWavePlan(number: number, attackAt: number): EnemyWavePlan {
    const epoch = this.epochs[enemyEpochAt(attackAt, this.difficulty)].id;
    return planEnemyWave(number, this.difficulty, epoch, this.unitsDatabase);
  }

  /** Strength of the announced wave: the running assault, or the next one between two assaults. */
  private upcomingSurge(): number {
    if (this.wavePhase === 'assault') return this.waveSurge;
    const final = this.wavePlan?.epoch === this.epochs[this.epochs.length - 1].id;
    return final ? 1 + DIFFICULTY[this.difficulty].lateSurge * this.finalWaves : 1;
  }

  private updateWaves(): void {
    this.wavePlan ??= this.makeWavePlan(Math.max(1, this.waveNumber + (this.wavePhase === 'assault' ? 0 : 1)), this.phaseEndsAt);
    if (this.simulationTime >= this.phaseEndsAt) {
      if (this.wavePhase === 'assault') {
        this.wavePhase = 'respite';
        this.phaseEndsAt = this.simulationTime + WAVE_RESPITE_MS;
        // Commit the next enemy epoch and formation while the player can still prepare.
        this.wavePlan = this.makeWavePlan(this.waveNumber + 1, this.phaseEndsAt);
      } else {
        this.wavePhase = 'assault';
        this.waveNumber = this.wavePlan.number;
        this.waveSpawned = 0;
        this.waveArrived = 0;
        this.nextEnemySpawnAt = this.simulationTime;
        this.phaseEndsAt = this.simulationTime + WAVE_ASSAULT_MS;
        // From the second wave of the enemy's final epoch on, every wave arrives a little stronger.
        if (this.wavePlan.epoch === this.epochs[this.epochs.length - 1].id) this.finalWaves++;
        this.waveSurge = 1 + DIFFICULTY[this.difficulty].lateSurge * Math.max(0, this.finalWaves - 1);
        const nextEpoch = this.epochs.findIndex(epoch => epoch.id === this.wavePlan!.epoch);
        if (nextEpoch !== this.enemyEpochIndex) {
          this.enemyEpochIndex = nextEpoch;
          const ratio = this.enemyBase.hp / this.enemyBase.maxHp;
          this.enemyBase.maxHp = this.getBaseMaxHP(nextEpoch, 'enemy');
          this.enemyBase.hp = Math.max(1, Math.round(ratio * this.enemyBase.maxHp));
          this.updateBaseHealthBar('enemy');
          this.scene.get('UIScene').events.emit('updateBaseHP', this.enemyBase.hp, this.enemyBase.maxHp, 'enemy');
        }
      }
      this.emitBattleStatus();
    }
    const count = this.wavePlan.unitIds.length;
    if (this.wavePhase === 'assault' && this.waveSpawned < count && this.simulationTime >= this.nextEnemySpawnAt) {
      const id = this.wavePlan.unitIds[this.waveSpawned];
      const data = this.unitsDatabase.find(unit => unit.id === id)!;
      if (this.spawnUnitByData('enemy', data)) this.waveArrived++;
      // Preserve the tested attempt cadence and army cap; blocked exits do not create a hidden retry army.
      this.waveSpawned++;
      this.nextEnemySpawnAt += (WAVE_ASSAULT_MS - 3000) / count;
    }
  }

  /** The enemy fortress fires at the closest attacker near its wall; strength follows its epoch and the difficulty. */
  private updateFortressGun(): void {
    const scale = DIFFICULTY[this.difficulty].enemyGun;
    if (scale <= 0 || this.simulationTime - this.fortressShotAt < FORTRESS_GUN.intervalMs) return;
    if (this.enemyBase.hp < this.enemyBase.maxHp * FORTRESS_GUN.silentBelow) return;
    let target: Phaser.Physics.Arcade.Sprite | undefined;
    let closest = Infinity;
    for (const child of this.playerUnits.children.entries) {
      const unit = child as Phaser.Physics.Arcade.Sprite;
      const distance = Math.abs(unit.x - this.enemyBase.x);
      if (unit.active && distance <= FORTRESS_GUN.range && distance < closest) { closest = distance; target = unit; }
    }
    if (!target) return;
    this.fortressShotAt = this.simulationTime;
    const texture = ['rock', 'arrow', 'cannonball', 'bullet', 'laser'][this.enemyEpochIndex];
    const damage = Math.round(FORTRESS_GUN.damage[this.enemyEpochIndex] * scale);
    const x = this.enemyBase.x - 48, y = LANE_Y - 118;
    const shot = this.launchProjectile(x, y, target, texture, 'enemy', damage, 620);
    if (!shot) return;
    shot.setScale(this.getProjectileScale(texture));
    shot.setData('splash', FORTRESS_GUN.splash);
    if (!['rock', 'arrow'].includes(texture)) this.spawnMuzzleFlash(x, y, 'enemy', texture);
    this.soundEffects.play('turret_fire', 0.2);
  }

  private updateTurrets(): void {
    const now = this.simulationTime;
    
    for (let row = 0; row < TURRET_GRID_ROWS; row++) {
      for (let col = 0; col < TURRET_GRID_COLS; col++) {
        const slot = this.turretGrid[row][col];
        
        if (!slot.occupied || !slot.turretData) continue;
        
        // Check fire rate cooldown using dynamic level-scaled stat helper
        const cooldown = this.getTurretAttackSpeed(slot) * 1000; // Convert to ms
        if (now - slot.lastFireTime < cooldown) continue;
        
        // Find target in range using dynamic level-scaled range helper
        const range = this.getTurretRange(slot);
        const target = this.findTargetInRange(slot.x, slot.y, range);
        
        if (target) {
          this.fireTurretProjectile(slot, target);
          slot.lastFireTime = now;
        }
      }
    }
  }

  private formationRow(unit: Phaser.Physics.Arcade.Sprite): number {
    const stored = unit.getData('formationRow');
    if (Number.isInteger(stored) && stored >= 0 && stored < FORMATION_OFFSETS.length) return stored;
    // Old snapshots and restored/pool sprites receive a deterministic row once.
    const row = Math.trunc(Math.abs(Number(unit.getData('uid')) || 0)) % FORMATION_OFFSETS.length;
    unit.setData('formationRow', row);
    return row;
  }

  private findFormationSpawn(side: 'player' | 'enemy', id: string): { x: number; y: number; row: number } | null {
    const group = side === 'player' ? this.playerUnits : this.enemyUnits;
    const active = group.children.entries.filter(child => child.active) as Phaser.Physics.Arcade.Sprite[];
    const direction = side === 'player' ? 1 : -1;
    const spawnX = side === 'player' ? PLAYER_SPAWN_X : ENEMY_SPAWN_X;
    const rows = FORMATION_OFFSETS.map((_, row) => ({ row,
      count: active.filter(unit => this.formationRow(unit) === row).length,
    })).sort((a, b) => a.count - b.count || a.row - b.row);
    for (const { row } of rows) {
      const x = spawnX - direction * row * 10;
      const occupied = active.some(unit => this.formationRow(unit) === row &&
        Math.abs(unit.x - x) < formationGap(id, unit.getData('unitId')));
      if (!occupied) return { x, y: LANE_Y + FORMATION_OFFSETS[row], row };
    }
    return null;
  }

  /** Move the front of each row first, then limit followers to the space it opens. */
  private updateRangedUnits(stepMs = 1000 / 60): void {
    const seconds = Math.max(0.001, stepMs / 1000);
    for (const side of ['player', 'enemy'] as const) {
      const group = side === 'player' ? this.playerUnits : this.enemyUnits;
      const targetSide = side === 'player' ? 'enemy' : 'player';
      const direction = side === 'player' ? 1 : -1;
      const units = (group.children.entries.filter(child => child.active) as Phaser.Physics.Arcade.Sprite[])
        .sort((a, b) => direction * (b.x - a.x) || a.getData('uid') - b.getData('uid'));
      const fronts = new Map<number, Phaser.Physics.Arcade.Sprite>();
      for (const unit of units) {
        if (this.gameOver) break;
        let row = this.formationRow(unit);
        let front = fronts.get(row);
        const id = unit.getData('unitId');
        const range = Math.max(34, unit.getData('range') as number);
        const target = this.findEnemyInRange(unit.x, unit.y, range, targetSide);
        const base = targetSide === 'enemy' ? this.enemyBase : this.playerBase;
        const baseRange = unit.getData('type') === 'ranged' ? Math.max(BASE_ATTACK_RANGE, range * 0.8) : BASE_ATTACK_RANGE;
        const atBase = Math.abs(base.x - unit.x) <= baseRange;
        let velocity = target || atBase ? 0 : direction * unit.getData('speed');
        unit.setData('inCombat', !!target || atBase);
        unit.setData('formationBlocked', false);
        if (unit.body) (unit.body as Phaser.Physics.Arcade.Body).immovable = false;

        // A faster troop can use an open row to pass a stopped support unit.
        // Check both the row ahead and behind; a switch never creates a new overlap.
        if (velocity && front && direction * (front.x - unit.x) < formationGap(id, front.getData('unitId')) + 12) {
          const currentSpace = direction * (front.x - unit.x);
          const alternatives = FORMATION_OFFSETS.map((_, candidate) => {
            const leader = fronts.get(candidate);
            const space = leader ? direction * (leader.x - unit.x) : Infinity;
            const clear = candidate !== row && units.every(other => other === unit || this.formationRow(other) !== candidate ||
              Math.abs(other.x - unit.x) >= formationGap(id, other.getData('unitId')));
            return { candidate, leader, space, clear };
          }).filter(value => value.clear && value.space > currentSpace + 12)
            .sort((a, b) => b.space - a.space || Math.abs(a.candidate - row) - Math.abs(b.candidate - row));
          if (alternatives.length) {
            row = alternatives[0].candidate;
            front = alternatives[0].leader;
            unit.setData('formationRow', row);
          }
        }

        if (front) {
          const gap = formationGap(id, front.getData('unitId'));
          const limit = front.x - direction * gap;
          if (direction * (unit.x - limit) > 0) unit.setPosition(limit, unit.y);
          const space = Math.max(0, direction * (front.x - unit.x) - gap);
          const frontSpeed = Math.max(0, direction * (front.body?.velocity.x || 0));
          const allowed = frontSpeed + space / seconds;
          if (direction * velocity > allowed) {
            velocity = direction * allowed;
            unit.setData('formationBlocked', true);
          }
        }
        // Physics separation may move an anchor vertically; the authored ground row stays fixed.
        unit.setPosition(unit.x, LANE_Y + FORMATION_OFFSETS[row]);
        unit.setVelocity(velocity, 0);
        fronts.set(row, unit);
        // Recheck after spacing correction so a displaced troop never attacks beyond range.
        if (target && Phaser.Math.Distance.Between(unit.x, unit.y, target.x, target.y) <= range) this.attackUnit(unit, target);
        else if (!target && Math.abs(base.x - unit.x) <= baseRange) this.attackBase(unit, targetSide);
      }
    }
  }

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
    if (!attacker.active || !target.active || this.gameOver || this.paused) return;
    if (!canAttack(this.simulationTime, attacker.getData('lastAttackTime') ?? -Infinity, attacker.getData('attackSpeed'))) return;
    attacker.setData('lastAttackTime', this.simulationTime);
    attacker.setData('lastRangedAttack', this.simulationTime);
    attacker.setData('attackUntil', this.simulationTime + 320);
    const attackerUid = attacker.getData('uid'), targetUid = target.getData('uid');
    this.time.delayedCall(160, () => {
      if (this.gameOver || this.paused || !attacker.active || !target.active) return;
      if (attacker.getData('uid') !== attackerUid || target.getData('uid') !== targetUid) return;
      if (Phaser.Math.Distance.Between(attacker.x, attacker.y, target.x, target.y) > Math.max(34, attacker.getData('range') as number)) return;
      this.fireUnitProjectile(attacker, target);
      this.animateRangedAttack(attacker);
    });
  }

  private fireUnitProjectile(shooter: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    const texture = this.getUnitProjectileTexture(shooter);
    const side = shooter.getData('side') as 'player' | 'enemy';
    const data = (shooter as GameUnit).unitData!;
    const damage = damageAgainst(data, (target as GameUnit).unitData, shooter.getData('damage'));
    const sockets = this.cache?.json?.get('weapon-sockets') as WeaponSockets | undefined;
    const muzzle = muzzlePoint(sockets, data.id, 6, shooter.x, shooter.y, shooter.scaleX ?? this.getUnitScale(data),
      shooter.scaleY ?? this.getUnitScale(data), side === 'enemy');
    const projectile = this.launchProjectile(muzzle.x, muzzle.y, target, texture, side, damage, texture === 'laser' ? 800 : 520);
    if (!projectile) return;
    projectile.setData('splash', unitRole(data.id) === 'siege' ? 55 : 0);
    projectile.setData('pierce', data.id === 'ballista' ? 1 : 0);
    if (!['rock', 'arrow', 'grenade'].includes(texture)) this.spawnMuzzleFlash(muzzle.x, muzzle.y, side, texture);
  }

  private fireBaseProjectile(shooter: Phaser.Physics.Arcade.Sprite, targetBaseSide: 'player' | 'enemy'): void {
    const data = (shooter as GameUnit).unitData!;
    const side = shooter.getData('side') as 'player' | 'enemy';
    const texture = this.getUnitProjectileTexture(shooter);
    const base = targetBaseSide === 'player' ? this.playerBase : this.enemyBase;
    const aim: BaseProjectileTarget = { x: base.x + (targetBaseSide === 'player' ? 60 : -60), y: LANE_Y - 52, baseSide: targetBaseSide };
    const sockets = this.cache?.json?.get('weapon-sockets') as WeaponSockets | undefined;
    const muzzle = muzzlePoint(sockets, data.id, 6, shooter.x, shooter.y, shooter.scaleX ?? this.getUnitScale(data),
      shooter.scaleY ?? this.getUnitScale(data), side === 'enemy');
    const projectile = this.launchProjectile(muzzle.x, muzzle.y, aim, texture, side, shooter.getData('damage'), texture === 'laser' ? 800 : 520);
    if (!projectile) return;
    // Intercepting troops take normal damage; siege bonuses apply only to the building.
    projectile.setData('baseDamage', damageAgainst(data, undefined, shooter.getData('damage')));
    projectile.setData('splash', unitRole(data.id) === 'siege' ? 55 : 0);
    projectile.setData('pierce', data.id === 'ballista' ? 1 : 0);
    if (!['rock', 'arrow', 'grenade'].includes(texture)) this.spawnMuzzleFlash(muzzle.x, muzzle.y, side, texture);
    this.animateRangedAttack(shooter);
  }

  private launchProjectile(x: number, y: number, target: Phaser.Physics.Arcade.Sprite | BaseProjectileTarget, texture: string, owner: 'player' | 'enemy', damage: number, speed: number): Phaser.Physics.Arcade.Sprite | null {
    const projectile = this.projectiles.get(x, y, texture) as Phaser.Physics.Arcade.Sprite | null;
    if (!projectile) return null;
    projectile.setPosition(x, y).setTexture(texture).setActive(true).setVisible(true).setAlpha(1).clearTint();
    if (texture === 'laser' || texture === 'plasma') projectile.setTint(owner === 'player' ? 0x84e5df : 0xff897c);
    projectile.setScale(this.getUnitProjectileScale(texture)).setDepth(1500);
    projectile.setAcceleration(0, 0).setVelocity(0, 0);
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.allowGravity = false;
    const isBase = 'baseSide' in target;
    const targetY = isBase ? target.y : this.getUnitTargetY(target);
    const distance = Phaser.Math.Distance.Between(x, y, target.x, targetY);
    const travel = distance / speed;
    const predictedX = target.x + (isBase ? 0 : target.body?.velocity.x ?? 0) * travel;
    const angle = Phaser.Math.Angle.Between(x, y, predictedX, targetY);
    this.physics.velocityFromRotation(angle, speed, body.velocity);
    projectile.setRotation(angle);
    projectile.setData({ owner, damage, consumed: false, hitUids: new Set<number>(), targetBaseSide: isBase ? target.baseSide : null, baseDamage: 0,
      prevX: x, prevY: y, hitRadius: this.getProjectileHitRadius(texture), pierce: 0,
      splash: 0, manualCollision: true, spin: false, arrow: texture === 'arrow', bornAt: this.simulationTime });
    return projectile;
  }

  private getProjectileHitRadius(texture: string): number {
    const map: Record<string, number> = {
      rock: 16,
      cannonball: 14,
      arrow: 8,
      bullet: 6
    };
    return map[texture] ?? 10;
  }



  private processManualProjectile(projectile: Phaser.Physics.Arcade.Sprite): void {
    if (!projectile.active || projectile.getData('consumed') || this.gameOver || this.paused) return;
    const owner = projectile.getData('owner');
    const group = owner === 'player' ? this.enemyUnits : this.playerUnits;
    type Hit = { kind: 'unit'; target: Phaser.Physics.Arcade.Sprite; t: number } | { kind: 'base'; side: 'player' | 'enemy'; t: number };
    const hits: Hit[] = [];
    const ax = projectile.getData('prevX'), ay = projectile.getData('prevY');
    for (const child of group.children.entries) {
      const target = child as Phaser.Physics.Arcade.Sprite;
      if (!target.active || projectile.getData('hitUids').has(target.getData('uid'))) continue;
      const t = segmentHitFraction(ax, ay, projectile.x, projectile.y,
        target.x, this.getUnitTargetY(target), projectile.getData('hitRadius') + 14);
      if (t !== null) hits.push({ kind: 'unit', target, t });
    }
    const targetBaseSide = projectile.getData('targetBaseSide') as 'player' | 'enemy' | null;
    if (targetBaseSide && targetBaseSide !== owner) {
      const base = targetBaseSide === 'player' ? this.playerBase : this.enemyBase;
      const wallX = base.x + (targetBaseSide === 'player' ? 60 : -60);
      const t = segmentBoxHitFraction(ax, ay, projectile.x, projectile.y, wallX - 8, LANE_Y - 100, wallX + 8, LANE_Y - 7);
      if (base.hp > 0 && t !== null) hits.push({ kind: 'base', side: targetBaseSide, t });
    }
    hits.sort((a, b) => a.t - b.t);
    for (const hit of hits) {
      if (!projectile.active || this.gameOver) break;
      if (hit.kind === 'unit') {
        if (hit.target.active) this.applyProjectileHit(projectile, hit.target);
      } else {
        const x = ax + (projectile.x - ax) * hit.t;
        const y = ay + (projectile.y - ay) * hit.t;
        this.effects?.impact(x, y, 'hit', owner);
        this.soundEffects.play('base_damage', 0.4);
        this.damageBase(hit.side, projectile.getData('baseDamage'));
        this.recycleProjectile(projectile);
      }
    }
  }

  private getUnitProjectileScale(tex: string): number {
    // Reduced sizes for less clutter and clearer silhouettes
    const map: Record<string, number> = { rock: 0.09, arrow: 0.085, cannonball: 0.10, bullet: 0.06, grenade: 0.2, laser: 0.24, plasma: 0.26 };
    return map[tex] ?? 0.08;
  }



  private animateRangedAttack(attacker: Phaser.Physics.Arcade.Sprite): void {
    const id = attacker.getData('unitId');
    const weapon = ['cannon', 'tank'].includes(id) ? 'heavy'
      : ['laser-soldier', 'mech'].includes(id) ? 'laser'
      : id === 'plasma-trooper' ? 'plasma'
      : ['slinger', 'archer', 'ballista', 'grenadier'].includes(id) ? 'ranged' : 'gun';
    this.soundEffects.playCombat(weapon);
  }

  private updateUnitPresentation(): void {
    this.unitShadows.clear();
    for (const group of [this.playerUnits, this.enemyUnits]) {
      for (const child of group.getChildren()) {
        const unit = child as Phaser.Physics.Arcade.Sprite;
        if (!unit.active) continue;
        const uid = unit.getData('uid') || 0;
        const moving = Math.abs(unit.body?.velocity.x || 0) > 1;
        const attack = this.simulationTime < (unit.getData('attackUntil') || 0);
        const frame = attack ? 4 + Math.min(3, Math.max(0, Math.floor((this.simulationTime - unit.getData('lastAttackTime')) / 80)))
          : moving ? Math.floor((this.simulationTime + uid * 67) / 130) % 4 : 0;
        unit.setFrame(frame);
        unit.setDepth(100 + unit.y - LANE_Y);
        this.unitShadows.fillStyle(0x0a181e, 0.25).fillEllipse(unit.x, unit.y + 1, unit.displayWidth * 0.32, 7);
        this.unitShadows.lineStyle(1.3, unit.getData('side') === 'player' ? 0x85c5bb : 0xd98d7c, 0.7)
          .strokeEllipse(unit.x, unit.y + 2, 25, 6);
      }
    }
  }

  private spawnMuzzleFlash(x: number, y: number, side: 'player' | 'enemy', texture = 'bullet'): void {
    const flash = this.add.image(x, y, 'muzzle-flash')
      .setDepth(2000)
      .setScale(texture === 'cannonball' ? 0.7 : 0.4)
      .setBlendMode(Phaser.BlendModes.ADD);
    if (side === 'enemy') flash.setFlipX(true);
    if (texture === 'laser' || texture === 'plasma') flash.setTint(side === 'enemy' ? 0xff897c : 0x84e5df);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 0.3,
      duration: 100,
      onComplete: () => flash.destroy()
    });
  }

  /**
   * Get projectile texture for unit type
   */
  private getUnitTargetY(unit: Phaser.Physics.Arcade.Sprite): number {
    return unit.y - unitTargetHeight(unit.getData('unitId'));
  }

  private getUnitProjectileTexture(unit: Phaser.Physics.Arcade.Sprite): string {
    return projectileTexture(unit.getData('unitId'));
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
    if (slot.turretData.projectileSpeed <= 0) {
      this.damageUnit(target, this.getTurretDamage(slot), 'player');
      return;
    }
    const texture = this.getProjectileTexture(slot.turretData);
    const projectile = this.launchProjectile(slot.x, slot.y - 50, target, texture, 'player', this.getTurretDamage(slot), slot.turretData.projectileSpeed);
    if (projectile) {
      projectile.setScale(this.getProjectileScale(texture));
      if (!['rock', 'arrow'].includes(texture)) this.spawnMuzzleFlash(slot.x, slot.y - 50, 'player', texture);
      projectile.setData('splash', ['trebuchet', 'cannon', 'artillery', 'ion-cannon'].includes(slot.turretData.id) ? 65 : 0);
      projectile.setData('pierce', slot.turretData.id === 'rail-gun' ? 2 : 0);
    }
    this.soundEffects.play('turret_fire', 0.25);
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
      
      // Future energy weapons
      'laser-turret': 'laser',
      'rail-gun': 'laser',
      'ion-cannon': 'plasma'
    };
    
    return projectileTextures[turretData.id] || 'rock';
  }

  private getProjectileScale(projectileTexture: string): number {
    // Set appropriate scales for different projectile types (minimal!)
    const projectileScales: Record<string, number> = {
      'rock': 0.2,
      'arrow': 0.25,
      'cannonball': 0.2,
      'bullet': 0.15,
      'laser': 0.38,
      'plasma': 0.42
    };
    
    return projectileScales[projectileTexture] || 0.2;
  }

  private damageBase(side: 'player' | 'enemy', damage: number): void {
    const base = side === 'player' ? this.playerBase : this.enemyBase;
    if (this.gameOver) return;
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
    if (this.gameOver) return;
    this.gameOver = true;
    this.physics.pause();
    this.time.timeScale = 0;
    this.closeTurretMenu();
    this.music.stop();
    this.soundEffects.play(loserSide === 'player' ? 'defeat' : 'victory', 0.7);
    this.scene.get('UIScene').events.emit('gameOver', {
      winner: loserSide === 'player' ? 'enemy' : 'player', elapsedMs: this.simulationTime,
      kills: this.kills, epoch: this.getCurrentEpoch().name,
      enemyFortress: this.enemyBase.hp / this.enemyBase.maxHp,
      goldEarned: Math.round(this.goldEarned), waves: Math.max(1, this.waveNumber),
      bestStreak: this.killStreakManager?.bestStreak ?? 0,
    });
  }

  private updateSpecialCooldowns(): void {
    const now = this.simulationTime;
    const uiScene = this.scene.get('UIScene');
    
    // Raining Rocks cooldown
    const rainingRocksRemaining = Math.max(0, RAINING_ROCKS_COOLDOWN - (now - this.rainingRocksLastUsed));
    uiScene.events.emit('updateRainingRocksCooldown', rainingRocksRemaining, RAINING_ROCKS_COOLDOWN);
    
    // Artillery Strike cooldown
    const artilleryStrikeRemaining = Math.max(0, ARTILLERY_STRIKE_COOLDOWN - (now - this.artilleryStrikeLastUsed));
    uiScene.events.emit('updateArtilleryStrikeCooldown', artilleryStrikeRemaining, ARTILLERY_STRIKE_COOLDOWN);
  }

  private useRainingRocks(): void {
    const now = this.simulationTime;
    const cooldownRemaining = now - this.rainingRocksLastUsed;
    
    if (cooldownRemaining < RAINING_ROCKS_COOLDOWN) {
      console.log(`Raining Rocks on cooldown: ${Math.ceil((RAINING_ROCKS_COOLDOWN - cooldownRemaining) / 1000)}s remaining`);
      return;
    }
    
    this.rainingRocksLastUsed = now;
    this.soundEffects.play('ability_cast', 0.5);
    console.log('🪨 Raining Rocks activated!');
    
    // Create multiple impacts along the lane
    for (let i = 0; i < RAINING_ROCKS_COUNT; i++) {
      const delay = i * 200; // 200ms between impacts
      
      this.time.delayedCall(delay, () => {
        // Random position along the lane
        const enemies = this.enemyUnits.getChildren().filter(child => child.active) as Phaser.Physics.Arcade.Sprite[];
        const target = enemies[i % Math.max(1, enemies.length)];
        const impactX = target ? target.x + (Math.random() - 0.5) * 60 : 380 + i * 65;
        const impactY = LANE_Y;
        
        this.effects?.meteorTrail(impactX, impactY);
        this.time.delayedCall(300, () => { if (!this.gameOver) this.createRockImpact(impactX, impactY); });
      });
    }
  }

  private createRockImpact(x: number, y: number): void {
    this.effects?.impact(x, y, 'meteor');
    this.soundEffects.play('explosion', 0.55);
    const scaledDamage = RAINING_ROCKS_DAMAGE * [1, 1.8, 3.0, 4.5, 6.5][this.currentEpochIndex];
    this.enemyUnits.children.entries.forEach(child => {
      const unit = child as Phaser.Physics.Arcade.Sprite;
      if (unit.active && Phaser.Math.Distance.Between(x, y, unit.x, unit.y) <= RAINING_ROCKS_RADIUS) {
        this.damageUnit(unit, scaledDamage, 'player');
      }
    });
  }

  private useArtilleryStrike(): void {
    if (this.currentEpochIndex < 2) return;
    const now = this.simulationTime;
    const cooldownRemaining = now - this.artilleryStrikeLastUsed;
    
    if (cooldownRemaining < ARTILLERY_STRIKE_COOLDOWN) {
      console.log(`Artillery Strike on cooldown: ${Math.ceil((ARTILLERY_STRIKE_COOLDOWN - cooldownRemaining) / 1000)}s remaining`);
      return;
    }
    
    this.artilleryStrikeLastUsed = now;
    this.soundEffects.play('ability_cast', 0.5);
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
    this.effects?.impact(x, y, 'artillery');
    this.soundEffects.play('explosion', 0.45);
    const scaledDamage = ARTILLERY_STRIKE_DAMAGE * [1, 1.8, 3.0, 4.5, 6.5][this.currentEpochIndex];
    this.enemyUnits.children.entries.forEach(child => {
      const unit = child as Phaser.Physics.Arcade.Sprite;
      if (unit.active && Phaser.Math.Distance.Between(x, y, unit.x, unit.y) <= ARTILLERY_STRIKE_RADIUS) {
        this.damageUnit(unit, scaledDamage, 'player');
      }
    });
  }





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
        g.fillStyle(0x7dbbae, 0.9);
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
          g.lineStyle(1, 0xd8b574, 0.7);
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
    drawUnitGroup(this.playerUnits, 0x7dbbae);
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

