import * as fs from 'fs';
import * as path from 'path';

/**
 * Game Analysis Tools for Age of Max
 * Analyzes missing features, generates fixes, and manages issues
 */

export interface GameIssue {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'Small' | 'Medium' | 'Large';
  details: string[];
  status?: 'pending' | 'in-progress' | 'completed' | 'failed';
  fixCode?: string;
  files?: string[];
}

export interface AnalysisResult {
  issues: GameIssue[];
  totalCount: number;
  byPriority: { HIGH: number; MEDIUM: number; LOW: number };
  byCategory: Record<string, number>;
  completionPercentage: number;
}

export class GameAnalyzer {
  private issuesFile: string;
  
  constructor(projectRoot: string = process.cwd()) {
    this.issuesFile = path.join(projectRoot, 'mcp-analysis-issues.json');
  }
  
  /**
   * Load all issues from the analysis file
   */
  loadIssues(): AnalysisResult {
    try {
      const data = fs.readFileSync(this.issuesFile, 'utf-8');
      const parsed = JSON.parse(data);
      const issues: GameIssue[] = parsed.analysis?.missing_features || [];
      
      const byPriority = {
        HIGH: issues.filter(i => i.priority === 'HIGH').length,
        MEDIUM: issues.filter(i => i.priority === 'MEDIUM').length,
        LOW: issues.filter(i => i.priority === 'LOW').length
      };
      
      const byCategory: Record<string, number> = {};
      issues.forEach(issue => {
        byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      });
      
      const completionPercentage = parseInt(parsed.analysis?.current_completion || '0');
      
      return {
        issues,
        totalCount: issues.length,
        byPriority,
        byCategory,
        completionPercentage
      };
    } catch (error) {
      console.error('Failed to load issues:', error);
      return {
        issues: [],
        totalCount: 0,
        byPriority: { HIGH: 0, MEDIUM: 0, LOW: 0 },
        byCategory: {},
        completionPercentage: 0
      };
    }
  }
  
  /**
   * Get issues filtered by priority
   */
  getIssuesByPriority(priority: 'HIGH' | 'MEDIUM' | 'LOW'): GameIssue[] {
    const analysis = this.loadIssues();
    return analysis.issues.filter(i => i.priority === priority);
  }
  
  /**
   * Get issues filtered by category
   */
  getIssuesByCategory(category: string): GameIssue[] {
    const analysis = this.loadIssues();
    return analysis.issues.filter(i => i.category.toLowerCase() === category.toLowerCase());
  }
  
  /**
   * Generate fix code for a specific issue
   */
  generateFix(issue: GameIssue): string {
    const fixes: Record<string, () => string> = {
      'XP Gain Visual Feedback': () => this.generateXPFeedbackFix(),
      'Gold Gain Visual Feedback': () => this.generateGoldFeedbackFix(),
      'Unit Formation System': () => this.generateFormationFix(),
      'Kill Streak Gold Bonus': () => this.generateKillStreakFix(),
      'Unit Selection & Info': () => this.generateUnitSelectionFix(),
      'Sound Effects System': () => this.generateSoundSystemFix(),
      'Background Music System': () => this.generateMusicSystemFix()
    };
    
    const generator = fixes[issue.title];
    if (generator) {
      return generator();
    }
    
    return `// TODO: Implement ${issue.title}\n// ${issue.description}\n// Details: ${issue.details.join(', ')}`;
  }
  
  /**
   * Generate XP feedback fix code
   */
  private generateXPFeedbackFix(): string {
    return `
// XP Visual Feedback System
class XPFeedbackSystem {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  showXPGain(x: number, y: number, amount: number) {
    const text = this.scene.add.text(x, y, \`+\${amount} XP\`, {
      fontSize: '20px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold'
    });
    
    // Floating animation
    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
    
    // Particle effect
    const particles = this.scene.add.particles(x, y, 'sparkle', {
      speed: { min: 50, max: 100 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1000,
      quantity: 5,
      tint: 0xFFD700
    });
    
    this.scene.time.delayedCall(1000, () => particles.destroy());
  }
}

// Usage in BattleScene when unit dies:
// this.xpFeedback.showXPGain(unit.x, unit.y, xpAmount);
`;
  }
  
  /**
   * Generate Gold feedback fix code
   */
  private generateGoldFeedbackFix(): string {
    return `
// Gold Visual Feedback System
class GoldFeedbackSystem {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  showGoldGain(x: number, y: number, amount: number, isPassive: boolean = false) {
    const color = isPassive ? '#FFA500' : '#FFD700';
    const text = this.scene.add.text(x, y, \`+\${amount}💰\`, {
      fontSize: '18px',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold'
    });
    
    // Floating animation
    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
    
    // Coin animation
    if (!isPassive) {
      const coin = this.scene.add.sprite(x, y, 'coin');
      this.scene.tweens.add({
        targets: coin,
        y: y - 30,
        alpha: 0,
        scale: 1.5,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => coin.destroy()
      });
    }
  }
  
  animateCounterIncrement(counterText: Phaser.GameObjects.Text, newValue: number) {
    // Scale pulse effect
    this.scene.tweens.add({
      targets: counterText,
      scale: 1.2,
      duration: 150,
      yoyo: true,
      ease: 'Power2'
    });
  }
}
`;
  }
  
  /**
   * Generate Formation fix code
   */
  private generateFormationFix(): string {
    return `
// Unit Formation System
class FormationManager {
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
`;
  }
  
  /**
   * Generate Kill Streak fix code
   */
  private generateKillStreakFix(): string {
    return `
// Kill Streak System
class KillStreakManager {
  private scene: Phaser.Scene;
  private currentStreak: number = 0;
  private lastKillTime: number = 0;
  private readonly STREAK_TIMEOUT = 5000; // 5 seconds
  private streakText?: Phaser.GameObjects.Text;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  registerKill(gold: number): number {
    const now = Date.now();
    
    // Reset streak if timeout expired
    if (now - this.lastKillTime > this.STREAK_TIMEOUT) {
      this.currentStreak = 0;
    }
    
    this.currentStreak++;
    this.lastKillTime = now;
    
    // Calculate bonus multiplier
    const multiplier = this.getMultiplier();
    const bonusGold = Math.floor(gold * (multiplier - 1));
    
    // Show streak feedback
    if (this.currentStreak > 1) {
      this.showStreakFeedback();
    }
    
    return bonusGold;
  }
  
  private getMultiplier(): number {
    if (this.currentStreak >= 10) return 2.0;
    if (this.currentStreak >= 5) return 1.5;
    if (this.currentStreak >= 3) return 1.2;
    return 1.0;
  }
  
  private showStreakFeedback() {
    // Remove old streak text
    if (this.streakText) {
      this.streakText.destroy();
    }
    
    const multiplier = this.getMultiplier();
    const streakMsg = \`🔥 \${this.currentStreak}x STREAK! +\${Math.floor((multiplier - 1) * 100)}% Gold\`;
    
    this.streakText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      100,
      streakMsg,
      {
        fontSize: '24px',
        color: '#FF6600',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.streakText,
      scale: 1.2,
      duration: 200,
      yoyo: true,
      repeat: 2
    });
    
    // Auto-hide after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      if (this.streakText) {
        this.streakText.destroy();
      }
    });
  }
  
  reset() {
    this.currentStreak = 0;
    this.lastKillTime = 0;
    if (this.streakText) {
      this.streakText.destroy();
    }
  }
}
`;
  }
  
  /**
   * Generate Unit Selection fix code
   */
  private generateUnitSelectionFix(): string {
    return `
// Unit Selection System
class UnitSelectionSystem {
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
      \`Unit: \${unitData.name || 'Unknown'}\`,
      \`HP: \${Math.floor(unit.health)}/ \${unitData.maxHealth || 100}\`,
      \`Damage: \${unitData.damage || 10}\`,
      \`Speed: \${unitData.speed || 50}\`,
      \`Kills: \${unit.getData('kills') || 0}\`,
      \`Rank: \${unit.getData('rank') || 'Recruit'}\`
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
`;
  }
  
  /**
   * Generate Sound System fix code
   */
  private generateSoundSystemFix(): string {
    return `
// Sound Effects System
class SoundEffectsManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private volume: number = 0.5;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.loadSounds();
  }
  
  private loadSounds() {
    // Define sound effects (you'll need to add actual audio files)
    const soundList = [
      'unit_spawn', 'sword_clash', 'arrow_fire', 'gun_shot',
      'explosion', 'base_damage', 'gold_collect', 'xp_gain',
      'epoch_advance', 'ability_cast', 'turret_fire',
      'victory', 'defeat'
    ];
    
    // Load each sound
    soundList.forEach(key => {
      // this.scene.load.audio(key, \`assets/sounds/\${key}.mp3\`);
    });
  }
  
  play(soundKey: string, volume?: number) {
    try {
      const sound = this.scene.sound.add(soundKey, {
        volume: volume !== undefined ? volume : this.volume
      });
      sound.play();
      this.sounds.set(soundKey, sound);
    } catch (error) {
      console.warn(\`Sound not found: \${soundKey}\`);
    }
  }
  
  playUnitSpawn(epoch: number) {
    this.play('unit_spawn', 0.3);
  }
  
  playCombat(weaponType: string) {
    const soundMap: Record<string, string> = {
      'melee': 'sword_clash',
      'ranged': 'arrow_fire',
      'gun': 'gun_shot',
      'explosive': 'explosion'
    };
    this.play(soundMap[weaponType] || 'sword_clash', 0.4);
  }
  
  playGoldCollect() {
    this.play('gold_collect', 0.5);
  }
  
  playXPGain() {
    this.play('xp_gain', 0.4);
  }
  
  playEpochAdvance() {
    this.play('epoch_advance', 0.8);
  }
  
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }
  
  stopAll() {
    this.sounds.forEach(sound => sound.stop());
    this.sounds.clear();
  }
}
`;
  }
  
  /**
   * Generate Music System fix code
   */
  private generateMusicSystemFix(): string {
    return `
// Background Music System
class MusicManager {
  private scene: Phaser.Scene;
  private currentMusic?: Phaser.Sound.BaseSound;
  private volume: number = 0.3;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  playMenuMusic() {
    this.switchMusic('menu_music');
  }
  
  playBattleMusic(epoch: number) {
    const musicTracks: Record<number, string> = {
      1: 'battle_ancient',
      2: 'battle_medieval',
      3: 'battle_renaissance',
      4: 'battle_modern',
      5: 'battle_future'
    };
    const track = musicTracks[epoch] || 'battle_ancient';
    this.switchMusic(track);
  }
  
  playVictoryMusic() {
    this.switchMusic('victory_music');
  }
  
  playDefeatMusic() {
    this.switchMusic('defeat_music');
  }
  
  private switchMusic(key: string) {
    // Stop current music
    if (this.currentMusic) {
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: 0,
        duration: 1000,
        onComplete: () => {
          this.currentMusic?.stop();
          this.startMusic(key);
        }
      });
    } else {
      this.startMusic(key);
    }
  }
  
  private startMusic(key: string) {
    try {
      this.currentMusic = this.scene.sound.add(key, {
        loop: true,
        volume: 0
      });
      this.currentMusic.play();
      
      // Fade in
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: this.volume,
        duration: 2000
      });
    } catch (error) {
      console.warn(\`Music not found: \${key}\`);
    }
  }
  
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.setVolume(this.volume);
    }
  }
  
  stop() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = undefined;
    }
  }
}
`;
  }
  
  /**
   * Create individual issue files for GitHub
   */
  createIssueFiles(outputDir: string = './generated-issues'): void {
    const analysis = this.loadIssues();
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    analysis.issues.forEach((issue, index) => {
      const filename = `${String(index + 1).padStart(2, '0')}_${issue.title.replace(/[^a-z0-9]/gi, '_')}.md`;
      const filepath = path.join(outputDir, filename);
      
      const content = this.generateIssueMarkdown(issue);
      fs.writeFileSync(filepath, content);
    });
    
    console.log(`✅ Created ${analysis.issues.length} issue files in ${outputDir}`);
  }
  
  /**
   * Generate markdown content for an issue
   */
  private generateIssueMarkdown(issue: GameIssue): string {
    return `# ${issue.title}

**Priority:** ${issue.priority}  
**Category:** ${issue.category}  
**Effort:** ${issue.effort}  
**Impact:** ${issue.impact}

## Description
${issue.description}

## Details
${issue.details.map(d => `- ${d}`).join('\n')}

## Status
${issue.status || 'pending'}

## Suggested Implementation

\`\`\`typescript
${this.generateFix(issue)}
\`\`\`

## Files to Modify
- src/scenes/BattleScene.ts
- src/game/types.ts
- src/utils/ (new utility files)

## Testing Checklist
- [ ] Feature works as expected
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] UI/UX is polished
- [ ] Code is documented
`;
  }
}

export default GameAnalyzer;
