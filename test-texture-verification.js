console.log('===== AGE OF MAX - TEXTURE VERIFICATION SCRIPT =====');
console.log('This script will:');
console.log('1. Wait 30 seconds for gameplay');
console.log('2. Export all logs from gameLogger');
console.log('3. Verify texture selections match spawned units');
console.log('===================================================\n');

setTimeout(() => {
  console.log('\n===== COLLECTING LOGS FROM GAMELOGGER =====\n');
  
  const logger = window.gameLogger;
  
  if (!logger) {
    console.error('ERROR: gameLogger not found! Make sure the game is loaded.');
    return;
  }
  
  const textureLogs = logger.getLogs('texture');
  const spawnLogs = logger.getLogs('spawn');
  const stats = logger.getStats();
  
  console.log('===== LOGGER STATISTICS =====');
  console.log('Total Logs:', stats.total);
  console.log('Texture Logs:', textureLogs.length);
  console.log('Spawn Logs:', spawnLogs.length);
  console.log('\n');
  
  console.log('===== TEXTURE SELECTION LOGS =====');
  textureLogs.forEach((log, index) => {
    console.log(\\. \ (\)  \ [\/\]\);
  });
  
  console.log('\n===== SPAWN LOGS =====');
  spawnLogs.forEach((log, index) => {
    console.log(\\. \ (\) | Texture: \ | HP: \ | Epoch: \\);
  });
  
  console.log('\n===== TEXTURE VERIFICATION =====');
  
  let matches = 0;
  let mismatches = 0;
  const issues = [];
  
  textureLogs.forEach((textureLog, index) => {
    const spawnLog = spawnLogs[index];
    
    if (!spawnLog) {
      issues.push(\Missing spawn log for texture log \\);
      return;
    }
    
    const textureMatches = textureLog.data.selectedTexture === spawnLog.data.texture;
    const nameMatches = textureLog.data.unitName === spawnLog.data.name;
    
    if (textureMatches && nameMatches) {
      console.log(\ MATCH \: \  \\);
      matches++;
    } else {
      console.log(\ MISMATCH \:\);
      console.log(\   Expected: \ with texture \\);
      console.log(\   Got: \ with texture \\);
      mismatches++;
      issues.push(\Mismatch at index \: expected \, got \\);
    }
  });
  
  console.log('\n===== VERIFICATION SUMMARY =====');
  console.log(\Total Matches: \\);
  console.log(\Total Mismatches: \\);
  console.log(\Match Rate: \%\);
  
  if (issues.length > 0) {
    console.log('\n===== ISSUES FOUND =====');
    issues.forEach(issue => console.log('- ' + issue));
  } else {
    console.log('\n ALL TEXTURE VERIFICATIONS PASSED!');
  }
  
  console.log('\n===== EXPORT LOGS (Copy to save) =====');
  console.log(logger.exportLogs());
  
}, 30000);

console.log('Waiting 30 seconds for gameplay... Open Developer Mode with F3 and spawn some units!');
