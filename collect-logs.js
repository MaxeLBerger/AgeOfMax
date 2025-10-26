/**
 * AUTOMATIC LOG COLLECTOR FOR MCP ANALYSIS
 * 
 * This script runs in the browser console and automatically:
 * 1. Collects all texture and spawn logs
 * 2. Exports them to a downloadable JSON file
 * 3. Displays analysis in console
 * 
 * Usage:
 * 1. Start the game
 * 2. Press F3 (Developer Mode)
 * 3. Copy/paste this entire script into browser console
 * 4. Play for 60 seconds
 * 5. Script automatically downloads logs/game-logs-[timestamp].json
 */

console.log('%c=== MCP LOG COLLECTOR STARTED ===', 'color: #00ff00; font-size: 16px; font-weight: bold');
console.log('Collecting logs for 60 seconds...');
console.log('Please spawn units and play normally!');

const logCollector = {
  startTime: Date.now(),
  allConsoleLogs: [],
  textureLogs: [],
  spawnLogs: [],
  
  // Intercept console.log
  originalLog: console.log,
  
  init() {
    const self = this;
    console.log = function(...args) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      self.allConsoleLogs.push({
        timestamp: Date.now(),
        message: message,
        args: args
      });
      
      // Parse texture selection logs
      if (message.includes('Texture Selection:')) {
        const match = message.match(/Texture Selection: (.+?) \((.+?)\)  (.+?) \[(\d+)\/(\d+) variants\]/);
        if (match) {
          self.textureLogs.push({
            timestamp: Date.now(),
            unitName: match[1],
            unitId: match[2],
            selectedTexture: match[3],
            variantIndex: parseInt(match[4]),
            totalVariants: parseInt(match[5]),
            fullMessage: message
          });
        }
      }
      
      // Parse spawn logs
      if (message.includes('Spawned') && message.includes('Texture:')) {
        const match = message.match(/Spawned (.+?) \((.+?)\) \| Texture: (.+?) \| HP: (.+?) \| DMG: (.+?) \| SPD: (.+?) \| Epoch: (.+)/);
        if (match) {
          self.spawnLogs.push({
            timestamp: Date.now(),
            unitName: match[1],
            side: match[2],
            texture: match[3],
            hp: match[4],
            damage: match[5],
            speed: match[6],
            epoch: match[7],
            fullMessage: message
          });
        }
      }
      
      // Call original console.log
      self.originalLog.apply(console, args);
    };
    
    console.log(' Log collector initialized');
    console.log(' Console.log intercepted');
  },
  
  analyze() {
    console.log = this.originalLog; // Restore original console.log
    
    console.log('\n%c=== LOG COLLECTION COMPLETE ===', 'color: #00ff00; font-size: 16px; font-weight: bold');
    console.log(`Duration: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
    console.log(`Total Console Logs: ${this.allConsoleLogs.length}`);
    console.log(`Texture Selection Logs: ${this.textureLogs.length}`);
    console.log(`Spawn Logs: ${this.spawnLogs.length}`);
    
    console.log('\n%c=== TEXTURE SELECTION LOGS ===', 'color: #ffaa00; font-size: 14px; font-weight: bold');
    this.textureLogs.forEach((log, i) => {
      console.log(`${i+1}. ${log.unitName} (${log.unitId})  ${log.selectedTexture} [${log.variantIndex}/${log.totalVariants}]`);
    });
    
    console.log('\n%c=== SPAWN LOGS ===', 'color: #00aaff; font-size: 14px; font-weight: bold');
    this.spawnLogs.forEach((log, i) => {
      console.log(`${i+1}. ${log.unitName} (${log.side}) | Texture: ${log.texture} | HP: ${log.hp} | Epoch: ${log.epoch}`);
    });
    
    console.log('\n%c=== VERIFICATION ANALYSIS ===', 'color: #ff00ff; font-size: 14px; font-weight: bold');
    
    let matches = 0;
    let mismatches = 0;
    const issues = [];
    
    this.textureLogs.forEach((texLog, i) => {
      const spawnLog = this.spawnLogs[i];
      
      if (!spawnLog) {
        issues.push({
          type: 'MISSING_SPAWN',
          index: i + 1,
          textureLog: texLog,
          message: `Texture log ${i+1} has no corresponding spawn log`
        });
        return;
      }
      
      const textureMatches = texLog.selectedTexture === spawnLog.texture;
      const nameMatches = texLog.unitName === spawnLog.unitName;
      
      if (textureMatches && nameMatches) {
        console.log(`%c MATCH ${i+1}: ${texLog.unitName}  ${texLog.selectedTexture}`, 'color: #00ff00');
        matches++;
      } else {
        console.log(`%c MISMATCH ${i+1}:`, 'color: #ff0000; font-weight: bold');
        console.log(`   Expected: ${texLog.unitName} with texture "${texLog.selectedTexture}"`);
        console.log(`   Got: ${spawnLog.unitName} with texture "${spawnLog.texture}"`);
        mismatches++;
        
        issues.push({
          type: 'TEXTURE_MISMATCH',
          index: i + 1,
          textureLog: texLog,
          spawnLog: spawnLog,
          message: `Expected "${texLog.selectedTexture}" but got "${spawnLog.texture}"`
        });
      }
    });
    
    console.log('\n%c=== SUMMARY ===', 'color: #ffffff; font-size: 14px; font-weight: bold');
    console.log(`Total Matches: ${matches}`);
    console.log(`Total Mismatches: ${mismatches}`);
    console.log(`Match Rate: ${matches > 0 ? ((matches / (matches + mismatches)) * 100).toFixed(2) : 0}%`);
    
    if (issues.length > 0) {
      console.log('\n%c=== ISSUES FOUND ===', 'color: #ff0000; font-size: 14px; font-weight: bold');
      issues.forEach((issue, i) => {
        console.log(`${i+1}. [${issue.type}] ${issue.message}`);
      });
    } else if (matches > 0) {
      console.log('\n%c ALL TEXTURE VERIFICATIONS PASSED!', 'color: #00ff00; font-size: 16px; font-weight: bold');
    }
    
    return {
      summary: {
        duration: (Date.now() - this.startTime) / 1000,
        totalLogs: this.allConsoleLogs.length,
        textureSelectionCount: this.textureLogs.length,
        spawnCount: this.spawnLogs.length,
        matches: matches,
        mismatches: mismatches,
        matchRate: matches > 0 ? ((matches / (matches + mismatches)) * 100).toFixed(2) : 0,
        issues: issues
      },
      textureLogs: this.textureLogs,
      spawnLogs: this.spawnLogs,
      allLogs: this.allConsoleLogs
    };
  },
  
  downloadJSON(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `game-logs-${timestamp}.json`;
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`\n%c Downloaded: ${filename}`, 'color: #00ff00; font-size: 14px');
    console.log('Please upload this file for MCP analysis!');
  }
};

// Initialize collector
logCollector.init();

// Auto-collect after 60 seconds
setTimeout(() => {
  const results = logCollector.analyze();
  logCollector.downloadJSON(results);
  
  console.log('\n%c=== INSTRUCTIONS ===', 'color: #ffff00; font-size: 14px; font-weight: bold');
  console.log('1. Check your Downloads folder for game-logs-[timestamp].json');
  console.log('2. Upload the file or copy the content');
  console.log('3. I will analyze it for texture mismatches');
  console.log('\nYou can also access the data via: window.gameLoggerResults');
  
  window.gameLoggerResults = results;
}, 60000);

console.log('\n Timer started: 60 seconds');
console.log(' Tip: Press F3 to enable Developer Mode if not already active!');
console.log(' Tip: Spawn different units to test all textures!');
