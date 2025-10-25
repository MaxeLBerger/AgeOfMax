import Phaser from 'phaser';

interface GameSettings {
  sfxVolume: number;
  musicVolume: number;
  showFPS: boolean;
  showDebugOverlay: boolean;
  developerMode: boolean;
}

export class SettingsScene extends Phaser.Scene {
  private settings: GameSettings = {
    sfxVolume: 0.7,
    musicVolume: 0.5,
    showFPS: false,
    showDebugOverlay: false,
    developerMode: false
  };

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;

    // Load settings from registry
    this.loadSettings();

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Title
    this.add.text(centerX, 80, 'SETTINGS', {
      fontSize: '48px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Audio section
    this.add.text(centerX, 180, 'AUDIO', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // SFX Volume slider
    this.createSlider(centerX, 240, 'Sound Effects', 'sfxVolume');

    // Music Volume slider
    this.createSlider(centerX, 320, 'Music', 'musicVolume');

    // Display section
    this.add.text(centerX, 400, 'DISPLAY', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Show FPS toggle
    this.createToggle(centerX, 460, 'Show FPS Counter', 'showFPS');

    // Show Debug Overlay toggle
    this.createToggle(centerX, 520, 'Debug Overlay (F2)', 'showDebugOverlay');

    // Developer Mode section
    this.add.text(centerX, 590, 'DEVELOPER', {
      fontSize: '28px',
      color: '#ff6b6b',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Developer Mode toggle
    this.createToggle(centerX, 650, 'Developer Mode (F3)', 'developerMode');
    
    this.add.text(centerX, 690, 'Shows detailed unit stats above each unit', {
      fontSize: '12px',
      color: '#666666',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Info text
    this.add.text(centerX, 730, 'Settings are saved automatically', {
      fontSize: '14px',
      color: '#888888',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(50, height - 50, ' BACK', {
      fontSize: '24px',
      color: '#888888'
    }).setInteractive({ useHandCursor: true });
    
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#888888'));
    backBtn.on('pointerdown', () => {
      this.saveSettings();
      this.scene.start('MenuScene');
    });
  }

  private createSlider(x: number, y: number, label: string, settingKey: keyof GameSettings): void {
    // Label
    this.add.text(x - 200, y, label, {
      fontSize: '18px',
      color: '#ffffff'
    });

    // Slider background
    this.add.rectangle(x + 80, y, 200, 8, 0x444444);

    // Slider fill
    const value = this.settings[settingKey] as number;
    const sliderFill = this.add.rectangle(x + 80 - 100, y, 200 * value, 8, 0x4a90e2).setOrigin(0, 0.5);

    // Slider handle
    const handle = this.add.circle(x + 80 - 100 + 200 * value, y, 12, 0xffffff)
      .setInteractive({ draggable: true, useHandCursor: true });

    // Value text
    const valueText = this.add.text(x + 200, y, `${Math.round(value * 100)}%`, {
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0, 0.5);

    // Drag handler
    handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const minX = x + 80 - 100;
      const maxX = x + 80 + 100;
      const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);
      
      handle.x = clampedX;
      
      const newValue = (clampedX - minX) / 200;
      (this.settings[settingKey] as number) = newValue;
      
      sliderFill.width = 200 * newValue;
      valueText.setText(`${Math.round(newValue * 100)}%`);
    });
  }

  private createToggle(x: number, y: number, label: string, settingKey: keyof GameSettings): void {
    // Label
    this.add.text(x - 150, y, label, {
      fontSize: '18px',
      color: '#ffffff'
    });

    const isOn = this.settings[settingKey] as boolean;
    
    // Toggle background
    const toggleBg = this.add.rectangle(x + 150, y, 60, 30, isOn ? 0x4a90e2 : 0x444444, 1)
      .setInteractive({ useHandCursor: true });

    // Toggle handle
    const handleX = isOn ? x + 150 + 15 : x + 150 - 15;
    const handle = this.add.circle(handleX, y, 12, 0xffffff);

    // Store both in container for easier management (not used directly but keeps scene clean)
    this.add.container(0, 0, [toggleBg, handle]);

    toggleBg.on('pointerdown', () => {
      const newValue = !(this.settings[settingKey] as boolean);
      (this.settings[settingKey] as boolean) = newValue;

      // Animate toggle
      toggleBg.setFillStyle(newValue ? 0x4a90e2 : 0x444444);
      this.tweens.add({
        targets: handle,
        x: newValue ? x + 150 + 15 : x + 150 - 15,
        duration: 200,
        ease: 'Power2'
      });
    });
  }

  private loadSettings(): void {
    const saved = this.registry.get('settings');
    if (saved) {
      this.settings = { ...this.settings, ...saved };
    }
  }

  private saveSettings(): void {
    this.registry.set('settings', this.settings);
    
    // Sync Developer Mode to localStorage for BattleScene
    localStorage.setItem('developerMode', this.settings.developerMode.toString());
    
    console.log('Settings saved:', this.settings);
  }
}
