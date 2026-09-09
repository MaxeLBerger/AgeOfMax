import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const debugPort = Number(process.env.QA_CDP_PORT || 9224);
export const endpoint = `http://127.0.0.1:${debugPort}`;

/** Attach without closing the long-lived browser. Exit the short-lived caller when done. */
export async function connectToManualPage() {
  const browser = await chromium.connectOverCDP(endpoint);
  const page = browser.contexts().flatMap(context => context.pages())
    .find(candidate => candidate.url().startsWith('http://127.0.0.1:5190'));
  if (!page) throw new Error('The manual QA page is not available. Start tools/qa-browser.mjs first.');
  return { browser, page };
}

async function start() {
  const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const executablePath = process.env.QA_BROWSER_PATH || (existsSync(installedChrome) ? installedChrome : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}),
    args: [`--remote-debugging-port=${debugPort}`] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  await mkdir('art/qa', { recursive: true });
  const recordErrors = () => writeFile('art/qa/manual-runtime-errors.json', JSON.stringify(errors, null, 2));
  page.on('pageerror', error => { errors.push({ type: 'pageerror', message: error.message }); void recordErrors(); });
  page.on('response', response => {
    if (response.url().includes('/assets/') && response.status() >= 400) {
      errors.push({ type: 'asset', status: response.status(), url: response.url() }); void recordErrors();
    }
  });
  await recordErrors();
  await page.goto(process.env.QA_BASE_URL || 'http://127.0.0.1:5190');
  await writeFile('art/qa/manual-session.json', JSON.stringify({ process: process.pid, endpoint, url: page.url(), started: new Date().toISOString() }, null, 2));
  console.log(`Manual QA page is ready: ${endpoint}. No game state has been changed.`);
  process.once('SIGTERM', () => { void browser.close(); });
  process.once('SIGINT', () => { void browser.close(); });
  await new Promise(resolve => browser.once('disconnected', resolve));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await start();
