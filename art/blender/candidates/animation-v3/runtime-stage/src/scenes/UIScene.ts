import Phaser from 'phaser';
import { consumeKeyboardEvent } from '../ui/keyboard';
import type { EnemyWavePlan } from '../game/enemyWaves';
import type { Epoch, TurretType, UnitType } from '../game/types';
import epochsData from '../../data/epochs.json';
import unitsData from '../../data/units.json';
import turretsData from '../../data/turrets.json';
import { epochNames, unitNames, unitRoles, turretNames, turretTexture } from '../ui/catalog';

const C = { ink: 0x09141d, panel: 0x101f2a, card: 0x172b36, hover: 0x25414b, border: 0x354a53,
  gold: 0xd8b574, teal: 0x78b9af, red: 0xdb8d80, text: '#eee7d6', muted: '#99abae' };
type Card = { bg: Phaser.GameObjects.Rectangle; image: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text;
  price: Phaser.GameObjects.Text; id: string; index: number };
type Wave = { number: number; phase: 'prepare' | 'assault' | 'respite'; remainingMs: number;
  enemyEpoch: string; incomePerSecond: number; elapsedMs: number; army: number; armyLimit: number;
  plan?: EnemyWavePlan; attempted?: number; arrived?: number };
type Result = { winner: 'player' | 'enemy'; elapsedMs: number; kills: number; epoch: string };

export class UIScene extends Phaser.Scene {
  private gold = 0;
  private xp = 0;
  private currentEpoch: Epoch = epochsData[0];
  private paused = false;
  private gameOver = false;
  private epochReady = false;
  private selectedTurretIndex = -1;
  private units = unitsData as UnitType[];
  private turrets = turretsData as TurretType[];
  private unitCards: Card[] = [];
  private turretCards: Card[] = [];
  private goldText!: Phaser.GameObjects.Text;
  private incomeText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private epochText!: Phaser.GameObjects.Text;
  private enemyEpochText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private waveDetail!: Phaser.GameObjects.Text;
  private scout!: Phaser.GameObjects.Container;
  private scoutStatus!: Phaser.GameObjects.Text;
  private scoutWave?: Wave;
  private scoutPinned = false;
  private scoutHover = false;
  private scoutRevision = '';
  private timerText!: Phaser.GameObjects.Text;
  private armyText!: Phaser.GameObjects.Text;
  private evolveButton!: Phaser.GameObjects.Rectangle;
  private evolveText!: Phaser.GameObjects.Text;
  private abilityButtons: Phaser.GameObjects.Rectangle[] = [];
  private abilityTexts: Phaser.GameObjects.Text[] = [];
  private cooldowns = [0, 0];
  private speed = 1;
  private speedButtons: Phaser.GameObjects.Rectangle[] = [];
  private feedback!: Phaser.GameObjects.Container;
  private feedbackText!: Phaser.GameObjects.Text;
  private feedbackTimer?: Phaser.Time.TimerEvent;
  private tooltip!: Phaser.GameObjects.Container;
  private tooltipTitle!: Phaser.GameObjects.Text;
  private tooltipRole!: Phaser.GameObjects.Text;
  private tooltipStats!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private overlayButtons: Array<{ bg: Phaser.GameObjects.Rectangle; activate: () => void }> = [];
  private overlayFocus = 0;
  private hp: Record<string, { fill: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }> = {};

  constructor() { super({ key: 'UIScene' }); }

  create(): void {
    this.gold = 0; this.xp = 0; this.currentEpoch = epochsData[0]; this.paused = false; this.gameOver = false;
    this.epochReady = false; this.selectedTurretIndex = -1; this.unitCards = []; this.turretCards = [];
    this.abilityButtons = []; this.abilityTexts = []; this.speedButtons = []; this.cooldowns = [0, 0];
    this.hp = {}; this.overlay = undefined; this.overlayButtons = []; this.overlayFocus = 0; this.speed = 1;
    this.scoutWave = undefined; this.scoutPinned = false; this.scoutHover = false; this.scoutRevision = '';
    this.buildHUD(); this.listenToBattle(); this.refreshEpoch();
    const keyboard = (event: KeyboardEvent) => this.onKey(event);
    this.input.keyboard?.on('keydown', keyboard);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.input.keyboard?.off('keydown', keyboard); this.feedbackTimer?.remove(); });
  }

  private text(x: number, y: number, value: string, size = 16, color = C.text): Phaser.GameObjects.Text {
    return this.add.text(x, y, value, { fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: `${size}px`, color });
  }
  private rect(x: number, y: number, width: number, height: number, color: number, alpha = 1): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(x, y, width, height, color, alpha).setOrigin(0);
  }
  private button(x: number, y: number, w: number, h: number, action: () => void): Phaser.GameObjects.Rectangle {
    const button = this.rect(x, y, w, h, C.card).setStrokeStyle(1, C.border).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => { if (!this.gameOver && !this.paused) button.setFillStyle(C.hover); });
    button.on('pointerout', () => this.refreshStates()); button.on('pointerdown', action);
    return button;
  }

  private buildHUD(): void {
    this.rect(0, 0, 1280, 82, C.ink, 0.97); this.rect(0, 81, 1280, 1, C.gold, 0.35);
    this.add.graphics().lineStyle(1.5, C.gold).strokeTriangle(24, 49, 40, 20, 56, 49).lineBetween(31, 39, 49, 39);
    this.text(68, 18, 'AGE OF MAX', 15, '#d8b574').setLetterSpacing(2);
    this.epochText = this.text(68, 43, 'Steinzeit', 18);
    this.rect(226, 20, 1, 43, C.border);
    this.text(247, 14, 'GOLD', 11, C.muted).setLetterSpacing(2);
    this.goldText = this.text(246, 31, '0', 25, '#e6c58b').setFontStyle('bold');
    this.incomeText = this.text(335, 42, '+0 / s', 12, C.muted);
    this.text(414, 14, 'FORTSCHRITT', 11, C.muted).setLetterSpacing(2);
    this.xpText = this.text(414, 32, '0 EP', 15);
    this.rect(414, 59, 174, 3, C.border); this.xpFill = this.rect(414, 59, 1, 3, C.gold);
    this.rect(619, 20, 1, 43, C.border);
    this.waveText = this.text(647, 16, 'VORBEREITUNG', 13, '#d8b574').setLetterSpacing(1);
    this.waveDetail = this.text(647, 42, 'Front und Fernkampf kombinieren.', 13, C.muted);
    this.scout = this.add.container(630, 89).setDepth(180).setVisible(false).setName('wave-intel-panel');
    const scoutTarget = this.rect(640, 9, 306, 59, C.ink, 0).setInteractive({ useHandCursor: true }).setName('wave-intel-toggle');
    scoutTarget.on('pointerover', () => { this.scoutHover = true; this.refreshScoutVisibility(); });
    scoutTarget.on('pointerout', () => { this.scoutHover = false; this.refreshScoutVisibility(); });
    scoutTarget.on('pointerdown', () => this.setScoutPinned(!this.scoutPinned));
    this.rect(918, 17, 18, 18, C.card).setStrokeStyle(1, C.border);
    this.text(927, 26, 'I', 11, '#d8b574').setOrigin(0.5);
    this.timerText = this.text(1001, 32, '00:00', 16, C.muted).setOrigin(1, 0);
    [1, 2, 4].forEach((speed, index) => {
      const x = 1025 + index * 49;
      this.speedButtons.push(this.button(x, 23, 43, 34, () => { if (!this.paused && !this.gameOver) this.events.emit('setSimulationSpeed', speed); }));
      this.text(x + 21.5, 29, `${speed}×`, 15).setOrigin(0.5, 0);
    });
    this.button(1190, 23, 65, 34, () => this.requestPause()).setName('pause-button');
    this.text(1222, 29, 'Pause', 13).setOrigin(0.5, 0);
    for (const [side, x] of [['player', 24], ['enemy', 1086]] as const) {
      this.rect(x, 100, 170, 44, C.ink, 0.72);
      const heading = this.text(x + 10, 105, side === 'player' ? 'DEINE FESTUNG' : 'GEGNER · STEINZEIT', 10, C.muted).setLetterSpacing(0.6);
      if (side === 'enemy') this.enemyEpochText = heading;
      const value = this.text(x + 160, 121, '—', 11).setOrigin(1, 0);
      this.rect(x + 10, 137, 150, 3, C.border);
      const fill = this.rect(x + 10, 137, 150, 3, side === 'player' ? C.teal : C.red);
      this.hp[side] = { fill, text: value };
    }
    this.rect(0, 552, 1280, 168, C.ink, 0.98); this.rect(0, 552, 1280, 1, C.gold, 0.45);
    this.text(24, 565, 'ARMEE REKRUTIEREN', 11, C.muted).setLetterSpacing(2);
    this.armyText = this.text(586, 565, '0 / 24', 11, C.muted).setOrigin(1, 0);
    this.text(625, 565, 'VERTEIDIGUNG', 11, C.muted).setLetterSpacing(2);
    this.text(939, 565, 'KOMMANDO', 11, C.muted).setLetterSpacing(2);
    this.rect(606, 576, 1, 125, C.border); this.rect(919, 576, 1, 125, C.border);
    for (let i = 0; i < 4; i++) this.unitCards.push(this.makeCard(24 + i * 143, 590, 132, ['Q', 'W', 'E', 'R'][i], false, i));
    for (let i = 0; i < 3; i++) this.turretCards.push(this.makeCard(625 + i * 96, 590, 86, ['A', 'S', 'D'][i], true, i));
    this.evolveButton = this.button(939, 590, 316, 41, () => this.advanceEpoch());
    this.evolveText = this.text(1097, 600, 'Weiterentwickeln  ·  U', 14, '#d8b574').setOrigin(0.5, 0);
    ['Meteorregen  ·  F', 'Artillerie  ·  G'].forEach((name, i) => {
      const x = 939 + i * 163;
      this.abilityButtons.push(this.button(x, 641, 153, 61, () => this.useAbility(i)));
      this.text(x + 76.5, 649, name, 13).setOrigin(0.5, 0);
      this.abilityTexts.push(this.text(x + 76.5, 677, 'BEREIT', 11, '#92c9b7').setOrigin(0.5, 0));
    });
    this.feedbackText = this.text(0, 0, '', 14).setOrigin(0.5);
    const feedbackBG = this.add.rectangle(0, 0, 620, 39, C.ink, 0.93).setStrokeStyle(1, C.gold, 0.5);
    this.feedback = this.add.container(640, 167, [feedbackBG, this.feedbackText]).setDepth(50).setVisible(false);
    const tooltipBG = this.rect(0, 0, 406, 92, C.ink, 0.98).setStrokeStyle(1, C.gold, 0.65);
    this.tooltipTitle = this.text(16, 10, '', 17, '#e6c58b'); this.tooltipRole = this.text(16, 36, '', 12);
    this.tooltipStats = this.text(16, 63, '', 12, C.muted);
    this.tooltip = this.add.container(24, 452, [tooltipBG, this.tooltipTitle, this.tooltipRole, this.tooltipStats]).setDepth(100).setVisible(false);
    this.updateSpeed(1);
  }

  private makeCard(x: number, y: number, width: number, key: string, tower: boolean, slot: number): Card {
    const bg = this.button(x, y, width, 112, () => tower ? this.selectTower(slot) : this.recruit(slot));
    const image = this.add.image(x + width / 2, y + 55, tower ? 'stone-tower-1' : 'clubman', 0).setDisplaySize(78, 78);
    this.text(x + 8, y + 6, key, 11, C.muted);
    const price = this.text(x + width - 8, y + 6, '', 12, '#e6c58b').setOrigin(1, 0);
    const name = this.text(x + width / 2, y + 91, '', tower ? 11 : 13).setOrigin(0.5, 0);
    const card = { bg, image, name, price, id: '', index: -1 };
    bg.on('pointerover', () => this.showTooltip(card, tower)); bg.on('pointerout', () => this.tooltip.setVisible(false));
    return card;
  }

  private listenToBattle(): void {
    const listeners: Array<[string, (...args: any[]) => void]> = [];
    const on = (event: string, fn: (...args: any[]) => void) => { this.events.on(event, fn); listeners.push([event, fn]); };
    on('updateGold', (gold: number) => { this.gold = gold; this.goldText.setText(Math.floor(gold).toLocaleString('de-DE')); this.refreshStates(); });
    on('updateXP', (xp: number, threshold: number) => { this.xp = xp; this.currentEpoch = { ...this.currentEpoch, xpToNext: threshold }; this.updateXP(); });
    on('updateEpoch', (epoch: Epoch) => { this.currentEpoch = { ...epoch }; this.selectedTurretIndex = -1; this.tooltip.setVisible(false); this.refreshEpoch(); });
    on('updateEpochReady', (ready: boolean) => { this.epochReady = ready; this.refreshStates(); });
    on('updateBaseHP', (hp: number, max: number, side: string) => {
      const bar = this.hp[side]; if (!bar) return;
      bar.text.setText(`${Math.max(0, Math.ceil(hp))} / ${max}`); bar.fill.width = 150 * Phaser.Math.Clamp(hp / max, 0, 1);
    });
    on('updateWave', (wave: Wave) => this.updateWave(wave));
    on('updateSimulationSpeed', (speed: number) => this.updateSpeed(speed));
    on('updatePaused', (paused: boolean) => this.setPaused(paused));
    on('updateRainingRocksCooldown', (remaining: number) => this.updateCooldown(0, remaining));
    on('updateArtilleryStrikeCooldown', (remaining: number) => this.updateCooldown(1, remaining));
    on('turretPlacementFailed', (message: string) => this.showFeedback(message));
    on('feedback', (message: string) => this.showFeedback(message));
    on('commandFailed', (message: string) => this.showFeedback(message));
    on('selectTurret', (index: number) => { this.selectedTurretIndex = index; this.refreshStates(); });
    on('gameOver', (result: Result) => this.showResult(result));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => listeners.forEach(([event, fn]) => this.events.off(event, fn)));
  }

  private refreshEpoch(): void {
    this.epochText.setText(epochNames[this.currentEpoch.id] || this.currentEpoch.name);
    const available = this.units.filter(unit => unit.epoch === this.currentEpoch.id);
    this.unitCards.forEach((card, index) => {
      const unit = available[index]; if (!unit) return;
      card.id = unit.id; card.index = this.units.indexOf(unit);
      card.image.setTexture(unit.id, this.textures.get(unit.id).has('portrait') ? 'portrait' : 0);
      card.image.setScale(Math.min(108 / card.image.width, 70 / card.image.height)).setY(card.bg.y + 54);
      card.name.setFontSize(13).setText(unitNames[unit.id] || unit.name); if (card.name.width > 123) card.name.setFontSize(11);
      card.price.setText(`${unit.goldCost}`);
    });
    const towers = this.turrets.filter(tower => tower.epoch === this.currentEpoch.id);
    this.turretCards.forEach((card, index) => {
      const tower = towers[index]; if (!tower) return;
      card.id = tower.id; card.index = this.turrets.indexOf(tower);
      card.image.setTexture(turretTexture(tower.epoch, index)).setDisplaySize(74, 74);
      card.name.setFontSize(11).setText(turretNames[tower.id] || tower.name); if (card.name.width > 78) card.name.setFontSize(9);
      card.price.setText(`${tower.goldCost}`);
    });
    this.epochReady = this.currentEpoch.xpToNext > 0 && this.xp >= this.currentEpoch.xpToNext;
    this.updateXP(); this.refreshStates(); this.updateCooldown(1, this.cooldowns[1]);
  }

  private updateXP(): void {
    const threshold = this.currentEpoch.xpToNext;
    this.xpText.setText(threshold > 0 ? `${Math.floor(this.xp)} / ${threshold} EP` : 'Höchste Epoche erreicht');
    this.xpFill.width = threshold > 0 ? 174 * Phaser.Math.Clamp(this.xp / threshold, 0, 1) : 174;
  }

  private refreshStates(): void {
    for (const [cards, database] of [[this.unitCards, this.units], [this.turretCards, this.turrets]] as const) cards.forEach(card => {
      const item = database[card.index]; if (!item) return;
      const affordable = this.gold >= item.goldCost, selected = cards === this.turretCards && card.index === this.selectedTurretIndex;
      card.bg.setFillStyle(selected ? 0x34453e : affordable ? C.card : 0x101d27).setStrokeStyle(selected ? 2 : 1, selected ? C.gold : C.border);
      card.image.setAlpha(affordable ? 1 : 0.42); card.price.setColor(affordable ? '#e6c58b' : '#9e8178');
    });
    if (this.evolveButton) {
      this.evolveButton.setFillStyle(this.epochReady ? 0x4b4532 : C.card).setStrokeStyle(1, this.epochReady ? C.gold : C.border);
      this.evolveText.setText(this.currentEpoch.xpToNext <= 0 ? 'Höchste Epoche erreicht' : this.epochReady ? 'Neue Epoche freischalten  ·  U' : 'Weiterentwickeln  ·  U');
      this.evolveText.setColor(this.epochReady ? '#f0d8a9' : '#9baaa9');
    }
    this.abilityButtons.forEach((button, i) => button.setFillStyle(this.cooldowns[i] <= 0 ? C.card : 0x101d27));
    this.updateSpeed(this.speed);
  }

  private recruit(slot: number): void {
    if (this.paused || this.gameOver) return;
    const unit = this.units[this.unitCards[slot]?.index]; if (!unit) return;
    if (this.gold < unit.goldCost) { this.showFeedback(`Noch ${Math.ceil(unit.goldCost - this.gold)} Gold für ${unitNames[unit.id]} nötig.`); return; }
    this.events.emit('spawnUnit', unit.id);
  }
  private selectTower(slot: number): void {
    if (this.paused || this.gameOver) return;
    const card = this.turretCards[slot], tower = this.turrets[card?.index]; if (!tower) return;
    if (this.gold < tower.goldCost) { this.showFeedback(`Für ${turretNames[tower.id]} fehlen ${Math.ceil(tower.goldCost - this.gold)} Gold.`); return; }
    const index = card.index === this.selectedTurretIndex ? -1 : card.index;
    this.events.emit('selectTurret', index);
    this.showFeedback(index >= 0 ? `${turretNames[tower.id]}: Wähle einen markierten Bauplatz. Escape bricht ab.` : 'Bauauswahl aufgehoben.');
  }
  private advanceEpoch(): void {
    if (this.paused || this.gameOver || this.currentEpoch.xpToNext <= 0) return;
    if (!this.epochReady) { this.showFeedback(`Noch ${Math.max(0, this.currentEpoch.xpToNext - Math.floor(this.xp))} Erfahrung bis zur nächsten Epoche.`); return; }
    this.events.emit('advanceEpoch');
  }
  private useAbility(index: number): void {
    if (this.paused || this.gameOver) return;
    if (index === 1 && ['stone', 'castle'].includes(this.currentEpoch.id)) { this.showFeedback('Artillerie wird ab der Renaissance verfügbar.'); return; }
    if (this.cooldowns[index] > 0) { this.showFeedback(`In ${Math.ceil(this.cooldowns[index] / 1000)} Sekunden wieder bereit.`); return; }
    this.events.emit(index === 0 ? 'useRainingRocks' : 'useArtilleryStrike');
  }
  private updateCooldown(index: number, remaining: number): void {
    this.cooldowns[index] = remaining;
    const locked = index === 1 && ['stone', 'castle'].includes(this.currentEpoch.id);
    this.abilityTexts[index].setText(locked ? 'AB RENAISSANCE' : remaining > 0 ? `${Math.ceil(remaining / 1000)} s` : 'BEREIT')
      .setColor(locked || remaining > 0 ? C.muted : '#92c9b7');
    this.abilityButtons[index].setFillStyle(locked || remaining > 0 ? 0x101d27 : C.card);
  }
  private setScoutPinned(pinned: boolean): void {
    if (this.paused || this.gameOver) return;
    this.scoutPinned = pinned;
    if (!pinned) this.scoutHover = false;
    this.refreshScoutVisibility();
  }
  private refreshScoutVisibility(): void {
    this.scout?.setVisible(!this.paused && !this.gameOver && !!this.scoutWave?.plan && (this.scoutPinned || this.scoutHover));
  }
  private rebuildScout(plan: EnemyWavePlan): void {
    this.scout.removeAll(true);
    const background = this.rect(0, 0, 344, 240, C.ink, 0.98).setStrokeStyle(1, C.gold, 0.7).setInteractive();
    const title = this.text(16, 12, plan.title, 18, '#e6c58b');
    const subtitle = this.text(16, 38, `Welle ${plan.number} · ${epochNames[plan.epoch]} · ${plan.unitIds.length} Einheiten`, 11, C.muted);
    const close = this.rect(310, 10, 24, 24, C.card).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.setScoutPinned(false));
    this.scout.add([background, title, subtitle, close, this.text(322, 22, '×', 18, C.muted).setOrigin(0.5)]);
    const startX = (344 - plan.roster.length * 72 - (plan.roster.length - 1) * 7) / 2;
    plan.roster.forEach((entry, index) => {
      const x = startX + index * 79;
      const card = this.rect(x, 62, 72, 82, C.card).setStrokeStyle(1, C.border);
      const key = `${entry.id}-enemy`;
      const texture = this.textures.get(key);
      const portrait = this.add.image(x + 36, 92, key, texture.has('portrait') ? 'portrait' : 0);
      portrait.setScale(Math.min(57 / portrait.width, 57 / portrait.height));
      const count = this.text(x + 65, 65, `${entry.count}×`, 12, '#e6c58b').setOrigin(1, 0);
      const name = this.text(x + 36, 127, unitNames[entry.id] || entry.id, 11).setOrigin(0.5, 0);
      if (name.width > 68) name.setFontSize(9);
      this.scout.add([card, portrait, count, name]);
    });
    const advice = this.text(16, 158, plan.advice, 12, C.text).setWordWrapWidth(310);
    this.scoutStatus = this.text(16, 216, '', 11, C.muted);
    this.scout.add([this.rect(16, 150, 312, 1, C.border), advice, this.scoutStatus]);
  }

  private updateWave(wave: Wave): void {
    const seconds = Math.max(0, Math.ceil(wave.remainingMs / 1000));
    this.scoutWave = wave;
    const plan = wave.plan;
    this.waveText.setText(plan ? `${wave.phase === 'assault' ? 'ANGRIFF' : 'WELLE'} ${plan.number} · ${plan.title}` : `WELLE ${wave.number}`)
      .setFontSize(12).setLetterSpacing(0.3).setColor(wave.phase === 'assault' ? '#e0afa1' : '#d8b574');
    if (this.waveText.width > 266) this.waveText.setFontSize(11);
    this.waveDetail.setText(wave.phase === 'assault' ? `Noch ${seconds} s · Aufklärung mit I` : `Angriff in ${seconds} s · Aufklärung mit I`);
    if (plan) {
      const revision = `${plan.number}:${plan.epoch}:${plan.tactic}`;
      if (revision !== this.scoutRevision) { this.scoutRevision = revision; this.rebuildScout(plan); }
      this.scoutStatus.setText(wave.phase === 'assault'
        ? `Geplant: ${plan.unitIds.length} · Eingetroffen: ${wave.arrived ?? 0} · Aufklärung: I`
        : `Geplante Aufstellung · Angriff in ${seconds} s`);
    }
    this.refreshScoutVisibility();
    this.enemyEpochText.setText(`GEGNER · ${(epochNames[wave.enemyEpoch] || wave.enemyEpoch).toUpperCase()}`);
    this.incomeText.setText(`+${wave.incomePerSecond.toLocaleString('de-DE', { maximumFractionDigits: 1 })} / s`);
    this.timerText.setText(this.formatTime(wave.elapsedMs)); this.armyText.setText(`${wave.army} / ${wave.armyLimit}`);
  }
  private updateSpeed(speed: number): void {
    this.speed = speed;
    this.speedButtons.forEach((button, index) => button.setFillStyle([1, 2, 4][index] === speed ? 0x3f4436 : C.card)
      .setStrokeStyle(1, [1, 2, 4][index] === speed ? C.gold : C.border));
  }
  private showTooltip(card: Card, tower: boolean): void {
    if (this.gameOver || this.paused || card.index < 0) return;
    const item = tower ? this.turrets[card.index] : this.units[card.index];
    this.tooltip.setPosition(Phaser.Math.Clamp(card.bg.x, 24, 850), 452).setVisible(true);
    this.tooltipTitle.setText((tower ? turretNames : unitNames)[item.id] || item.name);
    this.tooltipRole.setText(tower ? 'Bauplatz wählen. Gebaute Türme: verbessern oder verkaufen.' : unitRoles[item.id]);
    this.tooltipStats.setText(`${item.hp} LP   ·   ${item.damage} Schaden   ·   ${item.range} Reichweite   ·   ${item.attackSpeed} s`);
  }
  private showFeedback(message: string): void {
    if (this.gameOver) return;
    const translated = message.replace('Not enough gold!', 'Nicht genug Gold.');
    this.feedbackText.setText(translated).setFontSize(translated.length > 84 ? 12 : 14); this.feedback.setVisible(true);
    this.feedbackTimer?.remove(); this.feedbackTimer = this.time.delayedCall(3600, () => this.feedback.setVisible(false));
  }

  private requestPause(): void { if (!this.gameOver) this.events.emit('togglePause'); }
  private setPaused(paused: boolean): void {
    if (this.gameOver) return;
    this.paused = paused; this.tooltip.setVisible(false); this.overlay?.destroy(); this.overlay = undefined;
    if (paused) { this.scoutPinned = false; this.scoutHover = false; }
    this.refreshScoutVisibility();
    this.overlayButtons = []; this.overlayFocus = 0;
    if (!paused) return;
    this.overlay = this.makeOverlay('Eine Pause für deinen Plan.', 'PAUSIERT', 'Die Schlacht wartet auf dich.');
    this.overlayButton(514, 392, 252, 'Weiterspielen', () => this.requestPause());
    this.overlayButton(514, 448, 252, 'Zum Hauptmenü', () => this.returnToMenu());
    this.overlay.add(this.text(640, 538, 'Leertaste oder Escape zum Fortsetzen', 12, C.muted).setOrigin(0.5));
  }
  private makeOverlay(title: string, eyebrow: string, description: string): Phaser.GameObjects.Container {
    this.overlayButtons = []; this.overlayFocus = 0;
    const blocker = this.rect(0, 0, 1280, 720, 0x03090f, 0.82).setInteractive();
    const panel = this.rect(354, 173, 572, 394, C.panel).setStrokeStyle(1, C.gold, 0.6);
    const line = this.rect(608, 205, 64, 2, C.gold);
    const top = this.text(640, 229, eyebrow, 12, '#d8b574').setLetterSpacing(3).setOrigin(0.5);
    const heading = this.text(640, 277, title, 27).setOrigin(0.5);
    const sub = this.text(640, 326, description, 14, C.muted).setOrigin(0.5);
    const controls = this.text(640, 511, '↑ / ↓ oder Tab: wählen  ·  Enter: bestätigen', 12, C.muted).setOrigin(0.5);
    return this.add.container(0, 0, [blocker, panel, line, top, heading, sub, controls]).setDepth(500);
  }
  private focusOverlay(index: number): void {
    if (!this.overlay?.active || !this.overlayButtons.length) return;
    this.overlayFocus = Phaser.Math.Wrap(index, 0, this.overlayButtons.length);
    this.overlayButtons.forEach(({ bg }, position) => {
      const focused = position === this.overlayFocus;
      bg.setFillStyle(focused ? C.hover : C.card).setStrokeStyle(focused ? 2 : 1, C.gold, focused ? 1 : 0.6);
    });
  }
  private overlayButton(x: number, y: number, width: number, title: string, action: () => void): void {
    const bg = this.rect(x, y, width, 43, C.card).setInteractive({ useHandCursor: true });
    const index = this.overlayButtons.length;
    const activate = () => {
      if (!this.overlay?.active || !bg.active || !bg.input?.enabled) return;
      this.focusOverlay(index);
      // Scene transitions are queued; reject a second activation until that transition runs.
      this.overlayButtons.forEach(button => button.bg.disableInteractive());
      action();
    };
    bg.on('pointerover', () => this.focusOverlay(index)).on('pointerdown', activate);
    this.overlayButtons.push({ bg, activate });
    this.overlay?.add([bg, this.text(x + width / 2, y + 21.5, title, 15).setOrigin(0.5)]);
    this.focusOverlay(this.overlayFocus);
  }
  private showResult(result: Result): void {
    this.gameOver = true; this.paused = false; this.tooltip.setVisible(false); this.feedback.setVisible(false); this.overlay?.destroy();
    this.scoutPinned = false; this.scoutHover = false; this.refreshScoutVisibility();
    const won = result?.winner === 'player';
    this.overlay = this.makeOverlay(won ? 'Dein Reich besteht.' : 'Ein Reich fällt. Ein neues wartet.', won ? 'SIEG' : 'NIEDERLAGE',
      `${this.formatTime(result?.elapsedMs || 0)} gespielt  ·  ${result?.kills || 0} Gegner besiegt  ·  ${epochNames[this.currentEpoch.id]}`);
    this.overlayButton(514, 392, 252, 'Noch eine Schlacht', () => this.restart());
    this.overlayButton(514, 448, 252, 'Zum Hauptmenü', () => this.returnToMenu());
    this.overlay.add(this.text(640, 538, won ? 'Andere Taktik. Neue Herausforderung.' : 'Tipp: Halte Fernkämpfer hinter einer starken Front.', 12, C.muted).setOrigin(0.5));
  }
  private restart(): void { this.scene.stop('BattleScene'); this.scene.restart(); this.scene.launch('BattleScene'); }
  private returnToMenu(): void { this.scene.stop('BattleScene'); this.scene.start('MenuScene'); }
  private onKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const pauseKey = event.code === 'Space' || event.code === 'Escape';
    const overlayOpen = !!this.overlay?.active && (this.paused || this.gameOver);
    const overlayKey = overlayOpen && ['arrowup', 'arrowdown', 'tab', 'enter'].includes(key);
    if (!pauseKey && !overlayKey && !['q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'g', 'u', 'i', '1', '2', '3'].includes(key)) return;
    if (!consumeKeyboardEvent(event) || event.repeat) return;
    if (overlayOpen) {
      if (overlayKey) {
        event.preventDefault();
        if (key === 'enter') this.overlayButtons[this.overlayFocus]?.activate();
        else this.focusOverlay(this.overlayFocus + (key === 'arrowup' || (key === 'tab' && event.shiftKey) ? -1 : 1));
      } else if (pauseKey) {
        event.preventDefault();
        if (this.paused) this.requestPause();
      }
      return;
    }
    if (this.gameOver) return;
    if (event.code === 'Escape' && this.selectedTurretIndex >= 0 && !this.paused) { this.events.emit('selectTurret', -1); this.showFeedback('Bauauswahl aufgehoben.'); return; }
    if (event.code === 'Escape' && this.scoutPinned) { event.preventDefault(); this.setScoutPinned(false); return; }
    if (pauseKey) { event.preventDefault(); this.requestPause(); return; }
    if (this.paused) return;
    if (key === 'i') { event.preventDefault(); this.setScoutPinned(!this.scoutPinned); return; }
    const unit = ['q', 'w', 'e', 'r'].indexOf(key), tower = ['a', 's', 'd'].indexOf(key);
    if (unit >= 0) { this.recruit(unit); return; } if (tower >= 0) { this.selectTower(tower); return; }
    if (key === 'f') this.useAbility(0); if (key === 'g') this.useAbility(1); if (key === 'u') this.advanceEpoch();
    if (['1', '2', '3'].includes(key)) this.events.emit('setSimulationSpeed', [1, 2, 4][Number(key) - 1]);
  }
  private formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
}
