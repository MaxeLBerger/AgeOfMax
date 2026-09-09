import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.QA_BROWSER_PATH || (existsSync(chrome) ? chrome : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [], files = new Map();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/assets/reborn/')) {
      files.set(response.url().split('/assets/reborn/')[1], response.status());
      if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    }
  });
  const response = await page.goto(process.env.QA_PRODUCTION_URL || 'http://127.0.0.1:5191/AgeOfMax/');
  assert.equal(response.status(), 200);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  assert.equal(files.size, 72, 'The production loader must request the complete runtime contract.');
  assert([...files.values()].every(status => status === 200));
  assert.equal(await page.evaluate(() => typeof window.__AGE_OF_MAX__), 'undefined', 'Production must not expose the development scene bridge.');
  await mkdir('art/qa', { recursive: true });
  await page.screenshot({ path: 'art/qa/production-menu.jpg', type: 'jpeg', quality: 85 });
  await page.mouse.click(250, 370);
  await page.waitForTimeout(150);
  await page.mouse.click(1050, 610);
  await page.waitForTimeout(200);
  await page.keyboard.type('qwe', { delay: 30 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'art/qa/production-battle.jpg', type: 'jpeg', quality: 85 });
  assert.deepEqual(errors, []);
  const result = { url: page.url(), title: await page.title(), runtimeFiles: files.size, errors, developmentBridge: false,
    interaction: 'New battle, normal difficulty, three recruitment keys; screenshots require visual review.' };
  await writeFile('art/qa/production-smoke.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
