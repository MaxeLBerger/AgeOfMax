import { test, expect } from '@playwright/test';

test.describe('Developer Mode - Unit Texture Verification', () => {
  test('Verify texture logging matches spawned units', async ({ page }) => {
    const consoleLogs: string[] = [];
    const textureSelectionLogs: any[] = [];
    const spawnLogs: any[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      
      // Log everything for debugging
      if (text.includes('Texture') || text.includes('Spawned')) {
        console.log('CAPTURED:', text);
      }
      
      if (text.includes('Texture Selection:')) {
        const match = text.match(/Texture Selection: (.+?) \((.+?)\) . (.+?) \[(\d+)\/(\d+) variants\]/);
        if (match) {
          textureSelectionLogs.push({
            name: match[1],
            id: match[2],
            selectedTexture: match[3],
            variantIndex: parseInt(match[4]),
            totalVariants: parseInt(match[5])
          });
        }
      }
      
      if (text.includes('Spawned')) {
        const match = text.match(/Spawned (.+?) \((.+?)\) \| Texture: (.+?) \|/);
        if (match) {
          spawnLogs.push({
            name: match[1],
            side: match[2],
            texture: match[3]
          });
        }
      }
    });
    
    await page.goto('http://localhost:5175');
    await page.waitForTimeout(3000);
    
    console.log('Enabling Developer Mode (F3)...');
    await page.keyboard.press('F3');
    await page.waitForTimeout(1000);
    
    console.log('Spawning units...');
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('u');
      await page.waitForTimeout(800);
    }
    
    await page.waitForTimeout(10000);
    
    console.log('TEXTURE VERIFICATION REPORT');
    console.log('Texture Selection Logs:', textureSelectionLogs.length);
    console.log('Spawn Logs:', spawnLogs.length);
    
    let matchCount = 0;
    let mismatchCount = 0;
    
    textureSelectionLogs.forEach((textureLog, index) => {
      const spawnLog = spawnLogs[index];
      
      if (spawnLog) {
        const matches = textureLog.selectedTexture === spawnLog.texture;
        if (matches) {
          console.log(`MATCH: ${textureLog.name} -> ${textureLog.selectedTexture}`);
          matchCount++;
        } else {
          console.log(`MISMATCH: Expected ${textureLog.selectedTexture}, Got ${spawnLog.texture}`);
          mismatchCount++;
        }
      }
    });
    
    console.log(`Matches: ${matchCount}, Mismatches: ${mismatchCount}`);
    
    expect(textureSelectionLogs.length).toBeGreaterThan(0);
    expect(spawnLogs.length).toBeGreaterThan(0);
    expect(mismatchCount).toBe(0);
  });
});
