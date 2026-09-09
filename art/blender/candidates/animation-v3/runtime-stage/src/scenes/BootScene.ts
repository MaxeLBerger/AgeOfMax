import Phaser from 'phaser';
import unitsData from '../../data/units.json';
import { UNIT_ANIMATION_LAYOUT, parseGaitMetadata } from '../game/unitAnimation';

const EPOCHS = ['stone', 'castle', 'renaissance', 'modern', 'future'];
const BACKGROUNDS = ['stone-age-bg', 'castle-age-bg', 'renaissance-bg', 'modern-bg', 'future-bg'];

export class BootScene extends Phaser.Scene {
  private failed = new Set<string>();
  constructor() { super({ key: 'BootScene' }); }

  preload(): void {
    this.failed.clear();
    this.cameras.main.setBackgroundColor('#09141d');
    this.add.text(640, 272, 'AGE OF MAX', { fontFamily: 'Georgia, serif', fontSize: '46px', color: '#eee7d6' }).setOrigin(0.5);
    this.add.text(640, 324, 'FÜNF ZEITALTER. EIN SCHLACHTFELD.', { fontFamily: 'Segoe UI, sans-serif', fontSize: '12px', color: '#d8b574' })
      .setOrigin(0.5).setLetterSpacing(3);
    this.add.rectangle(430, 392, 420, 3, 0x2a3b44).setOrigin(0);
    const progress = this.add.rectangle(430, 392, 1, 3, 0xd8b574).setOrigin(0);
    const status = this.add.text(640, 422, 'Dein Reich erwacht …', { fontSize: '14px', color: '#99abae', fontFamily: 'Segoe UI, sans-serif' }).setOrigin(0.5);
    this.load.on('progress', (value: number) => { progress.width = 420 * value; status.setText(`Schlachtfeld vorbereiten · ${Math.round(value * 100)} %`); });
    this.load.on('loaderror', (file: Phaser.Loader.File) => this.failed.add(file.key));

    for (const unit of unitsData) {
      this.load.spritesheet(unit.id, `assets/reborn/units/${unit.id}.png`, { frameWidth: 256, frameHeight: 256 });
      this.load.spritesheet(`${unit.id}-enemy`, `assets/reborn/units-enemy/${unit.id}.png`, { frameWidth: 256, frameHeight: 256 });
    }
    this.load.json('weapon-sockets', 'assets/reborn/weapon-sockets.json');
    this.load.json('gait-metadata', 'assets/reborn/gait-metadata.json');
    EPOCHS.forEach((epoch, index) => {
      this.load.image(BACKGROUNDS[index], `assets/reborn/backgrounds/${epoch}.png`);
      this.load.image(`base-${epoch}`, `assets/reborn/bases/${epoch}.png`);
      this.load.image(`base-${epoch}-enemy`, `assets/reborn/bases-enemy/${epoch}.png`);
      for (let tower = 1; tower <= 3; tower++) this.load.image(`${epoch}-tower-${tower}`, `assets/reborn/towers/${epoch}-${tower}.png`);
    });
  }

  create(): void {
    this.validateLoadedAssets();
    if (this.failed.size) {
      this.children.removeAll(true);
      this.add.text(640, 250, 'Das Schlachtfeld konnte nicht geladen werden.', { fontFamily: 'Georgia, serif', fontSize: '28px', color: '#eee7d6' }).setOrigin(0.5);
      this.add.text(640, 307, 'Prüfe die Verbindung und lade das Spiel erneut.', { fontSize: '16px', color: '#99abae' }).setOrigin(0.5);
      this.add.text(640, 354, `Fehlende oder beschädigte Spieldaten: ${[...this.failed].slice(0, 6).join(', ')}${this.failed.size > 6 ? ' …' : ''}`, {
        fontSize: '13px', color: '#d8b574', wordWrap: { width: 900 }, align: 'center'
      }).setOrigin(0.5);
      this.add.rectangle(640, 436, 260, 48, 0x20343d).setStrokeStyle(1, 0xd8b574).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => window.location.reload());
      this.add.text(640, 436, 'Erneut laden', { fontSize: '17px', color: '#eee7d6' }).setOrigin(0.5);
      return;
    }
    this.createRuntimeTextures();
    this.createPortraitFrames();
    this.scene.start('MenuScene');
  }

  private validateLoadedAssets(): void {
    const imageSize = (key: string, width: number, height: number) => {
      if (!this.textures.exists(key)) { this.failed.add(key); return; }
      const source = this.textures.get(key).getSourceImage() as HTMLImageElement;
      if (source.width !== width || source.height !== height) this.failed.add(key);
    };
    try {
      this.registry.set('unit-gaits', parseGaitMetadata(this.cache.json.get('gait-metadata')));
    } catch { this.failed.add('gait-metadata'); }
    const sockets = this.cache.json.get('weapon-sockets') as Record<string, unknown> | undefined;
    for (const unit of unitsData) {
      for (const key of [unit.id, `${unit.id}-enemy`]) {
        imageSize(key, 256 * UNIT_ANIMATION_LAYOUT.frameCount, 256);
        for (let frame = 0; frame < UNIT_ANIMATION_LAYOUT.frameCount; frame++) if (!this.textures.get(key).has(String(frame))) this.failed.add(key);
      }
      const points = sockets?.[unit.id];
      if (!Array.isArray(points) || points.length !== UNIT_ANIMATION_LAYOUT.frameCount || !points.every(point =>
        Array.isArray(point) && point.length === 2 && point.every(value => typeof value === 'number' && Number.isFinite(value)))) {
        this.failed.add(`weapon-sockets:${unit.id}`);
      }
    }
    EPOCHS.forEach((epoch, index) => {
      imageSize(BACKGROUNDS[index], 1600, 900);
      imageSize(`base-${epoch}`, 512, 512);
      imageSize(`base-${epoch}-enemy`, 512, 512);
      for (let tower = 1; tower <= 3; tower++) imageSize(`${epoch}-tower-${tower}`, 256, 256);
    });
  }

  private createPortraitFrames(): void {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return;
    for (const unit of unitsData) for (const key of [unit.id, `${unit.id}-enemy`]) {
      const texture = this.textures.get(key);
      context.clearRect(0, 0, 256, 256);
      context.drawImage(texture.getSourceImage() as HTMLImageElement, 0, 0, 256, 256, 0, 0, 256, 256);
      const pixels = context.getImageData(0, 0, 256, 256).data;
      let left = 256, right = 0, top = 256, bottom = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (pixels[(y * 256 + x) * 4 + 3] > 40) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (right <= left || bottom <= top) continue;
      const width = right - left + 1, height = bottom - top + 1;
      const infantry = !['dino-rider', 'knight', 'cavalry', 'ballista', 'cannon', 'tank', 'mech', 'super-heavy'].includes(unit.id);
      // Infantry portraits share a head-and-shoulder crop: a long spear or rifle
      // must not shrink its owner's face compared with the adjacent recruit.
      if (infantry) texture.add('portrait', 0, 82, top, 104, Math.min(height, 96));
      else texture.add('portrait', 0, left, top, width, height);
    }
  }

  private createRuntimeTextures(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const disk = (key: string, size: number, color: number) => {
      graphics.clear().fillStyle(color).fillCircle(size / 2, size / 2, size * 0.34)
        .fillStyle(0xffffff, 0.7).fillCircle(size / 2, size / 2, size * 0.12);
      graphics.generateTexture(key, size, size);
    };
    disk('particle-star', 16, 0xdcc593); disk('particle-gold', 12, 0xe2b66a); disk('muzzle-flash', 32, 0xffd191);
    disk('projectile', 64, 0xe1be7b);
    for (const key of ['rock', 'cannonball']) {
      graphics.clear().fillStyle(key === 'rock' ? 0x686655 : 0x303c43).fillCircle(128, 64, key === 'rock' ? 48 : 40)
        .fillStyle(0xd4c5a0, 0.35).fillCircle(113, 49, 17);
      graphics.generateTexture(key, 256, 128);
    }
    graphics.clear().lineStyle(9, 0xbb9158).lineBetween(38, 64, 191, 64).fillStyle(0xdad7c5).fillTriangle(191, 46, 222, 64, 191, 82)
      .lineStyle(6, 0xa8beb5).lineBetween(40, 45, 62, 64).lineBetween(40, 83, 62, 64);
    graphics.generateTexture('arrow', 256, 128);
    graphics.clear().fillStyle(0xffdb87).fillRoundedRect(72, 46, 116, 36, 16).fillStyle(0xffffff).fillRoundedRect(155, 49, 25, 30, 12);
    graphics.generateTexture('bullet', 256, 128);
    graphics.clear().fillStyle(0x53674f).fillRoundedRect(18, 15, 28, 36, 9)
      .fillStyle(0xaaa48a).fillRect(27, 8, 10, 12);
    graphics.generateTexture('grenade', 64, 64);
    graphics.clear().fillStyle(0xffffff, 0.25).fillRoundedRect(2, 2, 92, 20, 10)
      .fillStyle(0xffffff).fillRoundedRect(8, 9, 78, 6, 3);
    graphics.generateTexture('laser', 96, 24);
    graphics.clear().fillStyle(0xffffff, 0.18).fillCircle(32, 32, 29)
      .fillStyle(0xffffff, 0.6).fillCircle(32, 32, 17).fillStyle(0xffffff).fillCircle(32, 32, 8);
    graphics.generateTexture('plasma', 64, 64);
    graphics.destroy();
    const texture = this.textures.createCanvas('battle-vignette', 1280, 720);
    if (texture) {
      const context = texture.context;
      const gradient = context.createRadialGradient(640, 350, 160, 640, 350, 735);
      gradient.addColorStop(0, 'rgba(3,14,22,0)'); gradient.addColorStop(1, 'rgba(3,14,22,0.4)');
      context.fillStyle = gradient; context.fillRect(0, 0, 1280, 720); texture.refresh();
    }
  }
}
