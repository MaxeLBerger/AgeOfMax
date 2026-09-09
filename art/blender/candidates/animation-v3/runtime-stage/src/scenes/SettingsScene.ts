import Phaser from 'phaser';
import { MusicManager } from '../utils/MusicManager';
import { UI, displayText, loadGameSettings, saveGameSettings, menuBackdrop, menuButton, menuHeader, menuKeyboard, uiText, type GameSettings, type MenuButton } from '../ui/theme';

export class SettingsScene extends Phaser.Scene {
  private settings!: GameSettings;
  private saveStatus!: Phaser.GameObjects.Text;
  private buttons: MenuButton[] = [];

  constructor() { super({ key: 'SettingsScene' }); }

  create(): void {
    new MusicManager(this).playMenuMusic();
    this.buttons = [];
    this.settings = loadGameSettings(this);
    menuBackdrop(this);
    menuHeader(this, 'DEIN SPIEL', 'Einstellungen', 'Passe Klang und Bewegung an deinen Spielstil an.');
    this.add.rectangle(80, 216, 788, 342, UI.panel, 0.96).setOrigin(0).setStrokeStyle(1, UI.line, 0.65);
    this.add.rectangle(892, 216, 308, 342, UI.ink, 0.64).setOrigin(0).setStrokeStyle(1, UI.gold, 0.25);
    uiText(this, 920, 247, 'DEINE PRÄFERENZEN', 12, UI.goldText).setLetterSpacing(1.8);
    displayText(this, 919, 282, 'Ganz dein Tempo.', 27);
    uiText(this, 920, 336, 'Alle Änderungen werden sofort übernommen und auf diesem Gerät gespeichert.', 17, UI.muted, 248);
    uiText(this, 920, 440, 'Im Spiel kannst du jederzeit pausieren und das Tempo zwischen 1×, 2× und 4× wechseln.', 16, UI.muted, 250);
    this.createSlider(282, 'Musik', 'Atmosphäre und Schlachtmusik', 'musicVolume');
    this.createSlider(381, 'Effekte', 'Befehle, Treffer und Fähigkeiten', 'sfxVolume');
    this.add.graphics().lineStyle(1, UI.line, 0.55).lineBetween(112, 438, 836, 438);
    this.createMotionToggle();
    this.saveStatus = uiText(this, 328, 602, 'Änderungen werden automatisch gespeichert.', 15, UI.muted);
    this.buttons.push(menuButton(this, 80, 585, 210, 50, 'Zurück', () => this.scene.start('MenuScene')));
    menuKeyboard(this, () => this.buttons, () => this.scene.start('MenuScene'));
  }

  private persist(): void {
    const persisted = saveGameSettings(this, this.settings);
    this.saveStatus.setText(persisted ? 'Einstellungen gespeichert.' : 'Für diese Sitzung gespeichert. Gerätespeicher nicht verfügbar.');
  }

  private smallButton(x: number, y: number, label: string, action: () => void): void {
    const area = this.add.rectangle(x, y, 38, 38, UI.panelHover).setStrokeStyle(1, UI.line).setInteractive({ useHandCursor: true });
    const text = uiText(this, x, y - 1, label, 24, UI.text).setOrigin(0.5);
    const focus = (active: boolean) => area.setStrokeStyle(active ? 2 : 1, active ? UI.gold : UI.line);
    area.on('pointerover', () => focus(true)).on('pointerout', () => focus(false)).on('pointerdown', action);
    this.buttons.push({ area, label: text, focus, activate: action });
  }

  private createSlider(y: number, title: string, description: string, key: 'musicVolume' | 'sfxVolume'): void {
    uiText(this, 112, y - 24, title, 21, UI.text);
    uiText(this, 112, y + 11, description, 13, UI.muted);
    const x = 438;
    const width = 280;
    const trackTarget = this.add.rectangle(x + width / 2, y, width, 40, UI.ink, 0).setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y, width, 4, UI.line).setOrigin(0, 0.5);
    const fill = this.add.rectangle(x, y, width * this.settings[key], 4, UI.gold).setOrigin(0, 0.5);
    const handle = this.add.circle(x + width * this.settings[key], y, 8, UI.goldBright).setStrokeStyle(2, UI.ink)
      .setInteractive({ draggable: true, useHandCursor: true });
    const valueText = uiText(this, 835, y, `${Math.round(this.settings[key] * 100)}%`, 17, UI.goldText).setOrigin(1, 0.5);
    const change = (value: number) => {
      this.settings[key] = Math.round(Phaser.Math.Clamp(value, 0, 1) * 100) / 100;
      fill.width = width * this.settings[key];
      handle.x = x + width * this.settings[key];
      valueText.setText(`${Math.round(this.settings[key] * 100)}%`);
      this.persist();
    };
    trackTarget.on('pointerdown', (pointer: Phaser.Input.Pointer) => change((pointer.worldX - x) / width));
    handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => change((dragX - x) / width));
    this.smallButton(399, y, '−', () => change(this.settings[key] - 0.1));
    this.smallButton(757, y, '+', () => change(this.settings[key] + 0.1));
  }

  private createMotionToggle(): void {
    uiText(this, 112, 463, 'Bewegung reduzieren', 21, UI.text);
    uiText(this, 112, 500, 'Weniger Kamerabewegung und dekorative Animation.', 13, UI.muted);
    const button = menuButton(this, 686, 474, 150, 46, this.settings.reducedMotion ? 'Ein' : 'Aus', () => {
      this.settings.reducedMotion = !this.settings.reducedMotion;
      button.label.setText(this.settings.reducedMotion ? 'Ein' : 'Aus');
      this.persist();
    });
    this.buttons.push(button);
  }
}
