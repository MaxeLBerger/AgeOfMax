
// Unit Selection System
export class UnitSelectionSystem {
  private scene: Phaser.Scene;
  private selectedUnit: any = null;
  private selectionIndicator?: Phaser.GameObjects.Graphics;
  private infoPanel?: Phaser.GameObjects.Container;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupClickHandlers();
  }
  
  private setupClickHandlers() {
    this.scene.input.on('gameobjectdown', (pointer: any, gameObject: any) => {
      if (gameObject.getData('isUnit')) {
        this.selectUnit(gameObject);
      }
    });
  }
  
  selectUnit(unit: any) {
    this.selectedUnit = unit;
    this.showSelectionIndicator(unit);
    this.showInfoPanel(unit);
  }
  
  private showSelectionIndicator(unit: any) {
    // Remove old indicator
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
    }
    
    // Create selection circle
    this.selectionIndicator = this.scene.add.graphics();
    this.selectionIndicator.lineStyle(3, 0x00FF00, 1);
    this.selectionIndicator.strokeCircle(unit.x, unit.y, 30);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.selectionIndicator,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }
  
  private showInfoPanel(unit: any) {
    // Remove old panel
    if (this.infoPanel) {
      this.infoPanel.destroy();
    }
    
    const x = this.scene.cameras.main.width - 200;
    const y = 100;
    
    // Create panel container
    this.infoPanel = this.scene.add.container(x, y);
    
    // Background
    const bg = this.scene.add.rectangle(0, 0, 180, 200, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0xFFFFFF);
    
    // Unit info
    const unitData = unit.getData('stats') || {};
    const texts = [
      `Unit: ${unitData.name || 'Unknown'}`,
      `HP: ${Math.floor(unit.health)}/ ${unitData.maxHealth || 100}`,
      `Damage: ${unitData.damage || 10}`,
      `Speed: ${unitData.speed || 50}`,
      `Kills: ${unit.getData('kills') || 0}`,
      `Rank: ${unit.getData('rank') || 'Recruit'}`
    ];
    
    const textObjects = texts.map((text, i) => {
      return this.scene.add.text(0, -80 + i * 25, text, {
        fontSize: '14px',
        color: '#FFFFFF'
      }).setOrigin(0.5);
    });
    
    this.infoPanel.add([bg, ...textObjects]);
  }
  
  clearSelection() {
    this.selectedUnit = null;
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
    }
    if (this.infoPanel) {
      this.infoPanel.destroy();
    }
  }
}

