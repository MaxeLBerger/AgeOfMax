import Phaser from 'phaser';
import { unitNames, unitRoles } from '../ui/catalog';

/** Inspection follows a living unit and never survives a pooled sprite's identity. */
export class UnitSelectionSystem {
  private unit?: Phaser.Physics.Arcade.Sprite;
  private uid = -1;
  private panel?: Phaser.GameObjects.Container;
  private name?: Phaser.GameObjects.Text;
  private stats?: Phaser.GameObjects.Text;
  private ring?: Phaser.GameObjects.Ellipse;

  constructor(private scene: Phaser.Scene) {
    const select = (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject) => {
      if (object.getData('isUnit')) this.selectUnit(object as Phaser.Physics.Arcade.Sprite);
      else this.clearSelection();
    };
    const update = () => this.update();
    // Clicking the empty battlefield puts the inspection panel away again.
    const dismiss = (_pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.some(object => object.getData('isUnit'))) this.clearSelection();
    };
    scene.input.on('gameobjectdown', select); scene.input.on('pointerdown', dismiss);
    scene.events.on(Phaser.Scenes.Events.UPDATE, update);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('gameobjectdown', select); scene.input.off('pointerdown', dismiss);
      scene.events.off(Phaser.Scenes.Events.UPDATE, update); this.clearSelection();
    });
  }

  selectUnit(unit: Phaser.Physics.Arcade.Sprite): void {
    if (this.unit === unit && this.uid === unit.getData('uid')) { this.clearSelection(); return; }
    this.clearSelection(); this.unit = unit; this.uid = unit.getData('uid');
    const background = this.scene.add.rectangle(0, 0, 462, 60, 0x09141d, 0.93).setStrokeStyle(1, 0xc9a66a, 0.55);
    const style = { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#e4ca96' };
    this.name = this.scene.add.text(0, -19, '', style).setOrigin(0.5);
    this.stats = this.scene.add.text(0, 6, '', { ...style, fontSize: '12px', color: '#adbebd' }).setOrigin(0.5);
    this.panel = this.scene.add.container(640, 120, [background, this.name, this.stats]).setDepth(1600);
    this.ring = this.scene.add.ellipse(unit.x, unit.y, 38, 11).setStrokeStyle(2, 0xe8c785, 0.9).setDepth(1401);
    this.update();
  }

  private update(): void {
    const unit = this.unit; if (!unit) return;
    if (!unit.active || unit.getData('uid') !== this.uid) { this.clearSelection(); return; }
    const id = unit.getData('unitId');
    this.name?.setText(`${unit.getData('side') === 'player' ? 'DEINE EINHEIT' : 'GEGNER'}  ·  ${unitNames[id] || id}`);
    this.stats?.setText(`${Math.max(0, Math.ceil(unit.getData('hp')))} / ${unit.getData('maxHp')} LP   ·   ${unit.getData('damage')} Schaden   ·   ${unitRoles[id] || ''}`);
    this.ring?.setPosition(unit.x, unit.y + 2);
  }

  clearSelection(): void { this.panel?.destroy(); this.ring?.destroy(); this.panel = undefined; this.ring = undefined; this.unit = undefined; }
}
