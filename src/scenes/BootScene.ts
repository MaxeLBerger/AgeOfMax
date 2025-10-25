﻿import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
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

    // Load building assets
    this.load.image('player-base', 'assets/buildings/player_base.png');
    this.load.image('enemy-base', 'assets/buildings/enemy_base.png');

    // Load background assets
    this.load.image('stone-age-bg', 'assets/backgrounds/stone_age_background.png');
    this.load.image('castle-age-bg', 'assets/backgrounds/castle_age_background.png');
    this.load.image('renaissance-bg', 'assets/backgrounds/renaissance_background.png');
    this.load.image('modern-bg', 'assets/backgrounds/modern_background.png');

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
    graphics.destroy();
  }
}
