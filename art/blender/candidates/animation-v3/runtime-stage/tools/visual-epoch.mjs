/** Technical visual staging only; never evidence of an earned match. */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const epoch=process.argv[2]||'future',candidate=process.argv[3];
const index=['stone','castle','renaissance','modern','future'].indexOf(epoch);
if(index<0)throw Error('Unknown epoch');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5190');await page.waitForLoadState('networkidle');
await page.mouse.click(250,370);await page.waitForTimeout(180);await page.mouse.click(1050,610);
await page.waitForFunction(()=>window.__AGE_OF_MAX__?.scene.getScene('BattleScene')?.playerBase);
await page.evaluate(index=>{
const game=window.__AGE_OF_MAX__,b=game.scene.getScene('BattleScene');
game.registry.get('settings').reducedMotion=true;
while(b.currentEpochIndex<index){b.xp=b.epochs[b.currentEpochIndex].xpToNext;b.advanceEpoch();}
b.enemyEpochIndex=index;b.enemyBase.maxHp=b.playerBase.maxHp;b.enemyBase.hp=b.enemyBase.maxHp;b.updateBaseHealthBar('enemy');
b.gold=10000;
const id=b.epochs[index].id,roster=b.unitsDatabase.filter(u=>u.epoch===id);
for(const side of ['player','enemy']){
  const group=side==='player'?b.playerUnits:b.enemyUnits;
  for(let i=0;i<roster.length;i++){
    b.spawnUnitByData(side,roster[i]);
    const unit=group.getChildren().filter(u=>u.active).sort((a,c)=>c.getData('uid')-a.getData('uid'))[0];
    const x=side==='player'?290+i*89:990-i*89,y=493+(i%3)*7;
    unit.setPosition(x,y);unit.body.reset(x,y);
  }
}
for(const old of b.children.list.slice())if(old.depth===-99){b.tweens.killTweensOf(old);old.destroy();}
b.gold=1200;b.xp=0;b.setPaused(true);b.syncInitialStateToUI();
game.scene.getScene('UIScene').overlay.setVisible(false);
for(const group of [b.playerUnits,b.enemyUnits])for(const unit of group.getChildren())if(unit.active)unit.setFrame(game.cache.json.get('gait-metadata')?.contactFrame ?? 6);
},index);
await page.waitForTimeout(150);
await page.screenshot({path:'art/qa/visual-'+epoch+'-current.jpg',type:'jpeg',quality:88});
if(candidate){
const buffer=await fs.readFile(candidate);
await page.evaluate(async data=>{
const game=window.__AGE_OF_MAX__,img=new Image();img.src=data;await img.decode();
game.textures.addImage('candidate-review',img);
game.scene.getScene('BattleScene').backgroundImage.setTexture('candidate-review').setDisplaySize(1280,720);
},'data:image/png;base64,'+buffer.toString('base64'));
await page.waitForTimeout(150);
await page.screenshot({path:'art/qa/visual-'+epoch+'-candidate.jpg',type:'jpeg',quality:88});
}

const animationSpec=process.env.QA_ANIMATION_VARIANTS;
if(animationSpec){
  const variants=JSON.parse(await fs.readFile(animationSpec,'utf8'));
  const payload=await Promise.all(variants.map(async item=>({...item,
    data:'data:image/png;base64,'+(await fs.readFile(item.file)).toString('base64')})));
  await page.evaluate(async variants=>{
    const game=window.__AGE_OF_MAX__,b=game.scene.getScene('BattleScene'),ui=game.scene.getScene('UIScene');
    for(const variant of variants){
      const img=new Image();img.src=variant.data;await img.decode();
      if(img.width!==4096||img.height!==256)throw Error('Review requires sixteen 256px Blender samples');
      const key=variant.texture+'-animation-review';
      const texture=game.textures.addSpriteSheet(key,img,{frameWidth:256,frameHeight:256});
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
      const context=canvas.getContext('2d',{willReadFrequently:true});
      context.drawImage(img,0,0,256,256,0,0,256,256);
      const pixels=context.getImageData(0,0,256,256).data;
      let left=256,right=0,top=256,bottom=0;
      for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pixels[(y*256+x)*4+3]>40){
        left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      }
      const id=variant.texture.replace(/-enemy$/,'');
      const infantry=!['dino-rider','knight','cavalry','ballista','cannon','tank','mech','super-heavy'].includes(id);
      if(infantry)texture.add('portrait',0,82,top,104,Math.min(bottom-top+1,96));
      else texture.add('portrait',0,left,top,right-left+1,bottom-top+1);
      for(const group of [b.playerUnits,b.enemyUnits])for(const unit of group.getChildren()){
        if(unit.active && unit.texture.key===variant.texture){
          const scaleX=unit.scaleX,scaleY=unit.scaleY;
          unit.setTexture(key,12).setScale(scaleX,scaleY).setOrigin(.5,.92);
        }
      }
      if(!variant.texture.endsWith('-enemy')){
        const card=ui.unitCards.find(card=>card.id===id);
        if(card){
          const width=card.image.displayWidth,height=card.image.displayHeight;
          card.image.setTexture(key,'portrait').setDisplaySize(width,height);
        }
      }
    }
  },payload);
  await page.waitForTimeout(150);
  await page.screenshot({path:'art/qa/visual-'+epoch+'-animations.jpg',type:'jpeg',quality:90});
}
console.log(JSON.stringify({epoch,candidate,errors,setup:'Deliberate technical scene, four units per faction in attack pose, no claim of earned progress.'}));
if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
