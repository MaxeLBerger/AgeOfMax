import Phaser from 'phaser';

export type ImpactKind = 'meteor' | 'artillery' | 'hit' | 'death';
type EffectSide = 'player' | 'enemy';
type Visual = Phaser.GameObjects.Image | Phaser.GameObjects.Shape;

const DUST_TEXTURE = 'battle-fx-soft-dust-v1';
const LIGHT_TEXTURE = 'battle-fx-soft-light-v1';
const MAX_VISUALS = 180;
const SMALL_EFFECT_CEILING = 144; // Leave room for an ability impact during a crowded melee.
const DEPTH = 1700;

/** Cosmetic effects only. All motion uses scene tweens, so battle pause and speed apply. */
export class BattleEffects {
  private readonly visuals = new Map<Visual, Phaser.Tweens.Tween | undefined>();
  private readonly pending = new Set<Phaser.Time.TimerEvent>();
  private disposed = false;
  private budgetTime: number;
  private hitBudget = 14;
  private deathBudget = 10;
  private blastBudget = 10;
  private trailBudget = 8;

  constructor(private readonly scene: Phaser.Scene) {
    this.budgetTime = scene.time.now;
    this.createTextures();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  get activeCount(): number { return this.visuals.size; }

  /** x/y are the contact point. side changes debris direction, never game state. */
  impact(x: number, y: number, kind: ImpactKind, side: EffectSide = 'player'): void {
    if (!this.canRun(x, y) || !this.takeBudget(kind)) return;
    const reduced = this.reducedMotion;
    const direction = side === 'enemy' ? -1 : 1;

    if (kind === 'hit') {
      this.flash(x, y, reduced ? 11 : 18, 0.36, 95);
      this.sparks(x, y, reduced ? 1 : 3, direction, 0.45);
      if (!reduced) this.dust(x, y + 5, 1, 0.32, 0.26);
      return;
    }

    if (kind === 'death') {
      // Collapse into local dust and chips: no flash, expanding disc or camera shake.
      this.dust(x, y - 6, reduced ? 2 : 5, reduced ? 0.45 : 0.75, 0.44);
      if (!reduced) this.debris(x, y - 9, 3, direction, 0.5);
      return;
    }

    const meteor = kind === 'meteor';
    this.groundWave(x, y + 3, meteor ? 104 : 86, reduced);
    this.flash(x, y - 6, reduced ? 33 : meteor ? 78 : 65, 0.64, reduced ? 120 : 165);
    if (!reduced) this.flash(x, y - 4, meteor ? 33 : 27, 0.82, 85);
    this.dust(x, y, reduced ? 3 : meteor ? 7 : 5, reduced ? 0.7 : meteor ? 1.4 : 1.1, 0.62);
    this.sparks(x, y - 4, reduced ? 2 : meteor ? 6 : 5, direction, meteor ? 1.2 : 1);
    if (!reduced) this.debris(x, y - 2, meteor ? 4 : 3, direction, meteor ? 1.15 : 0.9);
  }

  /** A 300 ms visual flight, optionally delayed. It never triggers damage or impact(). */
  meteorTrail(x: number, y: number, delayMs = 0): void {
    if (!this.canRun(x, y) || this.reducedMotion || this.pending.size >= 10) return;
    this.refillBudgets();
    if (this.trailBudget < 1 || this.visuals.size > MAX_VISUALS - 4) return;
    this.trailBudget--;
    if (delayMs > 0) {
      const timer = this.scene.time.delayedCall(Phaser.Math.Clamp(delayMs, 0, 1500), () => {
        this.pending.delete(timer);
        if (this.canRun(x, y) && !this.reducedMotion) this.createTrail(x, y);
      });
      this.pending.add(timer);
    } else {
      this.createTrail(x, y);
    }
  }

  /** Safe to call explicitly; scene shutdown also disposes every visual, tween and timer. */
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.destroy, this);
    for (const timer of this.pending) timer.remove(false);
    this.pending.clear();
    for (const [visual, tween] of this.visuals) {
      tween?.remove();
      visual.destroy();
    }
    this.visuals.clear();
  }

  private get reducedMotion(): boolean {
    return this.scene.registry.get('settings')?.reducedMotion === true;
  }

  private canRun(x: number, y: number): boolean {
    return !this.disposed && Number.isFinite(x) && Number.isFinite(y)
      && this.scene.sys.isActive() && this.scene.time.timeScale > 0;
  }

  private refillBudgets(): void {
    // Clock.now is the frame timestamp; performance limits remain bounded even at 4× speed.
    const now = this.scene.time.now;
    const seconds = Phaser.Math.Clamp((now - this.budgetTime) / 1000, 0, 1);
    this.budgetTime = now;
    this.hitBudget = Math.min(14, this.hitBudget + seconds * 14);
    this.deathBudget = Math.min(10, this.deathBudget + seconds * 10);
    this.blastBudget = Math.min(10, this.blastBudget + seconds * 8);
    this.trailBudget = Math.min(8, this.trailBudget + seconds * 8);
  }

  private takeBudget(kind: ImpactKind): boolean {
    this.refillBudgets();
    const small = kind === 'hit' || kind === 'death';
    if (this.visuals.size >= (small ? SMALL_EFFECT_CEILING : MAX_VISUALS)) return false;
    if (kind === 'hit') {
      if (this.hitBudget < 1) return false;
      this.hitBudget--;
    } else if (kind === 'death') {
      if (this.deathBudget < 1) return false;
      this.deathBudget--;
    } else {
      if (this.blastBudget < 1) return false;
      this.blastBudget--;
    }
    return true;
  }

  private image(x: number, y: number, key: string, depth = DEPTH): Phaser.GameObjects.Image | undefined {
    if (this.visuals.size >= MAX_VISUALS || !this.scene.textures.exists(key)) return undefined;
    const visual = this.scene.add.image(x, y, key).setDepth(depth);
    this.visuals.set(visual, undefined);
    return visual;
  }

  private own<T extends Visual>(visual: T): T {
    visual.setDepth(DEPTH);
    this.visuals.set(visual, undefined);
    return visual;
  }

  private animate(visual: Visual, duration: number, update: (progress: number) => void): void {
    const tween = this.scene.tweens.addCounter({
      from: 0, to: 1, duration,
      onUpdate: value => {
        if (!visual.active || this.disposed) {
          value.remove();
          this.visuals.delete(visual);
          return;
        }
        update(value.getValue() ?? 0);
      },
      onComplete: () => {
        this.visuals.delete(visual);
        visual.destroy();
      }
    });
    this.visuals.set(visual, tween);
  }

  private flash(x: number, y: number, diameter: number, alpha: number, duration: number): void {
    const glow = this.image(x, y, LIGHT_TEXTURE, DEPTH + 3);
    if (!glow) return;
    glow.setTint(0xffce8b).setAlpha(alpha).setDisplaySize(diameter, diameter * 0.72);
    this.animate(glow, duration, t => {
      const size = diameter * (0.65 + t * 0.55);
      glow.setDisplaySize(size, size * 0.72).setAlpha(alpha * (1 - t) ** 2);
    });
  }

  private dust(x: number, y: number, count: number, strength: number, opacity: number): void {
    const colors = [0x7e715f, 0x9a8263, 0x6e6559, 0xae9575];
    for (let i = 0; i < count; i++) {
      const cloud = this.image(x, y, DUST_TEXTURE, DEPTH - 1);
      if (!cloud) break;
      const offsetX = Phaser.Math.FloatBetween(-12, 12) * strength;
      const driftX = Phaser.Math.FloatBetween(-42, 42) * strength;
      const rise = Phaser.Math.FloatBetween(14, 39) * strength;
      const size = Phaser.Math.FloatBetween(25, 40) * strength;
      const duration = Phaser.Math.Between(430, 730);
      const angle = Phaser.Math.FloatBetween(-0.5, 0.5);
      cloud.setTint(colors[i % colors.length]).setDisplaySize(size, size * 0.7)
        .setPosition(x + offsetX, y - i % 3 * 3).setAlpha(0).setRotation(angle);
      this.animate(cloud, duration, t => {
        const spread = 1 - (1 - t) ** 2;
        const bloom = 0.55 + spread * 0.8;
        cloud.setPosition(x + offsetX + driftX * spread, y - rise * spread)
          .setDisplaySize(size * bloom, size * bloom * 0.72)
          .setAlpha(Math.min(1, t * 9) * (1 - t) * opacity);
      });
    }
  }

  private sparks(x: number, y: number, count: number, direction: number, strength: number): void {
    for (let i = 0; i < count; i++) {
      if (this.visuals.size >= MAX_VISUALS) break;
      const length = Phaser.Math.FloatBetween(3, 7) * Math.max(0.65, strength);
      const spark = this.own(this.scene.add.rectangle(x, y, length, 1.6, i % 3 === 0 ? 0xefc78b : 0xcf8c45));
      const duration = Phaser.Math.Between(170, 330);
      const vx = (Phaser.Math.FloatBetween(-125, 125) + direction * 45) * strength;
      const vy = Phaser.Math.FloatBetween(-145, -40) * strength;
      this.animate(spark, duration, t => {
        const elapsed = t * duration / 1000;
        spark.setPosition(x + vx * elapsed, y + vy * elapsed + 270 * elapsed ** 2)
          .setRotation(Math.atan2(vy + 540 * elapsed, vx)).setAlpha((1 - t) ** 0.65)
          .setScale(1 - t * 0.65, 1 - t * 0.3);
      });
    }
  }

  private debris(x: number, y: number, count: number, direction: number, strength: number): void {
    for (let i = 0; i < count; i++) {
      if (this.visuals.size >= MAX_VISUALS) break;
      const size = Phaser.Math.FloatBetween(2, 5) * strength;
      const shard = this.own(this.scene.add.triangle(x, y, 0, 0, size * 1.6, size * 0.25, size * 0.4, size,
        i % 2 ? 0xa18a65 : 0x514c40));
      const duration = Phaser.Math.Between(290, 470);
      const vx = (Phaser.Math.FloatBetween(-100, 100) + direction * 24) * strength;
      const vy = Phaser.Math.FloatBetween(-120, -70) * strength;
      const rotation = Phaser.Math.FloatBetween(-5, 5);
      this.animate(shard, duration, t => {
        const elapsed = t * duration / 1000;
        shard.setPosition(x + vx * elapsed, y + vy * elapsed + 285 * elapsed ** 2)
          .setRotation(t * rotation).setAlpha(Math.min(1, (1 - t) * 2.6));
      });
    }
  }

  private groundWave(x: number, y: number, diameter: number, reduced: boolean): void {
    if (this.visuals.size >= MAX_VISUALS) return;
    const wave = this.own(this.scene.add.ellipse(x, y, diameter, diameter * 0.18, 0x000000, 0)
      .setStrokeStyle(1.2, 0xc7ab7d, 0.42));
    wave.setDepth(DEPTH - 2).setScale(reduced ? 0.7 : 0.3);
    this.animate(wave, reduced ? 170 : 350, t => {
      wave.setScale(reduced ? 0.7 : 0.3 + (1 - (1 - t) ** 2) * 0.7).setAlpha((1 - t) ** 1.6);
    });
  }

  private createTrail(x: number, y: number): void {
    if (this.visuals.size > MAX_VISUALS - 3) return;
    const startX = x - Phaser.Math.Between(120, 210);
    const startY = Math.max(86, y - 380);
    const angle = Math.atan2(y - startY, x - startX);
    const glow = this.image(startX, startY, LIGHT_TEXTURE, DEPTH + 1);
    if (glow) {
      glow.setTint(0xeab678).setDisplaySize(42, 24).setRotation(angle);
      this.animate(glow, 300, t => glow.setPosition(Phaser.Math.Linear(startX, x, t), Phaser.Math.Linear(startY, y, t))
        .setAlpha(0.5 * Math.min(1, t * 6) * Math.min(1, (1 - t) * 8)));
    }
    const tail = this.own(this.scene.add.triangle(startX, startY, 0, 5, 52, 0, 52, 10, 0xc68b50, 0.3)
      .setOrigin(1, 0.5).setRotation(angle));
    this.animate(tail, 300, t => tail.setPosition(Phaser.Math.Linear(startX, x, t), Phaser.Math.Linear(startY, y, t))
      .setScale(0.6 + t * 0.4, 1).setAlpha(Math.min(1, t * 7) * Math.min(1, (1 - t) * 8) * 0.3));
    const stone = this.image(startX, startY, 'rock', DEPTH + 2);
    if (stone) {
      // Boot's rock canvas is 256×128 with generous transparent margins.
      stone.setDisplaySize(38, 19).setTint(0x9f7958);
      this.animate(stone, 300, t => stone.setPosition(Phaser.Math.Linear(startX, x, t), Phaser.Math.Linear(startY, y, t))
        .setRotation(t * 3).setAlpha(Math.min(1, (1 - t) * 10)));
    }
  }

  private createTextures(): void {
    for (const key of [DUST_TEXTURE, LIGHT_TEXTURE]) {
      if (this.scene.textures.exists(key)) continue;
      const texture = this.scene.textures.createCanvas(key, 64, 64);
      if (!texture) continue;
      const context = texture.context;
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(key === DUST_TEXTURE ? 0.4 : 0.12, key === DUST_TEXTURE ? 'rgba(255,255,255,0.64)' : 'rgba(255,255,255,0.9)');
      gradient.addColorStop(0.75, 'rgba(255,255,255,0.12)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      texture.refresh();
    }
  }
}
