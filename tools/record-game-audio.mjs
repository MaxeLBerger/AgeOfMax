import { connectToManualPage } from './qa-browser.mjs';
import fs from 'node:fs/promises';
const {page}=await connectToManualPage();
await page.evaluate(()=>{
  const engine=window.__AGE_OF_MAX__.scene.getScene('BattleScene').music.engine,context=engine.getContext();
  if(context.state!=='running')throw Error('Audio was not unlocked');
  const recorder=context.createScriptProcessor(2048,1,1),chunks=[];
  recorder.onaudioprocess=event=>chunks.push(event.inputBuffer.getChannelData(0).slice());
  engine.limiter.connect(recorder);recorder.connect(context.destination);
  window.__audioReview=new Promise(resolve=>setTimeout(()=>{
    engine.limiter.disconnect(recorder);recorder.disconnect();recorder.onaudioprocess=null;
    const length=chunks.reduce((n,chunk)=>n+chunk.length,0),buffer=new ArrayBuffer(44+length*2),view=new DataView(buffer);
    const ascii=(at,text)=>{for(let i=0;i<text.length;i++)view.setUint8(at+i,text.charCodeAt(i));};
    ascii(0,'RIFF');view.setUint32(4,36+length*2,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,context.sampleRate,true);view.setUint32(28,context.sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,length*2,true);
    let at=44,peak=0;for(const chunk of chunks)for(const sample of chunk){peak=Math.max(peak,Math.abs(sample));view.setInt16(at,Math.round(Math.max(-1,Math.min(1,sample))*32767),true);at+=2;}
    const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    resolve({data:btoa(binary),seconds:length/context.sampleRate,peak,sampleRate:context.sampleRate});
  },6500));
});
await page.keyboard.press('Space',{delay:60});
await page.keyboard.type('qwe',{delay:250});
await page.waitForTimeout(4500);
await page.keyboard.press('Space',{delay:60});
const {data,...metadata}=await page.evaluate(async()=>{const result=await window.__audioReview;delete window.__audioReview;return result;});
await fs.writeFile('art/qa/live-audio-review.wav',Buffer.from(data,'base64'));
await fs.writeFile('art/qa/live-audio-review.json',JSON.stringify({...metadata,source:'Actual local game WebAudio output after limiter. No microphone. No test sounds injected.'},null,2));
console.log(JSON.stringify(metadata));process.exit(0);
