// Read-only browser playback check for the isolated study page and its six videos.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../..');
const stage = path.join(root, 'art/blender/candidates/animation-v3/bow-throw-family');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1380, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(stage, 'review.html')).href);
    await page.waitForFunction(() => [...document.querySelectorAll('video')].every(video => video.readyState >= 3));
    await page.evaluate(async () => {
      window.studyPlayback = [];
      for (const video of document.querySelectorAll('video')) {
        const record = { file: video.getAttribute('src'), presented: 0, wraps: 0, previous: 0 };
        window.studyPlayback.push(record);
        video.addEventListener('timeupdate', () => {
          if (video.currentTime < record.previous) record.wraps++;
          record.previous = video.currentTime;
        });
        const count = () => { record.presented++; video.requestVideoFrameCallback(count); };
        video.requestVideoFrameCallback(count);
        await video.play();
      }
    });
    await page.waitForTimeout(3200);
    const videos = await page.evaluate(() => [...document.querySelectorAll('video')].map((video, index) => ({
      ...window.studyPlayback[index], width: video.videoWidth, height: video.videoHeight,
      duration: video.duration, currentTime: video.currentTime, paused: video.paused,
      error: video.error?.message ?? null,
    })));
    if (errors.length || videos.length !== 6 || videos.some(video => video.error || video.paused || video.presented < 20 || video.wraps < 1 || Math.abs(video.duration - 2.52) > 0.001)) {
      throw new Error(JSON.stringify({ errors, videos }));
    }
    // Also seek all streams to the actual160ms contact of their first attack.
    await page.evaluate(async () => {
      await Promise.all([...document.querySelectorAll('video')].map(video => new Promise(resolve => {
        video.pause(); video.addEventListener('seeked', resolve, { once: true }); video.currentTime = 1.72;
      })));
    });
    await page.screenshot({ path: path.join(stage, 'browser-contact-review.jpg'), type: 'jpeg', quality: 91, fullPage: true });
    const report = { passed: true, errors, videos, inspectedContactTimeSeconds: 1.72, productionChanged: false };
    fs.writeFileSync(path.join(stage, 'playback-check.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
