import { chromium } from '@playwright/test';
import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const stage=path.resolve('art/blender/candidates/animation-v3/melee-family');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
  await page.goto(pathToFileURL(path.join(stage,'review.html')).href);
  await page.waitForFunction(()=>[...document.querySelectorAll('video')].length===10&&[...document.querySelectorAll('video')].every(v=>v.readyState>=2));
  const initial=await page.evaluate(async()=>{
    const videos=[...document.querySelectorAll('video')];
    for(const v of videos){v.pause();v.currentTime=.10;await v.play();}
    return videos.map(v=>({src:v.getAttribute('src'),time:v.currentTime}));
  });
  await page.waitForTimeout(700);
  const playback=await page.evaluate(()=>[...document.querySelectorAll('video')].map(v=>{
    const result={src:v.getAttribute('src'),time:v.currentTime,duration:v.duration,width:v.videoWidth,height:v.videoHeight,decoded:v.getVideoPlaybackQuality().totalVideoFrames,error:v.error?.message??null};v.pause();return result;
  }));
  if(playback.some(v=>v.width!==640||v.height!==336||Math.abs(v.duration-2.52)>1e-6||v.decoded<10||v.error||v.time<.60))throw new Error('Playback did not advance cleanly');
  const seeked=[];
  for(const time of [0,.195,.39,1.56,1.64,1.72,1.80,1.84]){
    await page.evaluate(async time=>{
      for(const v of document.querySelectorAll('video')){
        if(Math.abs(v.currentTime-time)<1e-5)continue;
        await new Promise((resolve,reject)=>{v.addEventListener('seeked',resolve,{once:true});v.addEventListener('error',reject,{once:true});v.currentTime=time;});
      }
    },time);
    seeked.push({requested:time,actual:await page.evaluate(()=>[...document.querySelectorAll('video')].map(v=>v.currentTime))});
  }
  if(errors.length)throw new Error(JSON.stringify(errors));
  const report={passed:true,isolatedBrowser:true,sourceHtml:'review.html',videos:10,playback,seeked,errors};
  const temporary=path.join(stage,'browser-video-check.writing.json');await writeFile(temporary,JSON.stringify(report,null,2));await rename(temporary,path.join(stage,'browser-video-check.json'));
  const imageTemp=path.join(stage,'browser-review.writing.png');await page.screenshot({path:imageTemp,fullPage:true});await rename(imageTemp,path.join(stage,'browser-review.png'));
  console.log(JSON.stringify({passed:true,videos:10,decoded:playback.map(v=>v.decoded),times:playback.map(v=>v.time),errors}));
} finally {await browser.close();}