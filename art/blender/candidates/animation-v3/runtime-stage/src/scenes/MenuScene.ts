import Phaser from 'phaser';
import { MusicManager } from '../utils/MusicManager';
import { UI, displayText, loadGameSettings, menuBackdrop, menuButton, menuKeyboard, uiText, type MenuButton } from '../ui/theme';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export class MenuScene extends Phaser.Scene {
  private buttons: MenuButton[] = [];
  private help?: Phaser.GameObjects.Container;
  private helpClose?: MenuButton;

  constructor() { super({ key: 'MenuScene' }); }

  create(): void {
    this.buttons = [];
    this.help = undefined;
    this.helpClose = undefined;
    loadGameSettings(this);
    new MusicManager(this).playMenuMusic();
    menuBackdrop(this, true);
    uiText(this, 82, 62, 'DEIN REICH BEGINNT HIER', 13, UI.goldText).setLetterSpacing(3);
    displayText(this, 76, 99, 'AGE OF', 70);
    displayText(this, 72, 164, 'MAX', 110);
    this.add.graphics().lineStyle(2, UI.gold, 0.7).lineBetween(82, 296, 154, 296);
    uiText(this, 174, 284, 'Vom ersten Feuer bis zur letzten Grenze.', 17, UI.muted);

    this.buttons.push(menuButton(this, 82, 337, 382, 66, 'Neue Schlacht', () => this.scene.start('DifficultyScene'), true));
    this.buttons.push(menuButton(this, 82, 415, 382, 50, 'So wird gespielt', () => this.showHelp()));
    this.buttons.push(menuButton(this, 82, 477, 382, 50, 'Einstellungen', () => this.scene.start('SettingsScene')));
    this.buttons.push(menuButton(this, 82, 539, 382, 50, 'Mitwirkende', () => this.scene.start('CreditsScene')));
    uiText(this, 84, 611, 'MAUS / TOUCH     ·     TAB & ENTER', 11, UI.muted).setLetterSpacing(1.2);

    this.add.rectangle(869, 534, 540, 125, UI.ink, 0.76).setStrokeStyle(1, UI.gold, 0.2);
    uiText(this, 620, 488, 'SCHREIBE DEINE GESCHICHTE', 12, UI.goldText).setLetterSpacing(2.1);
    uiText(this, 620, 518, 'Baue deine Armee. Halte die Linie.\nFühre dein Volk durch fünf Zeitalter.', 21, UI.text, 490);
    const eras = ['STEINZEIT', 'MITTELALTER', 'RENAISSANCE', 'MODERNE', 'ZUKUNFT'];
    this.add.graphics().lineStyle(1, UI.gold, 0.48).lineBetween(625, 626, 1165, 626);
    eras.forEach((era, i) => {
      const x = 626 + i * 133;
      this.add.circle(x, 626, i === 0 ? 4 : 2.5, i === 0 ? UI.goldBright : UI.gold);
      uiText(this, x, 605, era, 9, i === 0 ? UI.goldText : UI.muted).setOrigin(i === 4 ? 1 : 0, 0);
    });
    menuKeyboard(this, () => this.helpClose ? [this.helpClose] : this.buttons, () => this.closeHelp());
  }

  private showHelp(): void {
    if (this.help) return;
    this.buttons.forEach(button => button.area.disableInteractive());
    const before = new Set(this.children.list);
    this.add.rectangle(640, 360, 1280, 720, 0x05090c, 0.85).setInteractive();
    this.add.rectangle(640, 355, 1136, 588, UI.panel).setStrokeStyle(1, UI.gold, 0.55);
    uiText(this, 108, 94, 'FELDHANDBUCH', 13, UI.goldText).setLetterSpacing(3);
    displayText(this, 106, 124, 'Dein Weg zum Sieg', 40);
    uiText(this, 108, 185, 'Zerstöre die gegnerische Basis rechts. Beschütze deine Basis links.', 20, UI.text);
    const columns = [
      { x: 108, title: '01   ARMEE AUFBAUEN', text: 'Rekrutiere mit Gold. Nahkämpfer halten die Front; Fernkämpfer wirken aus der zweiten Reihe. Schwere Einheiten brechen die Linie.' },
      { x: 484, title: '02   STELLUNG HALTEN', text: 'Baue Türme an deiner Basis. Prüfe mit I die nächste Welle und passe deine Truppen an. Fähigkeiten helfen gegen dichte Gruppen.' },
      { x: 860, title: '03   WEITERENTWICKELN', text: 'Im Kampf gewinnst du Erfahrung. Investiere sie in das nächste Zeitalter und schalte stärkere Truppen sowie neue Technik frei.' }
    ];
    columns.forEach(column => {
      uiText(this, column.x, 242, column.title, 13, UI.goldText).setLetterSpacing(0.8);
      uiText(this, column.x, 274, column.text, 17, UI.muted, 307);
    });
    this.add.graphics().lineStyle(1, UI.line).lineBetween(108, 418, 1172, 418);
    uiText(this, 108, 443, 'BEFEHLE', 12, UI.goldText).setLetterSpacing(2);
    uiText(this, 108, 474, 'Q W E R   Truppen\nA S D       Verteidigung', 16, UI.text);
    uiText(this, 450, 474, 'F / G   Fähigkeiten\nU         Zeitalter entwickeln', 16, UI.text);
    uiText(this, 828, 474, '1 / 2 / 3   Tempo\nLeertaste   Pause\nI                 Aufklärung', 16, UI.text);
    uiText(this, 108, 579, 'ESC schließt dieses Handbuch. Im Spiel: Auswahl / Aufklärung / Pause.', 14, UI.muted);
    this.helpClose = menuButton(this, 942, 564, 230, 48, 'Verstanden', () => this.closeHelp(), true);
    const content = this.children.list.filter(child => !before.has(child));
    this.help = this.add.container(0, 0, content).setDepth(100);
  }

  private closeHelp(): void {
    if (!this.help) return;
    this.help.destroy(true);
    this.help = undefined;
    this.helpClose = undefined;
    this.buttons.forEach(button => button.area.setInteractive({ useHandCursor: true }));
  }
}
