import Phaser from 'phaser';
import { UI, displayText, menuBackdrop, menuButton, menuHeader, menuKeyboard, uiText } from '../ui/theme';

export class CreditsScene extends Phaser.Scene {
  constructor() { super({ key: 'CreditsScene' }); }

  create(): void {
    menuBackdrop(this);
    menuHeader(this, 'DAS PROJEKT', 'Mitwirkende', 'Für alle, die noch eine Schlacht spielen wollen.');
    this.add.rectangle(80, 219, 1120, 335, UI.panel, 0.88).setOrigin(0).setStrokeStyle(1, UI.line, 0.6);
    uiText(this, 112, 252, 'KONZEPT & ENTWICKLUNG', 12, UI.goldText).setLetterSpacing(2);
    displayText(this, 110, 291, 'Maximilian Haak', 37);
    uiText(this, 112, 357, 'Age of Max ist eine Hommage an die klassischen\nAge-of-War-Spiele: eine Front, fünf Zeitalter\nund immer eine neue taktische Entscheidung.', 18, UI.muted, 530);
    uiText(this, 112, 478, 'Danke fürs Spielen.', 22, UI.text);
    this.add.graphics().lineStyle(1, UI.line, 0.6).lineBetween(704, 255, 704, 515);
    uiText(this, 742, 252, 'IN DER WERKSTATT', 12, UI.goldText).setLetterSpacing(2);
    displayText(this, 740, 291, 'Von Hand gedacht.\nIn Blender geformt.', 28);
    uiText(this, 742, 386, 'Modelle und Landschaften aus Blender.\nSpiel und Interaktion mit Phaser.\nGebaut mit TypeScript und Vite.', 17, UI.muted, 410);
    const back = menuButton(this, 80, 585, 210, 50, 'Zurück', () => this.scene.start('MenuScene'));
    const project = menuButton(this, 900, 585, 300, 50, 'Projekt auf GitHub', () => {
      window.open('https://github.com/MaxelBerger/AgeOfMax', '_blank', 'noopener,noreferrer');
    });
    uiText(this, 329, 602, 'Quellcode, Entwicklung und Feedback auf GitHub.', 15, UI.muted);
    menuKeyboard(this, () => [back, project], () => this.scene.start('MenuScene'));
  }
}
