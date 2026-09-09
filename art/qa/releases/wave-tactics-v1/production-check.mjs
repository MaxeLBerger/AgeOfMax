import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
const directory='art/qa/releases/wave-tactics-v1',packageDir=path.join(directory,'package'),url='http://127.0.0.1:5192/AgeOfMax/';
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const walk=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):path.join(dir,entry.name)))).flat();
const packageFiles=await walk(packageDir),entries=[],runtime=[];
for(const file of packageFiles){
const content=await fs.readFile(file),relative=path.relative(packageDir,file).replaceAll('\\','/');
entries.push({path:relative,bytes:content.length,sha256:hash(content)});
if(relative.startsWith('assets/reborn/')){
assert.equal(hash(content),hash(await fs.readFile(path.join('public',relative))),'Public hash '+relative);
runtime.push(relative);
}
}
assert.equal(runtime.length,71);
const javascript=entries.filter(entry=>entry.path.endsWith('.js'));
assert.equal(javascript.length,1);
assert(!(await fs.readFile(path.join(packageDir,javascript[0].path),'utf8')).includes('__AGE_OF_MAX__'),'Development bridge must be stripped from JS');
const responses=await Promise.all(runtime.map(async file=>{const response=await fetch(url+file),body=Buffer.from(await response.arrayBuffer());
assert.equal(response.status,200,file);assert.equal(hash(body),entries.find(entry=>entry.path===file).sha256,file+' HTTP content');
return{path:file,status:response.status,bytes:body.length,sha256:hash(body)};}));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--remote-debugging-port=9226']});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[],loaded=new Map(),actions=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.url().includes('/assets/reborn/'))loaded.set(response.url().split('/assets/reborn/')[1],response.status());if(response.status()>=400)errors.push(response.status()+' '+response.url());});
const report={createdAt:new Date().toISOString(),url,packageDir,fileCount:entries.length,bytes:entries.reduce((sum,entry)=>sum+entry.bytes,0),runtimeFileCount:runtime.length,
publicHashesMatch:true,httpHashesMatch:true,javascriptDevelopmentBridge:false,entries,responses,errors,actions,completed:false};
const save=async()=>fs.writeFile(directory+'/production-validation.json',JSON.stringify({...report,browserRuntimeFiles:[...loaded].map(([file,status])=>({file,status}))},null,2));
await page.goto(url);await page.waitForLoadState('networkidle');await page.waitForTimeout(300);
assert.equal(loaded.size,71);assert([...loaded.values()].every(status=>status===200));
assert.equal(await page.evaluate(()=>typeof window.__AGE_OF_MAX__),'undefined');
const click=async(x,y)=>{actions.push({at:new Date().toISOString(),click:[x,y]});await page.mouse.click(x,y);await page.waitForTimeout(150);};
const key=async(key)=>{actions.push({at:new Date().toISOString(),key});await page.keyboard.press(key);await page.waitForTimeout(100);};
const capture=async(name)=>{const file=directory+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:88});actions.push({at:new Date().toISOString(),capture:file});};
await capture('production-menu');
await click(250,440);await capture('production-handbook');
await key('Escape');await click(250,370);await click(640,370);await click(1050,610);
await page.keyboard.type('qwe',{delay:30});actions.push({at:new Date().toISOString(),keys:'qwe'});
await page.waitForTimeout(450);await key('i');await capture('production-scout');
await key('Escape');await capture('production-battle');
await key('Space');await page.waitForTimeout(80);
const pausedBefore=await page.screenshot();
await page.keyboard.type('iqwer123',{delay:20});await page.waitForTimeout(200);
const pausedAfter=await page.screenshot();report.pausedPixelHashBefore=hash(pausedBefore);report.pausedPixelHashAfter=hash(pausedAfter);report.pausedImageUnchanged=hash(pausedBefore)===hash(pausedAfter);
await capture('production-pause');await key('Space');await key('Escape');await key('ArrowDown');await key('Enter');await capture('production-return-menu');
await click(250,370);await click(1020,370);await click(1050,610);await key('q');await key('3');await capture('production-hard-initial');
await save();
console.log(JSON.stringify({stage:'interactive-ready',url,cdp:'http://127.0.0.1:9226',fileCount:report.fileCount,bytes:report.bytes,runtime:runtime.length,
pausedImageUnchanged:report.pausedImageUnchanged,errors,report:directory+'/production-validation.json'}));
await new Promise(resolve=>page.once('close',resolve));
report.completed=true;report.closedAt=new Date().toISOString();await save();await browser.close();
console.log('PRODUCTION_BROWSER_CLOSED');
