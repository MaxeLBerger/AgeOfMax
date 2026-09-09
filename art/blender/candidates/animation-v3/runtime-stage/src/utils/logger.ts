/**
 * Game Logger Service
 * Captures all game logs for MCP analysis and debugging
 */

export interface GameLog {
  timestamp: number;
  type: 'texture' | 'spawn' | 'combat' | 'epoch' | 'general';
  message: string;
  data?: any;
}

class GameLogger {
  private logs: GameLog[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  
  log(type: GameLog['type'], message: string, data?: any) {
    const logEntry: GameLog = {
      timestamp: Date.now(),
      type,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Also log to console
    console.log(`[${type.toUpperCase()}] ${message}`, data || '');
  }
  
  textureSelection(unitName: string, unitId: string, selectedTexture: string, variantIndex: number, totalVariants: number) {
    this.log('texture', `Texture Selection: ${unitName} (${unitId}) → ${selectedTexture} [${variantIndex}/${totalVariants} variants]`, {
      unitName,
      unitId,
      selectedTexture,
      variantIndex,
      totalVariants
    });
  }
  
  unitSpawn(name: string, side: string, texture: string, hp: string, damage: number, speed: number, epoch: string) {
    this.log('spawn', `Spawned ${name} (${side}) | Texture: ${texture} | HP: ${hp} | DMG: ${damage} | SPD: ${speed} | Epoch: ${epoch}`, {
      name,
      side,
      texture,
      hp,
      damage,
      speed,
      epoch
    });
  }
  
  getLogs(type?: GameLog['type']): GameLog[] {
    if (type) {
      return this.logs.filter(log => log.type === type);
    }
    return [...this.logs];
  }
  
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
  
  clear() {
    this.logs = [];
  }
  
  // Get summary statistics
  getStats() {
    const stats = {
      total: this.logs.length,
      byType: {} as Record<string, number>
    };
    
    this.logs.forEach(log => {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
    });
    
    return stats;
  }
}

// Singleton instance
export const gameLogger = new GameLogger();

// Make it globally accessible for debugging
if (typeof window !== 'undefined') {
  (window as any).gameLogger = gameLogger;
}
