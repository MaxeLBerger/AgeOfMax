import Phaser from 'phaser';
import type { Economy, Epoch, TurretType, UnitType } from '../game/types';
import turretsData from '../../data/turrets.json';
import unitsData from '../../data/units.json';

export class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private xpProgressBar!: Phaser.GameObjects.Rectangle;
  private epochText!: Phaser.GameObjects.Text;
  private baseHpText!: Phaser.GameObjects.Text;
  private baseHpBar!: Phaser.GameObjects.Rectangle;
  private feedbackText!: Phaser.GameObjects.Text;
  private rainingRocksButton!: Phaser.GameObjects.Rectangle;
  private rainingRocksCooldownText!: Phaser.GameObjects.Text;
  private artilleryStrikeButton!: Phaser.GameObjects.Rectangle;
  private artilleryStrikeCooldownText!: Phaser.GameObjects.Text;
  private economy: Economy = { gold: 100, xp: 0, goldPerTick: 10, tickInterval: 3000 };
  private currentEpoch: Epoch = { id: 'stone', name: 'Stone Age', xpToNext: 100, unlocks: { units: [], turrets: [] } };
  private turretsDatabase: TurretType[] = turretsData as TurretType[];
  private unitsDatabase: UnitType[] = unitsData as UnitType[];
  private unitButtons: Array<{btn: Phaser.GameObjects.Rectangle, nameText: Phaser.GameObjects.Text, costText: Phaser.GameObjects.Text, unitIndex: number}> = [];
  private turretButtons: Array<{btn: Phaser.GameObjects.Rectangle, nameText: Phaser.GameObjects.Text, costText: Phaser.GameObjects.Text, turretIndex: number}> = [];
  private selectedTurretIndex: number = -1;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    console.log('UIScene: Initializing HUD...');
    this.createHUD();
    this.listenToBattleEvents();
  }

  private createHUD(): void {
    const UI_DEPTH = 2000;
    
    // Top-left resources panel - semi-transparent background
    const resourcePanel = this.add.rectangle(0, 0, 300, 150, 0x000000, 0.7).setOrigin(0, 0);
    resourcePanel.setDepth(UI_DEPTH);
    
    // Gold display with icon
    const goldIcon = this.add.image(20, 25, 'gold-coin').setScale(0.5);
    goldIcon.setDepth(UI_DEPTH + 1);
    this.goldText = this.add.text(50, 15, `Gold: ${this.economy.gold}`, { 
      fontSize: '28px', 
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.goldText.setDepth(UI_DEPTH + 1);
    
    // XP display with progress bar
    const xpIcon = this.add.image(20, 70, 'xp-star').setScale(0.5);
    xpIcon.setDepth(UI_DEPTH + 1);
    this.xpText = this.add.text(50, 60, `XP: ${this.economy.xp}/${this.currentEpoch.xpToNext}`, { 
      fontSize: '22px', 
      color: '#00ff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.xpText.setDepth(UI_DEPTH + 1);
    
    // XP Progress Bar
    const xpBarBg = this.add.rectangle(50, 90, 200, 15, 0x333333).setOrigin(0, 0);
    xpBarBg.setDepth(UI_DEPTH + 1);
    this.xpProgressBar = this.add.rectangle(50, 90, 0, 15, 0x00ff00).setOrigin(0, 0);
    this.xpProgressBar.setDepth(UI_DEPTH + 2);
    
    // Epoch display
    this.epochText = this.add.text(20, 115, `Epoch: ${this.currentEpoch.name}`, { 
      fontSize: '20px', 
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.epochText.setDepth(UI_DEPTH + 1);
    
    // Base HP panel (left side, middle)
    const baseHpPanel = this.add.rectangle(0, 400, 280, 80, 0x000000, 0.7).setOrigin(0, 0);
    baseHpPanel.setDepth(UI_DEPTH);
    
    this.baseHpText = this.add.text(20, 415, 'Base HP: 1500/1500', { 
      fontSize: '24px', 
      color: '#00ff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.baseHpText.setDepth(UI_DEPTH + 1);
    
    // Base HP Progress Bar
    const baseHpBarBg = this.add.rectangle(20, 450, 240, 20, 0x660000).setOrigin(0, 0);
    baseHpBarBg.setDepth(UI_DEPTH + 1);
    this.baseHpBar = this.add.rectangle(20, 450, 240, 20, 0x00ff00).setOrigin(0, 0);
    this.baseHpBar.setDepth(UI_DEPTH + 2);
    
    // Feedback text (center screen)
    this.feedbackText = this.add.text(640, 300, '', { 
      fontSize: '28px', 
      color: '#ff0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    this.feedbackText.setDepth(UI_DEPTH + 10);
    
    this.createSpecialButtons();
    this.createToolbar();
  }

  private listenToBattleEvents(): void {
    this.events.on('updateGold', (gold: number) => {
      this.economy.gold = gold;
      this.goldText.setText(`Gold: ${gold}`);
      this.updateButtonStates();
    });

    this.events.on('updateXP', (xp: number, xpToNext: number) => {
      this.economy.xp = xp;
      this.currentEpoch.xpToNext = xpToNext;
      this.xpText.setText(`XP: ${xp}/${xpToNext}`);
      
      // Update XP progress bar
      const progress = Math.min(xp / xpToNext, 1);
      this.xpProgressBar.setDisplaySize(200 * progress, 15);
    });

    this.events.on('updateEpoch', (epoch: Epoch) => {
      this.currentEpoch = epoch;
      this.epochText.setText(`Epoch: ${epoch.name}`);
      this.updateAvailableUnits();
      this.updateAvailableTurrets();
    });

    this.events.on('updateBaseHP', (hp: number, maxHp: number, side: string) => {
      // For now, only show player base HP
      if (side === 'player') {
        this.baseHpText.setText(`Base HP: ${hp}/${maxHp}`);
        
        // Update HP bar
        const hpPercent = hp / maxHp;
        this.baseHpBar.setDisplaySize(240 * hpPercent, 20);
        
        // Change color based on HP percentage
        if (hpPercent > 0.6) {
          this.baseHpText.setColor('#00ff00');
          this.baseHpBar.setFillStyle(0x00ff00);
        } else if (hpPercent > 0.3) {
          this.baseHpText.setColor('#ffaa00');
          this.baseHpBar.setFillStyle(0xffaa00);
        } else {
          this.baseHpText.setColor('#ff4444');
          this.baseHpBar.setFillStyle(0xff4444);
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
    const UI_DEPTH = 2000;
    const specialButtonsX = 1050;
    const specialButtonsY = 30;
    
    // Panel background
    const specialPanel = this.add.rectangle(specialButtonsX - 65, specialButtonsY - 15, 270, 90, 0x000000, 0.7).setOrigin(0, 0);
    specialPanel.setDepth(UI_DEPTH);
    
    const titleText = this.add.text(specialButtonsX, specialButtonsY, '⚡ SPECIAL ABILITIES', { 
      fontSize: '16px', 
      color: '#ffff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    titleText.setDepth(UI_DEPTH + 1);
    
    // Raining Rocks button (Meteor Strike)
    this.rainingRocksButton = this.add.rectangle(specialButtonsX - 55, specialButtonsY + 35, 100, 50, 0x8B4513);
    this.rainingRocksButton.setInteractive({ useHandCursor: true });
    this.rainingRocksButton.setDepth(UI_DEPTH + 1);
    
    const rocksText = this.add.text(specialButtonsX - 55, specialButtonsY + 25, '🪨 Meteor', { 
      fontSize: '14px', 
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    rocksText.setDepth(UI_DEPTH + 2);
    
    this.rainingRocksCooldownText = this.add.text(specialButtonsX - 55, specialButtonsY + 45, 'Ready', { 
      fontSize: '12px', 
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.rainingRocksCooldownText.setDepth(UI_DEPTH + 2);
    
    this.rainingRocksButton.on('pointerover', () => {
      if (this.rainingRocksCooldownText.text === 'Ready') {
        this.rainingRocksButton.setFillStyle(0xa85a1a);
      }
    });
    this.rainingRocksButton.on('pointerout', () => {
      if (this.rainingRocksCooldownText.text === 'Ready') {
        this.rainingRocksButton.setFillStyle(0x8B4513);
      }
    });
    this.rainingRocksButton.on('pointerdown', () => {
      const battleScene = this.scene.get('BattleScene');
      battleScene.events.emit('useRainingRocks');
    });
    
    // Artillery Strike button
    this.artilleryStrikeButton = this.add.rectangle(specialButtonsX + 55, specialButtonsY + 35, 100, 50, 0xFF4500);
    this.artilleryStrikeButton.setInteractive({ useHandCursor: true });
    this.artilleryStrikeButton.setDepth(UI_DEPTH + 1);
    
    const artilleryText = this.add.text(specialButtonsX + 55, specialButtonsY + 25, '💥 Artillery', { 
      fontSize: '14px', 
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    artilleryText.setDepth(UI_DEPTH + 2);
    
    this.artilleryStrikeCooldownText = this.add.text(specialButtonsX + 55, specialButtonsY + 45, 'Ready', { 
      fontSize: '12px', 
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.artilleryStrikeCooldownText.setDepth(UI_DEPTH + 2);
    
    this.artilleryStrikeButton.on('pointerover', () => {
      if (this.artilleryStrikeCooldownText.text === 'Ready') {
        this.artilleryStrikeButton.setFillStyle(0xff6a20);
      }
    });
    this.artilleryStrikeButton.on('pointerout', () => {
      if (this.artilleryStrikeCooldownText.text === 'Ready') {
        this.artilleryStrikeButton.setFillStyle(0xFF4500);
      }
    });
    this.artilleryStrikeButton.on('pointerdown', () => {
      const battleScene = this.scene.get('BattleScene');
      battleScene.events.emit('useArtilleryStrike');
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
    const UI_DEPTH = 2000;
    
    // Bottom toolbar panel
    const toolbarBg = this.add.rectangle(0, 550, 1280, 170, 0x1a1a1a, 0.9).setOrigin(0, 0);
    toolbarBg.setDepth(UI_DEPTH);
    
    // Turrets section
    const turretTitle = this.add.text(640, 565, '🏰 TURRETS - Click to Select, then Click Grid to Place', { 
      fontSize: '18px', 
      color: '#ff8800',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    turretTitle.setDepth(UI_DEPTH + 1);
    
    const turretButtonY = 610;
    for (let i = 0; i < 5; i++) {
      const turretData = this.turretsDatabase[i];
      if (!turretData) continue;

      const btn = this.add.rectangle(200 + i * 90, turretButtonY, 80, 50, 0x663300);
      btn.setInteractive({ useHandCursor: true });
      btn.setDepth(UI_DEPTH + 1);
      
      const nameText = this.add.text(200 + i * 90, turretButtonY - 12, turretData.name.substring(0, 8), { 
        fontSize: '11px', 
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      nameText.setDepth(UI_DEPTH + 2);
      
      const costText = this.add.text(200 + i * 90, turretButtonY + 10, `${turretData.goldCost}g`, { 
        fontSize: '14px', 
        color: '#ffd700',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      costText.setDepth(UI_DEPTH + 2);
      
      this.turretButtons.push({ btn, nameText, costText, turretIndex: i });

      btn.on('pointerover', () => {
        if (this.economy.gold >= turretData.goldCost) {
          btn.setFillStyle(0x885522);
        }
      });
      btn.on('pointerout', () => {
        if (this.selectedTurretIndex !== i) {
          btn.setFillStyle(0x663300);
        }
      });
      btn.on('pointerdown', () => this.onTurretButtonClick(i));
    }
    
    // Units section
    const unitTitle = this.add.text(640, 655, '⚔️ UNITS - Click to Spawn', { 
      fontSize: '18px', 
      color: '#00ff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    unitTitle.setDepth(UI_DEPTH + 1);
    
    const unitButtonY = 690;
    for (let i = 0; i < 5; i++) {
      const btn = this.add.rectangle(200 + i * 90, unitButtonY, 80, 50, 0x444444);
      btn.setInteractive({ useHandCursor: true });
      btn.setDepth(UI_DEPTH + 1);
      
      const nameText = this.add.text(200 + i * 90, unitButtonY - 12, '---', { 
        fontSize: '11px', 
        color: '#aaaaaa',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      nameText.setDepth(UI_DEPTH + 2);
      
      const costText = this.add.text(200 + i * 90, unitButtonY + 10, '', { 
        fontSize: '14px', 
        color: '#ffd700',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      costText.setDepth(UI_DEPTH + 2);
      
      this.unitButtons.push({ btn, nameText, costText, unitIndex: -1 });
      
      btn.on('pointerover', () => {
        const buttonData = this.unitButtons[i];
        if (buttonData.unitIndex >= 0) {
          const unitData = this.unitsDatabase[buttonData.unitIndex];
          if (this.economy.gold >= unitData.goldCost) {
            btn.setFillStyle(0x666666);
          }
        }
      });
      btn.on('pointerout', () => {
        const buttonData = this.unitButtons[i];
        if (buttonData.unitIndex >= 0) {
          btn.setFillStyle(0x444444);
        } else {
          btn.setFillStyle(0x222222);
        }
      });
      btn.on('pointerdown', () => this.onUnitButtonClick(i));
    }
    
    // Initialize available units
    this.updateAvailableUnits();
  }

  private onTurretButtonClick(index: number): void {
    const turretData = this.turretsDatabase[index];
    if (!turretData) return;

    // Check if player has enough gold
    if (this.economy.gold < turretData.goldCost) {
      this.showFeedback(`Not enough gold! Need ${turretData.goldCost}g`);
      return;
    }
    
    // Deselect previous turret
    if (this.selectedTurretIndex >= 0) {
      this.turretButtons[this.selectedTurretIndex].btn.setFillStyle(0x663300);
    }
    
    // Select new turret
    this.selectedTurretIndex = index;
    this.turretButtons[index].btn.setFillStyle(0xaa7733);
    
    console.log(`Selected turret: ${turretData.name} (${turretData.goldCost} gold)`);
    
    // Notify BattleScene
    const battleScene = this.scene.get('BattleScene');
    battleScene.events.emit('selectTurret', index);
    
    // Visual feedback
    this.showFeedback(`Click grid to place ${turretData.name}`);
  }

  private onUnitButtonClick(index: number): void {
    const buttonData = this.unitButtons[index];
    if (buttonData.unitIndex < 0) return;
    
    const unitData = this.unitsDatabase[buttonData.unitIndex];
    
    if (this.economy.gold < unitData.goldCost) {
      this.showFeedback(`Not enough gold! Need ${unitData.goldCost}g`);
      return;
    }
    
    console.log(`Spawning unit: ${unitData.name}`);
    
    // Notify BattleScene
    const battleScene = this.scene.get('BattleScene');
    battleScene.events.emit('spawnUnit', buttonData.unitIndex);
  }
  
  private updateAvailableUnits(): void {
    // Get units for current epoch
    const currentEpochId = this.currentEpoch.id;
    const availableUnits = this.unitsDatabase
      .filter(unit => unit.epoch === currentEpochId)
      .slice(0, 5);
    
    // Update button displays
    for (let i = 0; i < this.unitButtons.length; i++) {
      const buttonData = this.unitButtons[i];
      
      if (i < availableUnits.length) {
        const unit = availableUnits[i];
        const unitIndex = this.unitsDatabase.indexOf(unit);
        
        buttonData.unitIndex = unitIndex;
        buttonData.nameText.setText(unit.name.substring(0, 8));
        buttonData.nameText.setColor('#ffffff');
        buttonData.costText.setText(`${unit.goldCost}g`);
        buttonData.btn.setFillStyle(0x444444);
        buttonData.btn.setInteractive();
      } else {
        buttonData.unitIndex = -1;
        buttonData.nameText.setText('---');
        buttonData.nameText.setColor('#666666');
        buttonData.costText.setText('');
        buttonData.btn.setFillStyle(0x222222);
        buttonData.btn.disableInteractive();
      }
    }
    
    this.updateButtonStates();
  }
  
  private updateAvailableTurrets(): void {
    // Turrets are always available, just update button states
    this.updateButtonStates();
  }
  
  private updateButtonStates(): void {
    // Update unit buttons based on gold
    for (const buttonData of this.unitButtons) {
      if (buttonData.unitIndex >= 0) {
        const unitData = this.unitsDatabase[buttonData.unitIndex];
        if (this.economy.gold < unitData.goldCost) {
          buttonData.btn.setFillStyle(0x333333);
          buttonData.costText.setColor('#ff6666');
        } else {
          buttonData.btn.setFillStyle(0x444444);
          buttonData.costText.setColor('#ffd700');
        }
      }
    }
    
    // Update turret buttons based on gold
    for (const buttonData of this.turretButtons) {
      const turretData = this.turretsDatabase[buttonData.turretIndex];
      if (turretData) {
        if (this.economy.gold < turretData.goldCost) {
          if (this.selectedTurretIndex !== buttonData.turretIndex) {
            buttonData.btn.setFillStyle(0x553322);
          }
          buttonData.costText.setColor('#ff6666');
        } else {
          if (this.selectedTurretIndex !== buttonData.turretIndex) {
            buttonData.btn.setFillStyle(0x663300);
          }
          buttonData.costText.setColor('#ffd700');
        }
      }
    }
  }

  public updateBaseHP(hp: number, maxHp: number): void {
    this.baseHpText.setText(`Base HP: ${hp}/${maxHp}`);
  }
}
