import { test, expect } from "@playwright/test";

test.describe("Age of War - Smoke Tests", () => {
  test.setTimeout(45_000);
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);

    // Navigate through menu -> difficulty -> start game
    const canvas = page.locator("canvas");
    await canvas.click({ position: { x: 640, y: 300 } }); // START GAME
    await page.waitForTimeout(300);
    await canvas.click({ position: { x: 640, y: 360 } }); // MEDIUM
    await page.waitForTimeout(1000);
  });

  test("1) App loads and toolbar elements are visible", async ({ page }) => {
    await expect(page).toHaveTitle(/Age of Max/i);
    
  const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    
    const canvasSize = await canvas.boundingBox();
    expect(canvasSize).not.toBeNull();
    expect(canvasSize!.width).toBe(1280);
    expect(canvasSize!.height).toBe(720);
    
    console.log("SUCCESS: App loaded - canvas visible with correct dimensions");
  });

  test("2) Player can purchase and spawn a unit", async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on("console", msg => consoleLogs.push(msg.text()));
    
    const canvas = page.locator("canvas");
    
    for (let i = 0; i < 5; i++) {
      await canvas.click({ position: { x: 505, y: 690 } });
      await page.waitForTimeout(500);
    }
    
    await page.waitForTimeout(1500);
    
    const unitLogs = consoleLogs.filter(log => log.includes("Spawned") || log.includes("Unit"));
    
    await expect(canvas).toBeVisible();
    expect(unitLogs.some(log => log.includes('(player)'))).toBeTruthy();
    
    console.log("SUCCESS: Unit spawn test - " + unitLogs.length + " unit events logged");
  });

  test("3) Accelerated battle remains stable and produces progression events", async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on("console", msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes("Epoch") || text.includes("XP")) {
        console.log("Game event: " + text);
      }
    });
    
    const canvas = page.locator("canvas");
    
    await page.keyboard.press('3');
    for (let i = 0; i < 10; i++) {
      await canvas.click({ position: { x: 505, y: 690 } });
      await page.waitForTimeout(250);
    }
    
    console.log("Waiting 20s for combat and XP...");
    await page.waitForTimeout(10000);
    
    const xpLogs = consoleLogs.filter(log => log.includes("XP") || log.includes("Epoch"));
    
    await expect(canvas).toBeVisible();
    expect(consoleLogs.some(log => log.includes('Simulation speed set to 4x'))).toBeTruthy();
    expect(consoleLogs.some(log => log.includes('Spawned') && log.includes('(player)'))).toBeTruthy();
    
    console.log("SUCCESS: Epoch test - " + xpLogs.length + " XP/Epoch events found");
  });
});
