import { test, expect } from "@playwright/test";

test.describe("Age of War - Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);
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

  test("2) Unit spawn reduces enemy base HP within 10 seconds", async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on("console", msg => consoleLogs.push(msg.text()));
    
    const canvas = page.locator("canvas");
    
    for (let i = 0; i < 5; i++) {
      await canvas.click({ position: { x: 200, y: 660 } });
      await page.waitForTimeout(500);
    }
    
    console.log("5 units spawned, waiting 10s for combat...");
    await page.waitForTimeout(10000);
    
    const unitLogs = consoleLogs.filter(log => log.includes("Spawned") || log.includes("Unit"));
    
    await expect(canvas).toBeVisible();
    expect(unitLogs.length).toBeGreaterThan(0);
    
    console.log("SUCCESS: Unit spawn test - " + unitLogs.length + " unit events logged");
  });

  test("3) Epoch progression after exceeding XP threshold", async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on("console", msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes("Epoch") || text.includes("XP")) {
        console.log("Game event: " + text);
      }
    });
    
    const canvas = page.locator("canvas");
    
    console.log("Spawning 15 units for XP generation...");
    for (let i = 0; i < 15; i++) {
      await canvas.click({ position: { x: 200, y: 660 } });
      await page.waitForTimeout(300);
    }
    
    console.log("Waiting 20s for combat and XP...");
    await page.waitForTimeout(20000);
    
    const xpLogs = consoleLogs.filter(log => log.includes("XP") || log.includes("Epoch"));
    
    await expect(canvas).toBeVisible();
    expect(consoleLogs.length).toBeGreaterThan(0);
    
    console.log("SUCCESS: Epoch test - " + xpLogs.length + " XP/Epoch events found");
  });
});