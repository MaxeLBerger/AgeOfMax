import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load unit assets
    this.load.image('archer', 'assets/units/archer_1.png');
    this.load.image('ballista', 'assets/units/ballista.png');
    this.load.image('cannon', 'assets/units/cannon.png');
    this.load.image('cavalry', 'assets/units/cavalry.png');
    this.load.image('clubman', 'assets/units/clubman.png');
    this.load.image('dino-rider', 'assets/units/dino-rider.png');
    this.load.image('duelist', 'assets/units/duelist.png');
    this.load.image('grenadier', 'assets/units/grenadier.png');
    this.load.image('knight', 'assets/units/knight.png');
    this.load.image('musketeer', 'assets/units/musketeer.png');
    this.load.image('rifleman', 'assets/units/rifleman.png');
    this.load.image('slinger', 'assets/units/slinger.png');
    this.load.image('sniper', 'assets/units/sniper.png');
    this.load.image('spearman', 'assets/units/spearman.png');
    this.load.image('swordsman', 'assets/units/swordsman.png');
    this.load.image('tank', 'assets/units/tank.png');

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
    this.scene.launch('UIScene');
    this.scene.launch('BattleScene');
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
