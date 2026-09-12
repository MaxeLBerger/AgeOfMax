import Phaser from 'phaser';
import { consumeKeyboardEvent } from './keyboard';

export const UI = {
  ink: 0x0b1218, panel: 0x121f28, panelHover: 0x20343d, line: 0x425057,
  gold: 0xc9a66a, goldBright: 0xe6c78f, teal: 0x7baba4,
  text: '#f1ebde', muted: '#aeb8b7', goldText: '#d8b983',
  font: '"Segoe UI", Arial, sans-serif', display: 'Georgia, "Times New Roman", serif'
} as const;

export interface GameSettings {
  sfxVolume: number;
  musicVolume: number;
  reducedMotion: boolean;
  showFPS: boolean;
  showDebugOverlay: boolean;
  developerMode: boolean;
}

const SETTINGS_KEY = 'ageOfMax.settings.v1';
const defaultSettings: GameSettings = {
  sfxVolume: 0.7, musicVolume: 0.35, reducedMotion: false,
  showFPS: false, showDebugOverlay: false, developerMode: false
};

function normalizeSettings(raw: Partial<GameSettings>): GameSettings {
  return {
    sfxVolume: typeof raw.sfxVolume === 'number' && Number.isFinite(raw.sfxVolume)
      ? Phaser.Math.Clamp(raw.sfxVolume, 0, 1) : defaultSettings.sfxVolume,
    musicVolume: typeof raw.musicVolume === 'number' && Number.isFinite(raw.musicVolume)
      ? Phaser.Math.Clamp(raw.musicVolume, 0, 1) : defaultSettings.musicVolume,
    reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : defaultSettings.reducedMotion,
    showFPS: raw.showFPS === true, showDebugOverlay: raw.showDebugOverlay === true, developerMode: raw.developerMode === true
  };
}

export function loadGameSettings(scene: Phaser.Scene): GameSettings {
  let saved: Partial<GameSettings> = {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    if (parsed && typeof parsed === 'object') saved = parsed as Partial<GameSettings>;
  } catch { /* A private browser session can still keep settings in memory. */ }
  const settings = normalizeSettings({ ...saved, ...(scene.registry.get('settings') ?? {}) });
  scene.registry.set('settings', settings);
  return settings;
}

/** Returns false when the browser cannot persist preferences between sessions. */
export function saveGameSettings(scene: Phaser.Scene, settings: GameSettings): boolean {
  const safe = normalizeSettings(settings);
  scene.registry.set('settings', safe);
  scene.game.events.emit('settingsChanged', safe);
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(safe)); return true; }
  catch { return false; }
}

/** German number format for the one-decimal timings shown in tooltips and tower menus. */
export function formatSeconds(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function uiText(scene: Phaser.Scene, x: number, y: number, text: string, size = 18,
  color: string = UI.text, width?: number): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: UI.font, fontSize: `${size}px`, color, lineSpacing: 7,
    ...(width ? { wordWrap: { width, useAdvancedWrap: true } } : {})
  });
}

export function displayText(scene: Phaser.Scene, x: number, y: number, text: string, size: number): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: UI.display, fontSize: `${size}px`, color: UI.text,
    shadow: { offsetX: 0, offsetY: 2, color: '#050a0e', blur: 14, fill: true }
  });
}

export function menuBackdrop(scene: Phaser.Scene, cinematic = false): void {
  const { width, height } = scene.scale;
  scene.add.rectangle(0, 0, width, height, UI.ink).setOrigin(0);
  if (scene.textures.exists('stone-age-bg')) {
    const art = scene.add.image(width / 2, height / 2, 'stone-age-bg');
    art.setScale(Math.max(width / art.width, height / art.height));
    art.setAlpha(cinematic ? 0.83 : 0.2);
  }
  // Canvas textures preserve the vignette in both the WebGL and Canvas renderers.
  const shadeKey = `menu-shade-${cinematic ? 'hero' : 'page'}-${width}-${height}`;
  if (!scene.textures.exists(shadeKey)) {
    const texture = scene.textures.createCanvas(shadeKey, width, height);
    if (texture) {
      const context = texture.context;
      const horizontal = context.createLinearGradient(0, 0, width, 0);
      horizontal.addColorStop(0, 'rgba(11,18,24,0.97)');
      horizontal.addColorStop(0.45, cinematic ? 'rgba(11,18,24,0.65)' : 'rgba(11,18,24,0.82)');
      horizontal.addColorStop(1, cinematic ? 'rgba(11,18,24,0.12)' : 'rgba(11,18,24,0.65)');
      context.fillStyle = horizontal;
      context.fillRect(0, 0, width, height);
      const vertical = context.createLinearGradient(0, height * 0.48, 0, height);
      vertical.addColorStop(0, 'rgba(11,18,24,0)');
      vertical.addColorStop(1, 'rgba(11,18,24,0.85)');
      context.fillStyle = vertical;
      context.fillRect(0, 0, width, height);
      texture.refresh();
    }
  }
  if (scene.textures.exists(shadeKey)) scene.add.image(0, 0, shadeKey).setOrigin(0);
  const shade = scene.add.graphics();
  shade.fillStyle(UI.ink, 0.86).fillRect(0, height - 66, width, 66);
  shade.lineStyle(1, UI.gold, 0.24).lineBetween(48, height - 66, width - 48, height - 66);
  uiText(scene, 54, height - 41, 'AGE OF MAX', 12, UI.goldText).setLetterSpacing(3);
  uiText(scene, width - 54, height - 41, 'Fünf Zeitalter. Ein Schlachtfeld.', 13, UI.muted).setOrigin(1, 0);
}

export function menuHeader(scene: Phaser.Scene, eyebrow: string, title: string, description: string): void {
  uiText(scene, 80, 53, eyebrow, 13, UI.goldText).setLetterSpacing(3);
  displayText(scene, 78, 83, title, 46);
  uiText(scene, 80, 146, description, 18, UI.muted);
}

export interface MenuButton {
  area: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  focus: (active: boolean) => void;
  activate: () => void;
}

export function menuButton(scene: Phaser.Scene, x: number, y: number, width: number, height: number,
  text: string, action: () => void, primary = false): MenuButton {
  const area = scene.add.rectangle(x, y, width, height, primary ? UI.gold : UI.panel, primary ? 1 : 0.92)
    .setOrigin(0).setStrokeStyle(1, primary ? UI.goldBright : UI.line, primary ? 0.8 : 0.65)
    .setInteractive({ useHandCursor: true });
  const label = uiText(scene, x + 22, y + height / 2, text, 18, primary ? '#172025' : UI.text).setOrigin(0, 0.5);
  const arrow = uiText(scene, x + width - 23, y + height / 2, '›', 26, primary ? '#172025' : UI.goldText).setOrigin(1, 0.5);
  const focus = (active: boolean) => {
    area.setFillStyle(primary ? (active ? UI.goldBright : UI.gold) : (active ? UI.panelHover : UI.panel), 1);
    area.setStrokeStyle(active ? 2 : 1, active ? UI.goldBright : primary ? UI.gold : UI.line, active ? 1 : 0.7);
    arrow.setX(x + width - (active ? 19 : 23));
  };
  const activate = () => { if (area.input?.enabled) action(); };
  area.on('pointerover', () => focus(true)).on('pointerout', () => focus(false)).on('pointerdown', activate);
  return { area, label, focus, activate };
}

/** Menus accept mouse, touch, Tab / arrow navigation and Enter. */
export function menuKeyboard(scene: Phaser.Scene, getButtons: () => MenuButton[], escape?: () => void): void {
  let index = -1;
  const handler = (event: KeyboardEvent) => {
    if (!consumeKeyboardEvent(event)) return;
    const buttons = getButtons().filter(button => button.area.active && button.area.input?.enabled);
    if (event.key === 'Escape') { escape?.(); return; }
    if (!buttons.length) return;
    if (['Tab', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      buttons.forEach(button => button.focus(false));
      const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.shiftKey ? -1 : 1;
      index = index < 0 ? (direction > 0 ? 0 : buttons.length - 1) : Phaser.Math.Wrap(index + direction, 0, buttons.length);
      buttons[index].focus(true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      buttons[index >= 0 && index < buttons.length ? index : 0].activate();
    }
  };
  scene.input.keyboard?.on('keydown', handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.input.keyboard?.off('keydown', handler));
}
