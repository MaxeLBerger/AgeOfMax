import Phaser from 'phaser';
import type { DifficultyLevel } from './MenuScene';
import { UI, displayText, menuBackdrop, menuButton, menuHeader, menuKeyboard, uiText, type MenuButton } from '../ui/theme';

export class DifficultyScene extends Phaser.Scene {
  private selected: DifficultyLevel = 'medium';
  private starting = false;
  private choices: Array<{ level: DifficultyLevel; area: Phaser.GameObjects.Rectangle; marker: Phaser.GameObjects.Text }> = [];

  constructor() { super({ key: 'DifficultyScene' }); }

  create(): void {
    this.starting = false;
    this.choices = [];
    const previous = this.registry.get('difficulty');
    this.selected = ['easy', 'medium', 'hard'].includes(previous) ? previous : 'medium';
    menuBackdrop(this);
    menuHeader(this, 'NEUE SCHLACHT', 'Wähle deine Herausforderung', 'Jede Schlacht beginnt in der Steinzeit. Wie weit führst du dein Volk?');
    const definitions: Array<{ level: DifficultyLevel; rank: string; title: string; subtitle: string; description: string; traits: string[] }> = [
      { level: 'easy', rank: 'I', title: 'Entdecker', subtitle: 'LEICHT', description: 'Lerne deine Armee kennen und\nfinde deinen eigenen Rhythmus.', traits: ['Großzügiger Startvorrat', 'Mehr Zeit für deinen Aufbau', 'Ein nachsichtiger Gegner'] },
      { level: 'medium', rank: 'II', title: 'Feldherr', subtitle: 'NORMAL', description: 'Plane deine Angriffe und halte\nOffensive und Verteidigung im Gleichgewicht.', traits: ['Ausgewogene Ressourcen', 'Ein entschlossener Gegner', 'Eine echte Herausforderung'] },
      { level: 'hard', rank: 'III', title: 'Eroberer', subtitle: 'SCHWER', description: 'Jede Entscheidung zählt.\nErgreife die Initiative.', traits: ['Begrenzter Startvorrat', 'Früher Druck auf deine Front', 'Für erfahrene Strategen'] }
    ];
    const nav: MenuButton[] = [];
    definitions.forEach((definition, i) => {
      const x = 80 + i * 380;
      const area = this.add.rectangle(x, 210, 360, 350, UI.panel, 0.94).setOrigin(0).setInteractive({ useHandCursor: true });
      displayText(this, x + 28, 232, definition.rank, 43).setColor(UI.goldText);
      uiText(this, x + 330, 249, definition.subtitle, 12, UI.muted).setOrigin(1, 0).setLetterSpacing(2);
      displayText(this, x + 28, 294, definition.title, 33);
      uiText(this, x + 28, 348, definition.description, 16, UI.muted, 302);
      this.add.graphics().lineStyle(1, UI.line, 0.65).lineBetween(x + 28, 419, x + 332, 419);
      definition.traits.forEach((trait, row) => {
        this.add.rectangle(x + 31, 447 + row * 29, 4, 4, UI.gold);
        uiText(this, x + 45, 436 + row * 29, trait, 14, UI.text);
      });
      const marker = uiText(this, x + 330, 528, 'AUSGEWÄHLT', 10, UI.goldText).setOrigin(1, 0).setLetterSpacing(1.5);
      const select = () => {
        if (this.starting) return;
        this.selected = definition.level;
        this.updateSelection();
      };
      const focus = (active: boolean) => {
        if (this.starting) return;
        area.setFillStyle(active ? UI.panelHover : UI.panel, 0.96);
        area.setStrokeStyle(active || this.selected === definition.level ? 2 : 1,
          active || this.selected === definition.level ? UI.gold : UI.line, active || this.selected === definition.level ? 0.95 : 0.6);
      };
      area.on('pointerover', () => focus(true)).on('pointerout', () => focus(false)).on('pointerdown', select);
      this.choices.push({ level: definition.level, area, marker });
      nav.push({ area, label: marker, activate: select, focus });
    });
    this.updateSelection();
    const back = menuButton(this, 80, 587, 210, 48, 'Zurück', () => { if (!this.starting) this.scene.start('MenuScene'); });
    const start = menuButton(this, 900, 581, 300, 58, 'Schlacht beginnen', () => void this.startGame(), true);
    uiText(this, 328, 602, 'Wähle einen Modus und beginne deine Schlacht.', 15, UI.muted);
    nav.push(start, back);
    menuKeyboard(this, () => this.starting ? [] : nav, () => { if (!this.starting) this.scene.start('MenuScene'); });
  }

  private updateSelection(): void {
    this.choices.forEach(choice => {
      const active = choice.level === this.selected;
      choice.area.setStrokeStyle(active ? 2 : 1, active ? UI.gold : UI.line, active ? 0.95 : 0.6);
      choice.marker.setVisible(active);
    });
  }

  private async startGame(): Promise<void> {
    if (this.starting) return;
    this.starting = true;
    this.registry.set('difficulty', this.selected);
    const loading = uiText(this, 640, 182, 'Die Schlacht wird vorbereitet …', 16, UI.goldText).setOrigin(0.5);
    try {
      const keys = this.scene.manager.keys;
      if (!keys.BattleScene) {
        const { BattleScene } = await import('./BattleScene');
        this.scene.add('BattleScene', BattleScene, false);
      }
      if (!keys.UIScene) {
        const { UIScene } = await import('./UIScene');
        this.scene.add('UIScene', UIScene, false);
      }
      if (!this.scene.isActive()) return;
      // Queued operations run in order: UI subscribes before battle emits its initial state.
      this.scene.stop('UIScene');
      this.scene.launch('UIScene');
      this.scene.start('BattleScene');
    } catch (error) {
      this.starting = false;
      loading.setText('Die Schlacht konnte nicht laden. Bitte erneut versuchen.').setColor('#eab2a3');
      console.error('Spiel konnte nicht gestartet werden:', error);
    }
  }
}
