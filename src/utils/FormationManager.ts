
// Unit Formation System
export class FormationManager {
  private scene: Phaser.Scene;
  private spawnQueue: Array<{unit: any, lane: number}> = [];
  private laneOffsets: Map<number, number> = new Map();
  private readonly VERTICAL_SPACING = 20;
  private readonly MAX_QUEUE_SIZE = 5;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  getSpawnPosition(baseX: number, baseY: number, lane: number): {x: number, y: number} {
    // Get current offset for this lane
    const currentOffset = this.laneOffsets.get(lane) || 0;
    
    // Calculate staggered position
    const offsetY = (currentOffset % 3) * this.VERTICAL_SPACING - this.VERTICAL_SPACING;
    const offsetX = Math.floor(currentOffset / 3) * 30;
    
    // Update offset for next unit
    this.laneOffsets.set(lane, (currentOffset + 1) % 9);
    
    return {
      x: baseX + offsetX,
      y: baseY + offsetY
    };
  }
  
  queueSpawn(unit: any, lane: number) {
    if (this.spawnQueue.length >= this.MAX_QUEUE_SIZE) {
      // Delay spawn if queue is full
      this.scene.time.delayedCall(500, () => this.queueSpawn(unit, lane));
      return;
    }
    
    this.spawnQueue.push({unit, lane});
    this.processQueue();
  }
  
  private processQueue() {
    if (this.spawnQueue.length === 0) return;
    
    const {unit, lane} = this.spawnQueue.shift()!;
    const pos = this.getSpawnPosition(unit.x, unit.y, lane);
    
    // Show spawn indicator
    this.showSpawnIndicator(pos.x, pos.y);
    
    // Tween unit to formation position
    this.scene.tweens.add({
      targets: unit,
      x: pos.x,
      y: pos.y,
      duration: 300,
      ease: 'Power2'
    });
    
    // Process next in queue
    if (this.spawnQueue.length > 0) {
      this.scene.time.delayedCall(200, () => this.processQueue());
    }
  }
  
  private showSpawnIndicator(x: number, y: number) {
    const indicator = this.scene.add.circle(x, y, 10, 0x00FF00, 0.5);
    this.scene.tweens.add({
      targets: indicator,
      scale: 2,
      alpha: 0,
      duration: 500,
      onComplete: () => indicator.destroy()
    });
  }
}

