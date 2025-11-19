import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Runtime asset diagnostics
    const failedAssets: string[] = [];
    this.load.on('loaderror', (_file: any) => {
      // _file may differ based on Phaser version; capture src/url when available
      const src = (_file && (_file.src || _file.url || _file.key)) ?? 'unknown';
      failedAssets.push(src);
    });
    // Load unit assets - with variants (_2) where available
    // Stone Age
    this.load.image('clubman', 'assets/units/stone_age/clubman.png');
    this.load.image('clubman_2', 'assets/units/stone_age/clubman_2.png');
    this.load.image('spearman', 'assets/units/stone_age/spearman.png');
    this.load.image('slinger', 'assets/units/stone_age/slinger.png');
    this.load.image('dino-rider', 'assets/units/stone_age/dino-rider.png');
    
    // Castle Age
    this.load.image('swordsman', 'assets/units/castle_age/swordsman.png');
    this.load.image('archer', 'assets/units/castle_age/archer.png'); // MOVED from Renaissance
    this.load.image('archer_2', 'assets/units/castle_age/archer_2.png'); // MOVED from Renaissance
    this.load.image('knight', 'assets/units/castle_age/knight.png');
    this.load.image('ballista', 'assets/units/castle_age/ballista.png'); // MOVED from Renaissance
    
    // Renaissance Age
    this.load.image('musketeer', 'assets/units/renaissance_age/musketeer.png');
    this.load.image('cavalry', 'assets/units/renaissance_age/cavalry.png'); // MOVED from Castle
    this.load.image('cannon', 'assets/units/renaissance_age/cannon.png'); // MOVED from Castle
    this.load.image('duelist', 'assets/units/renaissance_age/duelist.png');
    
  // Modern Age
  this.load.image('rifleman', 'assets/units/modern_age/rifleman.png');
  this.load.image('rifleman_2', 'assets/units/modern_age/rifleman_2.png');
  this.load.image('grenadier', 'assets/units/modern_age/grenadier.png'); // MOVED from Renaissance
  this.load.image('sniper', 'assets/units/modern_age/sniper.png');
  this.load.image('tank', 'assets/units/modern_age/tank.png');

  // Future Age
  // NOTE: Skip loading non-existent future unit assets in production to avoid 404s and slow startup.
  // Placeholders will be generated for these keys in createPlaceholderAssets().
  // this.load.image('laser-soldier', 'assets/units/future_age/laser-soldier.png');
  // this.load.image('mech', 'assets/units/future_age/mech.png');
  // this.load.image('plasma-trooper', 'assets/units/future_age/plasma-trooper.png');
  // this.load.image('super-heavy', 'assets/units/future_age/super-heavy.png');

    // Load turret assets
    this.load.image('stone-tower-1', 'assets/turrets/stone_age_tower_1.png');
    this.load.image('stone-tower-2', 'assets/turrets/stone_age_tower_2.png');
    this.load.image('stone-tower-3', 'assets/turrets/stone_age_tower_3.png');
    this.load.image('castle-tower-1', 'assets/turrets/castle_age_tower_1.png');
    this.load.image('castle-tower-2', 'assets/turrets/castle_age_tower_2.png');
    this.load.image('castle-tower-3', 'assets/turrets/castle_age_tower_3.png');
    this.load.image('renaissance-tower-1', 'assets/turrets/renaissance_age_tower_1.png');
    this.load.image('renaissance-tower-2', 'assets/turrets/renaissance_age_tower_2.png');
    this.load.image('renaissance-tower-3', 'assets/turrets/renaissance_age_tower_3.png');
  // Modern/Future turret PNGs are not present yet – generate placeholders instead to prevent 404s.
  // this.load.image('modern-tower-1', 'assets/turrets/modern_age_tower_1.png');
  // this.load.image('modern-tower-2', 'assets/turrets/modern_age_tower_2.png');
  // this.load.image('modern-tower-3', 'assets/turrets/modern_age_tower_3.png');
  // this.load.image('future-tower-1', 'assets/turrets/future_age_tower_1.png');
  // this.load.image('future-tower-2', 'assets/turrets/future_age_tower_2.png');
  // this.load.image('future-tower-3', 'assets/turrets/future_age_tower_3.png');

    // Load building assets
    this.load.image('player-base', 'assets/buildings/player_base.png');
    this.load.image('enemy-base', 'assets/buildings/enemy_base.png');

    // Load background assets
    this.load.image('stone-age-bg', 'assets/backgrounds/stone_age_background.png');
    this.load.image('castle-age-bg', 'assets/backgrounds/castle_age_background.png');
    this.load.image('renaissance-bg', 'assets/backgrounds/renaissance_background.png');
  this.load.image('modern-bg', 'assets/backgrounds/modern_background.png');
  // Future background PNG is not present yet – generate a placeholder texture for 'future-bg'.
  // this.load.image('future-bg', 'assets/backgrounds/future_background.png');

    // Load UI icons
    this.load.image('gold-coin', 'assets/ui/gold_coin_icon.png');
    this.load.image('xp-star', 'assets/ui/xp_star_icon.png');
    this.load.image('raining-rocks-icon', 'assets/ui/raining_rocks_icon.png');
    this.load.image('artillery-strike-icon', 'assets/ui/artillery_strike_icon.png');
    this.load.image('turret-placeholder', 'assets/ui/turret_placeholder.png');

    // Load projectile assets
    this.load.image('arrow', 'assets/projectiles/arrow.png');
    this.load.image('bullet', 'assets/projectiles/bullet.png');
    this.load.image('cannonball', 'assets/projectiles/cannonball.png');
    this.load.image('rock', 'assets/projectiles/rock.png');

    this.load.on('complete', () => {
      console.log('Assets loaded');
      if (failedAssets.length) {
        console.warn('[BootScene] Missing assets detected:', failedAssets);
        this.showAssetDiagnostics(failedAssets);
      }
    });
  }

  create(): void {
    console.log('BootScene: Starting game...');
    this.createPlaceholderAssets();
    this.scene.start('MenuScene'); // Start with menu instead of directly launching battle
    this.scene.stop();
  }

  private createPlaceholderAssets(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x4444ff);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('unit-player', 32, 32);
    graphics.clear();
    graphics.fillStyle(0xff4444);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('unit-enemy', 32, 32);
    graphics.clear();
    graphics.fillStyle(0x888888);
    graphics.fillRect(0, 0, 64, 128);
    graphics.generateTexture('base', 64, 128);
    graphics.clear();
    graphics.fillStyle(0xffff44);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture('projectile', 16, 16);
    graphics.clear();
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(0, 0, 40, 40);
    graphics.fillStyle(0x333333);
    graphics.fillRect(10, 5, 20, 30);
    graphics.generateTexture('turret', 40, 40);
    graphics.clear();

    // Generate explicit turret placeholders to match keys used across epochs
    // Stone/Castle/Renaissance are loaded from files; Modern/Future use generated placeholders.
    const makeTurretVariant = (key: string, tint: number) => {
      graphics.fillStyle(0x8B4513);
      graphics.fillRect(0, 0, 40, 40);
      graphics.fillStyle(tint);
      graphics.fillRect(10, 5, 20, 30);
      graphics.generateTexture(key, 40, 40);
      graphics.clear();
    };
    makeTurretVariant('modern-tower-1', 0x555555);
    makeTurretVariant('modern-tower-2', 0x666666);
    makeTurretVariant('modern-tower-3', 0x777777);
    makeTurretVariant('future-tower-1', 0x00FFCC);
    makeTurretVariant('future-tower-2', 0x33CCFF);
    makeTurretVariant('future-tower-3', 0xFF33CC);
    
    // Create particle textures with proper transparency
    // Golden circle particle for XP - small sparkle
    graphics.fillStyle(0xFFD700, 1);
    graphics.fillCircle(8, 8, 6);
    graphics.fillStyle(0xFFFFFF, 0.8);
    graphics.fillCircle(8, 8, 3);
    graphics.generateTexture('particle-star', 16, 16);
    graphics.clear();
    
    // Golden circle particle for Gold
    graphics.fillStyle(0xFFD700, 1);
    graphics.fillCircle(6, 6, 5);
    graphics.fillStyle(0xFFAA00, 1);
    graphics.fillCircle(6, 6, 3);
    graphics.generateTexture('particle-gold', 12, 12);
    graphics.clear();

    // Simple muzzle flash (used for ranged attack feedback)
    graphics.fillStyle(0xFFFF66, 1);
    graphics.fillCircle(8, 8, 6);
    graphics.fillStyle(0xFFCC33, 0.9);
    graphics.fillCircle(8, 8, 4);
    graphics.fillStyle(0xFFFFFF, 0.8);
    graphics.fillCircle(8, 8, 2);
    graphics.generateTexture('muzzle-flash', 16, 16);
    graphics.clear();
    
    // Background placeholders for future (and safety fallbacks)
    const makeBackground = (key: string, top: number, bottom: number) => {
      const w = 1024;
      const h = 512;
      // simple two-tone background
      graphics.fillStyle(top);
      graphics.fillRect(0, 0, w, h / 2);
      graphics.fillStyle(bottom);
      graphics.fillRect(0, h / 2, w, h / 2);
      graphics.generateTexture(key, w, h);
      graphics.clear();
    };
    makeBackground('future-bg', 0x0a0f1f, 0x111133);

    // Minimal placeholders for future units (keys only, not used until that epoch)
    const unitSquare = (key: string, color: number) => {
      graphics.fillStyle(color);
      graphics.fillRect(0, 0, 32, 32);
      graphics.generateTexture(key, 32, 32);
      graphics.clear();
    };
    unitSquare('laser-soldier', 0x99FFEE);
    unitSquare('mech', 0x88AAFF);
    unitSquare('plasma-trooper', 0xFF88EE);
    unitSquare('super-heavy', 0xCCCCCC);

    graphics.destroy();
  }

  private showAssetDiagnostics(failed: string[]): void {
    // Simple in-canvas overlay so users understand incomplete visuals
    const bg = this.add.rectangle(640, 360, 800, 400, 0x000000, 0.85).setOrigin(0.5).setDepth(9999);
    const title = this.add.text(640, 200, 'Asset Ladefehler', { fontSize: '42px', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10000);
    const info = this.add.text(640, 260, 'Einige Grafiken konnten nicht geladen werden. Platzhalter werden angezeigt.', { fontSize: '20px', color: '#ffffff', align: 'center', wordWrap: { width: 700 } }).setOrigin(0.5).setDepth(10000);
    const list = failed.slice(0, 15).map(a => `• ${a}`).join('\n');
    this.add.text(640, 330, list, { fontSize: '16px', color: '#ffcc00', wordWrap: { width: 760 } }).setOrigin(0.5).setDepth(10000);
    this.time.delayedCall(8000, () => { bg.destroy(); title.destroy(); info.destroy(); });
  }
}
