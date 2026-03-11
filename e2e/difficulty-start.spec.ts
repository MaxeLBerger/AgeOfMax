import { test, expect } from "@playwright/test";

test.describe("Start game via menu and difficulty selection", () => {
  test("select MEDIUM and ensure BattleScene starts", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (msg) => logs.push(msg.text()));

    await page.goto("http://localhost:5173");
    await page.waitForTimeout(1000);

    // Click START GAME button roughly centered at y=300 from MenuScene
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // The MenuScene buttons are centered; click near the start button
    await canvas.click({ position: { x: 640, y: 300 } });
    await page.waitForTimeout(500);

    // DifficultyScene: buttons centered at y=360 for MEDIUM
    await canvas.click({ position: { x: 640, y: 360 } });

    // Wait for BattleScene init log or failure
    for (let i = 0; i < 10; i++) {
      if (logs.some((l) => l.includes("BattleScene: Initializing battlefield"))) break;
      await page.waitForTimeout(500);
    }

    const started = logs.some((l) => l.includes("BattleScene: Initializing battlefield"));
    const diffLogged = logs.some((l) => l.includes("Starting game with difficulty"));

    console.log("Console logs:\n" + logs.join("\n"));
    expect(diffLogged).toBeTruthy();
    expect(started).toBeTruthy();
  });
});
