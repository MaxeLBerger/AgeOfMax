import Phaser from 'phaser';
import type { Economy, Epoch, TurretType } from '../game/types';
import turretsData from '../../data/turrets.json';

export class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private epochText!: Phaser.GameObjects.Text;
  private baseHpText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private rainingRocksButton!: Phaser.GameObjects.Rectangle;
  private rainingRocksCooldownText!: Phaser.GameObjects.Text;
  private artilleryStrikeButton!: Phaser.GameObjects.Rectangle;
  private artilleryStrikeCooldownText!: Phaser.GameObjects.Text;
  private economy: Economy = { gold: 100, xp: 0, goldPerTick: 10, tickInterval: 3000 };
  private currentEpoch: Epoch = { id: 'stone', name: 'Stone Age', xpToNext: 100, unlocks: { units: [], turrets: [] } };
  private turretsDatabase: TurretType[] = turretsData as TurretType[];

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    console.log('UIScene: Initializing HUD...');
    this.createHUD();
    this.listenToBattleEvents();
  }

  private createHUD(): void {
    // Gold display with icon - hohe Depth für UI
    const goldIcon = this.add.image(15, 30, 'gold-coin').setScale(0.4);
    goldIcon.setDepth(1000); // Sehr hohe Depth
    this.goldText = this.add.text(35, 20, `Gold: ${this.economy.gold}`, { fontSize: '24px', color: '#ffd700' });
    this.goldText.setDepth(1000);
    
    // XP display with icon - hohe Depth für UI
    const xpIcon = this.add.image(15, 60, 'xp-star').setScale(0.4);
    xpIcon.setDepth(1000);
    this.xpText = this.add.text(35, 50, `XP: ${this.economy.xp}/${this.currentEpoch.xpToNext}`, { fontSize: '20px', color: '#00ff00' });
    this.xpText.setDepth(1000);
    
    this.epochText = this.add.text(20, 80, `Epoch: ${this.currentEpoch.name}`, { fontSize: '20px', color: '#ffffff' });
    this.epochText.setDepth(1000);
    this.baseHpText = this.add.text(20, 450, 'Base HP: 1000/1000', { fontSize: '20px', color: '#ff4444' });
    this.baseHpText.setDepth(1000);
    this.feedbackText = this.add.text(640, 350, '', { fontSize: '20px', color: '#ff0000' }).setOrigin(0.5);
    this.feedbackText.setDepth(1000);
    this.createSpecialButtons();
    this.createToolbar();
  }

  private listenToBattleEvents(): void {
    this.events.on('updateGold', (gold: number) => {
      this.economy.gold = gold;
      this.goldText.setText(`Gold: ${gold}`);
    });

    this.events.on('updateXP', (xp: number, xpToNext: number) => {
      this.economy.xp = xp;
      this.currentEpoch.xpToNext = xpToNext;
      this.xpText.setText(`XP: ${xp}/${xpToNext}`);
    });

    this.events.on('updateEpoch', (epochName: string) => {
      this.currentEpoch.name = epochName;
      this.epochText.setText(`Epoch: ${epochName}`);
    });

    this.events.on('updateBaseHP', (hp: number, maxHp: number, side: string) => {
      // For now, only show player base HP
      if (side === 'player') {
        this.baseHpText.setText(`Base HP: ${hp}/${maxHp}`);
        
        // Change color based on HP percentage
        const hpPercent = hp / maxHp;
        if (hpPercent > 0.6) {
          this.baseHpText.setColor('#00ff00');
        } else if (hpPercent > 0.3) {
          this.baseHpText.setColor('#ffaa00');
        } else {
          this.baseHpText.setColor('#ff4444');
        }
      }
    });

    this.events.on('turretPlacementFailed', (message: string) => {
      this.showFeedback(message);
    });

    this.events.on('updateRainingRocksCooldown', (remaining: number, total: number) => {
      this.updateRainingRocksCooldown(remaining, total);
    });

    this.events.on('updateArtilleryStrikeCooldown', (remaining: number, total: number) => {
      this.updateArtilleryStrikeCooldown(remaining, total);
    });
  }

  private showFeedback(message: string): void {
    this.feedbackText.setText(message);
    this.time.delayedCall(2000, () => {
      this.feedbackText.setText('');
    });
  }

  private createSpecialButtons(): void {
    const specialButtonsX = 900;
    const specialButtonsY = 50;
    
    // Raining Rocks button with icon
    this.rainingRocksButton = this.add.rectangle(specialButtonsX, specialButtonsY, 120, 60, 0x8B4513).setInteractive();
    this.rainingRocksButton.setDepth(1000);
    const rocksIcon = this.add.image(specialButtonsX - 25, specialButtonsY - 10, 'raining-rocks-icon').setScale(0.3);
    rocksIcon.setDepth(1000);
    const rocksText = this.add.text(specialButtonsX + 5, specialButtonsY - 10, 'Rocks', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    rocksText.setDepth(1000);
    this.rainingRocksCooldownText = this.add.text(specialButtonsX, specialButtonsY + 10, 'Ready', { fontSize: '14px', color: '#00ff00' }).setOrigin(0.5);
    this.rainingRocksCooldownText.setDepth(1000);
    
    this.rainingRocksButton.on('pointerdown', () => {
      this.events.emit('useRainingRocks');
    });
    
    // Artillery Strike button with icon
    this.artilleryStrikeButton = this.add.rectangle(specialButtonsX + 140, specialButtonsY, 120, 60, 0xFF4500).setInteractive();
    this.artilleryStrikeButton.setDepth(1000);
    const artilleryIcon = this.add.image(specialButtonsX + 140 - 25, specialButtonsY - 10, 'artillery-strike-icon').setScale(0.3);
    artilleryIcon.setDepth(1000);
    const artilleryText = this.add.text(specialButtonsX + 140 + 5, specialButtonsY - 10, 'Artillery', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    artilleryText.setDepth(1000);
    this.artilleryStrikeCooldownText = this.add.text(specialButtonsX + 140, specialButtonsY + 10, 'Ready', { fontSize: '14px', color: '#00ff00' }).setOrigin(0.5);
    this.artilleryStrikeCooldownText.setDepth(1000);
    
    this.artilleryStrikeButton.on('pointerdown', () => {
      this.events.emit('useArtilleryStrike');
    });
  }

  private updateRainingRocksCooldown(remaining: number, _total: number): void {
    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000);
      this.rainingRocksCooldownText.setText(`${seconds}s`);
      this.rainingRocksCooldownText.setColor('#ff0000');
      this.rainingRocksButton.setFillStyle(0x444444);
    } else {
      this.rainingRocksCooldownText.setText('Ready');
      this.rainingRocksCooldownText.setColor('#00ff00');
      this.rainingRocksButton.setFillStyle(0x8B4513);
    }
  }

  private updateArtilleryStrikeCooldown(remaining: number, _total: number): void {
    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000);
      this.artilleryStrikeCooldownText.setText(`${seconds}s`);
      this.artilleryStrikeCooldownText.setColor('#ff0000');
      this.artilleryStrikeButton.setFillStyle(0x444444);
    } else {
      this.artilleryStrikeCooldownText.setText('Ready');
      this.artilleryStrikeCooldownText.setColor('#00ff00');
      this.artilleryStrikeButton.setFillStyle(0xFF4500);
    }
  }

  private createToolbar(): void {
    const buttonY = 660;
    
    // Unit spawn buttons
    for (let i = 0; i < 5; i++) {
      const btn = this.add.rectangle(200 + i * 80, buttonY, 70, 50, 0x444444).setInteractive();
      btn.setDepth(1000);
      const unitText = this.add.text(200 + i * 80, buttonY, `U${i + 1}`, { fontSize: '18px' }).setOrigin(0.5);
      unitText.setDepth(1000);
      btn.on('pointerdown', () => this.onUnitButtonClick(i));
    }

    // Turret placement buttons (showing first 5 turrets)
    const turretButtonY = 600;
    for (let i = 0; i < 5; i++) {
      const turretData = this.turretsDatabase[i];
      if (!turretData) continue;

      const btn = this.add.rectangle(200 + i * 80, turretButtonY, 70, 50, 0x663300).setInteractive();
      btn.setDepth(1000);
      const text = this.add.text(200 + i * 80, turretButtonY - 10, `T${i + 1}`, { fontSize: '16px' }).setOrigin(0.5);
      text.setDepth(1000);
      const costText = this.add.text(200 + i * 80, turretButtonY + 10, `${turretData.goldCost}g`, { fontSize: '12px', color: '#ffd700' }).setOrigin(0.5);
      costText.setDepth(1000);

      btn.on('pointerdown', () => this.onTurretButtonClick(i));
      
      // Highlight selected turret
      btn.setData('btnRect', btn);
      btn.setData('textObj', text);
      btn.setData('costObj', costText);
      btn.setData('index', i);
    }
  }

  private onTurretButtonClick(index: number): void {
    const turretData = this.turretsDatabase[index];
    if (!turretData) return;

    // Check if player has enough gold
    if (this.economy.gold < turretData.goldCost) {
      this.showFeedback(`Not enough gold! Need ${turretData.goldCost}`);
      return;
    }
    
    console.log(`Selected turret: ${turretData.name} (${turretData.goldCost} gold)`);
    this.events.emit('selectTurret', index);
    
    // Visual feedback
    this.showFeedback(`Click grid to place ${turretData.name}`);
  }

  private onUnitButtonClick(index: number): void {
    console.log(`Unit button ${index} clicked`);
    this.events.emit('spawnUnit', index);
  }

  public updateBaseHP(hp: number, maxHp: number): void {
    this.baseHpText.setText(`Base HP: ${hp}/${maxHp}`);
  }
}
