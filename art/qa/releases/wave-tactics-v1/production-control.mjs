import fs from 'node:fs/promises';import { chromium } from '@playwright/test';
const actions=JSON.parse(process.argv[2]||'[]'), directory='art/qa/releases/wave-tactics-v1';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9226'),page=browser.contexts()[0].pages()[0];
for(const action of actions){
await fs.appendFile(directory+'/production-ui-actions.jsonl',JSON.stringify({at:new Date().toISOString(),...action})+'\n');
if(action.key)await page.keyboard.press(action.key);
if(action.click)await page.mouse.click(...action.click);
if(action.wait)await page.waitForTimeout(action.wait);
if(action.capture)await page.screenshot({path:directory+'/'+action.capture+'.jpg',type:'jpeg',quality:88});
if(action.close)await page.close();
}
console.log(JSON.stringify({actions:actions.length,url:page.url()}));process.exit(0);