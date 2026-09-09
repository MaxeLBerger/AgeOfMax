import { readFile, writeFile } from 'node:fs/promises';
const path='src/scenes/UIScene.ts';
let s=await readFile(path,'utf8');
s=s.replace('  private overlay?: Phaser.GameObjects.Container;', '  private overlay?: Phaser.GameObjects.Container;\n  private overlayButtons: Array<{ bg: Phaser.GameObjects.Rectangle; activate: () => void }> = [];\n  private overlayFocus = 0;');
s=s.replace('    this.hp = {}; this.overlay = undefined; this.speed = 1;', '    this.hp = {}; this.overlay = undefined; this.overlayButtons = []; this.overlayFocus = 0; this.speed = 1;');
s=s.replace('    this.paused = paused; this.tooltip.setVisible(false); this.overlay?.destroy(); this.overlay = undefined;', '    this.paused = paused; this.tooltip.setVisible(false); this.overlay?.destroy(); this.overlay = undefined;\n    this.overlayButtons = []; this.overlayFocus = 0;');
s=s.replace("this.text(640, 523, 'Leertaste oder Escape zum Fortsetzen', 13", "this.text(640, 538, 'Leertaste oder Escape zum Fortsetzen', 12");
s=s.replace("  private makeOverlay(title: string, eyebrow: string, description: string): Phaser.GameObjects.Container {\n", "  private makeOverlay(title: string, eyebrow: string, description: string): Phaser.GameObjects.Container {\n    this.overlayButtons = []; this.overlayFocus = 0;\n");
if(!s.includes('this.overlayButtons = []; this.overlayFocus = 0;\n    const blocker')) throw new Error('makeOverlay replacement failed');
s=s.replace('    return this.add.container(0, 0, [blocker, panel, line, top, heading, sub]).setDepth(500);', "    const controls = this.text(640, 511, '↑ / ↓ oder Tab: wählen  ·  Enter: bestätigen', 12, C.muted).setOrigin(0.5);\n    return this.add.container(0, 0, [blocker, panel, line, top, heading, sub, controls]).setDepth(500);");
const begin=s.indexOf('  private overlayButton('),end=s.indexOf('  private showResult(',begin);
s=s.slice(0,begin)+`  private focusOverlay(index: number): void {
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
`+s.slice(end);
s=s.replace("this.text(640, 523, won ?", "this.text(640, 538, won ?").replace("'Tipp: Halte Fernkämpfer hinter einer starken Front.', 13", "'Tipp: Halte Fernkämpfer hinter einer starken Front.', 12");
const keyStart=s.indexOf('  private onKey('),keyEnd=s.indexOf('  private formatTime(',keyStart);
s=s.slice(0,keyStart)+`  private onKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const pauseKey = event.code === 'Space' || event.code === 'Escape';
    const overlayOpen = !!this.overlay?.active && (this.paused || this.gameOver);
    const overlayKey = overlayOpen && ['arrowup', 'arrowdown', 'tab', 'enter'].includes(key);
    if (!pauseKey && !overlayKey && !['q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'g', 'u', '1', '2', '3'].includes(key)) return;
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
    if (pauseKey) { event.preventDefault(); this.requestPause(); return; }
    if (this.paused) return;
    const unit = ['q', 'w', 'e', 'r'].indexOf(key), tower = ['a', 's', 'd'].indexOf(key);
    if (unit >= 0) { this.recruit(unit); return; } if (tower >= 0) { this.selectTower(tower); return; }
    if (key === 'f') this.useAbility(0); if (key === 'g') this.useAbility(1); if (key === 'u') this.advanceEpoch();
    if (['1', '2', '3'].includes(key)) this.events.emit('setSimulationSpeed', [1, 2, 4][Number(key) - 1]);
  }
`+s.slice(keyEnd);
await writeFile(path,s);
console.log('Overlay keyboard navigation implemented.');
