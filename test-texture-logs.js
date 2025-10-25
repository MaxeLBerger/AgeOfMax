// Manual Test Script - Run this in browser console
console.log('=== STARTING MANUAL TEXTURE VERIFICATION TEST ===');

// Store all logs
const allLogs = [];
const originalLog = console.log;
console.log = function(...args) {
  const text = args.join(' ');
  allLogs.push(text);
  originalLog.apply(console, args);
};

// Wait for game to load
setTimeout(() => {
  console.log('Test complete. Analyzing logs...');
  
  const textureSelectionLogs = allLogs.filter(log => log.includes('Texture Selection:'));
  const spawnLogs = allLogs.filter(log => log.includes('Spawned') && log.includes('Texture:'));
  
  console.log('\n===== TEXTURE SELECTION LOGS =====');
  textureSelectionLogs.forEach(log => console.log(log));
  
  console.log('\n===== SPAWN LOGS =====');
  spawnLogs.forEach(log => console.log(log));
  
  console.log(\\nTotal Texture Selections: \\);
  console.log(\Total Spawns: \\);
}, 30000);
