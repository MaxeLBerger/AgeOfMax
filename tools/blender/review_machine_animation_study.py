"""Pack audited machine renders and create a local interactive motion review."""
import hashlib,json,os
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops,ImageStat
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3/machine-family'
KEYS=['cannon','cannon-enemy','tank','tank-enemy']
def atomic_text(path,text):
 temporary=path.with_name(path.name+'.writing');temporary.write_text(text,encoding='utf-8');os.replace(temporary,path)
def atomic_image(path,image,**kwargs):
 temporary=path.with_name(path.stem+'.writing'+path.suffix);image.save(temporary,**kwargs);os.replace(temporary,path)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def image_metrics(a,b):
 diff=ImageChops.difference(a.convert('RGB'),b.convert('RGB'))
 mask=ImageChops.lighter(a.getchannel('A'),b.getchannel('A')).point(lambda v:255 if v>12 else 0)
 stats=ImageStat.Stat(diff,mask)
 count=sum(1 for px,m in zip(diff.getdata(),mask.getdata()) if m and max(px)>12)
 return {'mean_absolute_rgb_on_alpha':sum(stats.mean)/3,'pixels_delta_over_12':count,
         'alpha_byte_equal':a.getchannel('A').tobytes()==b.getchannel('A').tobytes()}
def bg(size):return Image.new('RGB',size,(22,31,40))
try:font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
except OSError:font=ImageFont.load_default()
report={'passed':True,'units':{},'claims':'Isolated Blender animation study; not a production promotion or full game playthrough.'}
sources=json.loads((STAGE/'source-audit.json').read_text())['units']
review=[]
for key in KEYS:
 directory=STAGE/key;unit=key.removesuffix('-enemy')
 model=json.loads((directory/'model-check.json').read_text())
 manifest=json.loads((directory/'frame-manifest.json').read_text())
 source_hash=sha(directory/f'unit-{key}.blend')
 assert sources[key]['passed'] and sources[key]['source_sha256']==source_hash
 frames=[Image.open(directory/'frames'/f'{i:02d}.png').convert('RGBA') for i in range(16)]
 for i in range(16):
  entry=manifest[f'{i:02d}.png']
  assert entry['source_sha256']==source_hash and entry['png_sha256']==sha(directory/'frames'/f'{i:02d}.png')
 assert all(im.size==(256,256) for im in frames)
 unique=[len({hashlib.sha256(im.tobytes()).hexdigest() for im in frames[start:start+8]}) for start in [0,8]]
 assert unique==[8,8],(key,unique)
 bounds=[im.getchannel('A').point(lambda v:255 if v>12 else 0).getbbox() for im in frames]
 assert all(b and b[0]>=2 and b[1]>=2 and b[2]<=254 and b[3]<=254 for b in bounds),(key,bounds)
 sheet=Image.new('RGBA',(4096,256))
 for i,im in enumerate(frames):sheet.paste(im,(i*256,0))
 atomic_image(directory/f'{key}-16.png',sheet)
 old_sheet=Image.open(directory/'baseline'/f'{unit}.png').convert('RGBA')
 old=[old_sheet.crop((i*256,0,(i+1)*256,256)) for i in range(8)]
 board=bg((2048,1160));draw=ImageDraw.Draw(board)
 for row,(title,items,duration) in enumerate([
  ('CURRENT WALK / original 4 frames',old[:4],520),
  ('STUDY WALK / 8 measured mechanical samples',frames[:8],model['gait']['nominalCycleDurationMs']),
  ('CURRENT ATTACK / original 4 frames',old[4:],320),
  ('STUDY ATTACK / 8 samples; fixed chassis',frames[8:],320)]):
  draw.text((12,row*290+5),f'{key} - {title} - {duration:.3f} ms',font=font,fill=(230,230,220))
  step=2048//len(items)
  for j,im in enumerate(items):
   x=j*step+(step-256)//2
   board.paste(im,(x,row*290+28),im)
   draw.text((j*step+12,row*290+264),f'{j*duration/len(items):.2f} ms'+(' CONTACT' if row>=2 and j*duration/len(items)==160 else ''),font=font,fill=(220,179,104))
 atomic_image(directory/'contact-sheet.jpg',board,quality=94)
 closures={}
 for clip,reference in [('walk',frames[0]),('attack',frames[0])]:
  name=clip+'-closure.png';entry=manifest[name]
  assert entry['source_sha256']==source_hash
  closures[clip]=image_metrics(reference,Image.open(directory/'frames'/name).convert('RGBA'))
 # Procedural grain travels with named spokes/hubs and can retain a tiny pixel
 # texture seam at the anonymous symmetry boundary; record it, do not hide it.
 report['units'][key]={'source_sha256':source_hash,'sheet_sha256':sha(directory/f'{key}-16.png'),
  'frame_count':16,'unique_walk_frames':unique[0],'unique_attack_frames':unique[1],
  'frame_size':[256,256],'sheet_size':[4096,256],'bounds':bounds,
  'gait':model['gait'],'closure_render_difference':closures,
  'adjacent_walk_image_deltas':[image_metrics(frames[i],frames[(i+1)%8]) for i in range(8)],
  'production_unchanged':all(sha(ROOT/p)==v for p,v in model['source_hashes'].items())}
 assert report['units'][key]['production_unchanged']
 review.append({'key':key,'unit':unit,'gait':model['gait'],'sockets':model['sockets']})
atomic_text(STAGE/'render-check.json',json.dumps(report,indent=2))
data=json.dumps(review)
html='''<!doctype html><html lang="de"><meta charset="utf-8"><title>AgeOfMax – Maschinenstudie</title>
<style>
body{font:16px system-ui;background:#121b23;color:#e4ebee;margin:28px}main{max-width:1300px;margin:auto}
h1{font-size:28px}p{line-height:1.5;max-width:1100px;color:#b8c8d3}
button,select,input{font:inherit;padding:8px;border-radius:5px;background:#273745;color:#eef5f8;border:1px solid #647381}
button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #f0c078}
nav{display:flex;gap:12px;align-items:center;flex-wrap:wrap;position:sticky;top:0;background:#121b23;padding:12px 0;z-index:1}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(580px,1fr));gap:18px}.card{background:#1b2833;padding:14px}
canvas{width:100%;max-width:608px;height:auto;background:#202f3a}h2{margin:4px 0 12px;font-size:21px}a{color:#edc177}
label{display:flex;gap:8px;align-items:center}.small{font-size:13px;color:#aac0cc}
</style><main><h1>Kanone und Panzer: echte Mechanik in 16 Frames</h1>
<p>Isolierte Blender-Kandidaten. Links der gesicherte bisherige Stand, rechts die neue Bewegung bei derselben nominellen Spielgeschwindigkeit und Größe. Die Kanone rollt eine halbe Radumdrehung, der Panzer drei Kettenglieder bei einer Vierteldrehung der Laufräder. Angriffe dauern unverändert 320 ms, Kontakt auf Frame 12 nach 160 ms. Diese Ansicht ist eine Animationsprüfung, keine gespielte Partie.</p>
<nav><button id="play">Anhalten</button><select id="clip"><option value="walk">Fahrt</option><option value="attack">Angriff</option></select>
<label>Tempo<select id="speed"><option value=".5">½×</option><option value="1" selected>1×</option><option value="4">4×</option></select></label>
<label><input type="checkbox" id="travel" checked> Mit Wegstrecke</label>
<label><input type="checkbox" id="socket" checked> Mündungsanker</label>
<label>Frame<input id="frame" type="range" min="0" max="15" value="0"><output id="frameLabel">0</output></label></nav>
<div class="cards"></div><p class="small">Die Wiedergabe berechnet die Phase aus Wegstrecke und der gemessenen Zyklusstrecke. Pause friert die Ansicht ein. Frame8 der Blender-Action dient nur als Schleifen-/Recovery-Abschluss und ist nicht einer der16Sprites. Die mechanische Schleife darf gleichartige Speichen/Kettenglieder permutieren; feine prozedurale Materialunterschiede an dieser Grenze sind im Bildprüfbericht gesondert gemessen.</p></main>
<script>
const models=DATA, panels=[]; let running=true,elapsed=0,last=performance.now(),manualFrame=null;
const el=id=>document.getElementById(id);
for(const m of models){
 const card=document.createElement('section');card.className='card';
 card.innerHTML='<h2>'+m.key+'</h2><canvas width="608" height="260"></canvas><p class="small">'+m.gait.cycleDistancePixels.toFixed(4)+' Spielpixel / '+m.gait.nominalCycleDurationMs.toFixed(3)+' ms | <a href="'+m.key+'/contact-sheet.jpg">Alle Phasen</a> | <a href="'+m.key+'/unit-'+m.key+'.blend">Blenderquelle</a></p>';
 document.querySelector('.cards').append(card);
 const old=new Image(),sheet=new Image();old.src=m.key+'/baseline/'+m.unit+'.png';sheet.src=m.key+'/'+m.key+'-16.png';
 panels.push({...m,canvas:card.querySelector('canvas'),old,sheet});
}
el('play').onclick=()=>{running=!running;manualFrame=null;el('play').textContent=running?'Anhalten':'Abspielen'};
el('clip').onchange=()=>{elapsed=0;manualFrame=null};
el('frame').oninput=()=>{running=false;el('play').textContent='Abspielen';manualFrame=Number(el('frame').value);el('frameLabel').textContent=manualFrame;el('clip').value=manualFrame>=8?'attack':'walk'};
function draw(m){
 const c=m.canvas.getContext('2d'),attack=manualFrame===null?el('clip').value==='attack':manualFrame>=8;
 const duration=attack?320:m.gait.nominalCycleDurationMs;
 const frame=manualFrame===null?Math.floor((elapsed%duration)/duration*8)+(attack?8:0):manualFrame;
 const oldFrame=manualFrame===null?Math.floor((elapsed%(attack?320:520))/(attack?80:130))+(attack?4:0):Math.floor((frame%8)/2)+(attack?4:0);
 const shownTime=manualFrame===null?elapsed%duration:(frame%8)*duration/8;
 const distance=attack||!el('travel').checked?0:(elapsed*m.gait.nominalSpeedPxPerSecond/1000)%105;
 c.clearRect(0,0,608,260);c.fillStyle='#24343e';c.fillRect(0,0,608,260);
 c.fillStyle='#e1e7df';c.font='15px system-ui';c.fillText('Bisher / 8 Frames',12,22);c.fillText('Studie / 16 Frames',320,22);
 c.strokeStyle='#677a7d';c.beginPath();c.moveTo(0,218);c.lineTo(608,218);c.stroke();
 for(let i=0;i<2;i++){
  const x=i*304+38+distance,im=i?m.sheet:m.old,f=i?frame:oldFrame,s=.51;
  if(im.complete&&im.naturalWidth)c.drawImage(im,f*256,0,256,256,x,218-256*.92*s,256*s,256*s);
  c.fillStyle='#b6cbd5';c.fillText('Frame '+f+' / '+shownTime.toFixed(0)+' ms',i*304+12,247);
  if(i&&el('socket').checked){const p=m.sockets[frame];c.strokeStyle=frame===12?'#f7df56':'#ed758a';c.beginPath();c.arc(x+p[0]*s,218-256*.92*s+p[1]*s,3,0,Math.PI*2);c.stroke();}
 }
 m.canvas.dataset.frame=frame;m.canvas.dataset.elapsed=elapsed.toFixed(3);m.canvas.dataset.distance=distance.toFixed(4);
}
function tick(now){if(running)elapsed+=Math.max(0,now-last)*Number(el('speed').value);last=now;for(const m of panels)draw(m);requestAnimationFrame(tick)}
requestAnimationFrame(tick);
window.machineReview={models,panels,get running(){return running},get elapsed(){return elapsed}};
</script></html>'''.replace('DATA',data)
atomic_text(STAGE/'review.html',html)
print(json.dumps({k:{'unique':[v['unique_walk_frames'],v['unique_attack_frames']],'closures':v['closure_render_difference']} for k,v in report['units'].items()},indent=2))
