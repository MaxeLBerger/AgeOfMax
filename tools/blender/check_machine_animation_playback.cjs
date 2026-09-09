// Isolated machine animation UI check; never attaches to the game browser.
const { chromium }=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const stage=path.resolve(__dirname,'../../art/blender/candidates/animation-v3/machine-family');
function atomicJson(name,value){const p=path.join(stage,name);fs.writeFileSync(p+'.writing',JSON.stringify(value,null,2));fs.renameSync(p+'.writing',p);}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1380,height:1080}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5190/art/blender/candidates/animation-v3/machine-family/review.html');
  await page.waitForFunction(()=>window.machineReview?.panels.length===4&&window.machineReview.panels.every(m=>m.old.complete&&m.old.naturalWidth===2048&&m.sheet.complete&&m.sheet.naturalWidth===4096));
  await page.evaluate(()=>{
   window.observedMachineLoops=machineReview.panels.map(m=>({key:m.key,frames:[],wraps:0,previous:-1,changes:[]}));
   function sample(){
    for(let i=0;i<machineReview.panels.length;i++){
     const m=machineReview.panels[i],r=observedMachineLoops[i],f=Number(m.canvas.dataset.frame);
     if(r.previous!==f){
      if(r.previous===7&&f===0)r.wraps++;
      if(!r.frames.includes(f))r.frames.push(f);
      r.changes.push({frame:f,elapsed:Number(m.canvas.dataset.elapsed)});
      r.previous=f;
     }
    }
    if(!window.stopMachineObserver)requestAnimationFrame(sample);
   }
   requestAnimationFrame(sample);
  });
  await page.waitForTimeout(3800);
  await page.click('#play');
  const playback=await page.evaluate(()=>{window.stopMachineObserver=true;return {loops:observedMachineLoops,elapsed:machineReview.elapsed}});
  if(playback.loops.some(r=>r.wraps<2||r.frames.length!==8))throw Error('Missing complete rendered walk loops: '+JSON.stringify({errors,loops:playback.loops.map(r=>({key:r.key,frames:r.frames,wraps:r.wraps})),elapsed:playback.elapsed}));
  const paused=await page.locator('canvas').evaluateAll(canvases=>canvases.map(c=>c.toDataURL()));
  await page.waitForTimeout(230);
  const pausedAgain=await page.locator('canvas').evaluateAll(canvases=>canvases.map(c=>c.toDataURL()));
  if(JSON.stringify(paused)!==JSON.stringify(pausedAgain))throw Error('Pause changed rendered content');
  await page.screenshot({path:path.join(stage,'browser-walk-review.jpg'),type:'jpeg',quality:94,fullPage:true});
  await page.locator('#frame').focus();await page.keyboard.press('Home');
  for(let i=0;i<12;i++)await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>machineReview.panels.every(m=>m.canvas.dataset.frame==='12'));
  await page.screenshot({path:path.join(stage,'browser-contact-review.jpg'),type:'jpeg',quality:94,fullPage:true});
  const contact=await page.evaluate(()=>machineReview.panels.map(m=>({key:m.key,frame:Number(m.canvas.dataset.frame),socket:m.sockets[12]})));
  await page.selectOption('#clip','walk');await page.selectOption('#speed','4');await page.click('#play');
  const speedStart=await page.evaluate(()=>({elapsed:machineReview.elapsed,wall:performance.now()}));
  await page.waitForTimeout(300);
  const speedEnd=await page.evaluate(()=>({elapsed:machineReview.elapsed,wall:performance.now(),frames:machineReview.panels.map(m=>({key:m.key,actual:Number(m.canvas.dataset.frame),expected:Math.floor((machineReview.elapsed%m.gait.nominalCycleDurationMs)/m.gait.nominalCycleDurationMs*8)}))}));
  const ratio=(speedEnd.elapsed-speedStart.elapsed)/(speedEnd.wall-speedStart.wall);
  if(speedEnd.frames.some(r=>r.actual!==r.expected)||ratio<3.4||ratio>4.6)throw Error('Wrong measured-time playback');
  if(errors.length)throw Error(JSON.stringify(errors));
  atomicJson('playback-check.json',{passed:true,scope:'Read-only isolated study playback; new independent Chrome instance, not a game playthrough.',errors,playback,pausePixelsUnchanged:true,contact,speed4xMeasuredRatio:ratio,speedFrames:speedEnd.frames,productionChanged:false});
  console.log(JSON.stringify({passed:true,loops:playback.loops.map(r=>({key:r.key,wraps:r.wraps,frames:r.frames})),contact,pausePixelsUnchanged:true,speed4xMeasuredRatio:ratio,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
