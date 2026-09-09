"""Pack ten staged melee sheets and exact-timing old/new motion reviews atomically."""
import hashlib,json,os,shutil,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
import review_animation_study as REVIEW
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3/melee-family'
UNITS=['clubman','spearman','swordsman','duelist','super-heavy']
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write_json(path,data):
    temp=path.with_suffix('.writing.json');temp.write_text(json.dumps(data,indent=2),encoding='utf-8');os.replace(temp,path)
def save_image(image,path,**kwargs):
    temp=path.with_name(path.stem+'.writing'+path.suffix);image.save(temp,**kwargs);os.replace(temp,path)
def main():
    summary={};sections=[];gaits={};sockets={}
    for unit in UNITS:
        team_points=[];team_gaits=[]
        for faction in ['player','enemy']:
            suffix='-enemy' if faction=='enemy' else '';key=unit+suffix;directory=STAGE/key
            model=json.loads((directory/'model-check.json').read_text())
            audit=json.loads((directory/'geometry-audit.json').read_text())
            assert audit['passed'] and audit['source_sha256']==digest(directory/f'unit-{key}.blend'),('Source audit stale',key)
            team_points.append(model['sockets']);team_gaits.append(audit['gait'])
            old_sheet=Image.open(directory/'baseline'/f'{unit}.png').convert('RGBA')
            assert old_sheet.size==(2048,256)
            old=[old_sheet.crop((i*256,0,(i+1)*256,256)) for i in range(8)]
            frames=[Image.open(directory/'frames'/f'{i:02d}.png').convert('RGBA') for i in range(16)]
            assert all(im.size==(256,256) for im in frames)
            hashes=[hashlib.sha256(im.tobytes()).hexdigest() for im in frames]
            assert len(set(hashes[:8]))==8 and len(set(hashes[8:]))==8,('Duplicate frames',key)
            bounds=[im.getchannel('A').point(lambda v:255 if v>12 else 0).getbbox() for im in frames]
            assert all(b and b[0]>=2 and b[1]>=2 and b[2]<=254 and b[3]<=254 for b in bounds),(key,bounds)
            sheet=Image.new('RGBA',(4096,256))
            for i,im in enumerate(frames):sheet.paste(im,(i*256,0))
            output=directory/f'{key}-16.png';save_image(sheet,output)
            actual=Image.open(output).convert('RGBA')
            assert all(actual.crop((i*256,0,(i+1)*256,256)).tobytes()==im.tobytes() for i,im in enumerate(frames))
            contact=REVIEW.backdrop((2048,1160));draw=ImageDraw.Draw(contact)
            rows=[('CURRENT WALK / 4 samples over 520 ms',old[:4],130),('STUDY WALK / 8 samples over 520 ms',frames[:8],65),('CURRENT ATTACK / 4 samples over 320 ms',old[4:],80),('STUDY ATTACK / 8 samples over 320 ms',frames[8:],40)]
            for row,(title,items,ms) in enumerate(rows):
                draw.text((14,row*290+5),key.upper()+' / '+title,font=REVIEW.FONT,fill=(225,233,239));pitch=2048//len(items)
                for index,im in enumerate(items):
                    REVIEW.paste(contact,im,index*pitch+(pitch-256)//2,row*290+30)
                    label=f'{index*ms} ms'+(' / CONTACT' if row>=2 and index*ms==160 else '')
                    draw.text((index*pitch+10,row*290+265),label,font=REVIEW.SMALL,fill=(238,194,111))
            save_image(contact,directory/'contact-sheet.jpg',quality=93)
            clips={clip:[REVIEW.video_frame(key,old,frames,clip,i) for i in range(8)] for clip in ['walk','attack']}
            ffmpeg=shutil.which('ffmpeg');ffprobe=shutil.which('ffprobe');assert ffmpeg and ffprobe
            video=directory/'motion-comparison.webm';temporary=directory/'motion-comparison.writing.webm'
            process=subprocess.Popen([ffmpeg,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','640x336','-r','200','-i','pipe:0','-an','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6','-crf','25','-b:v','0','-pix_fmt','yuv420p',str(temporary)],stdin=subprocess.PIPE,stderr=subprocess.PIPE)
            for clip,ticks in [('walk',13),('attack',8)]:
                for repeat in range(3):
                    for im in clips[clip]:
                        payload=im.tobytes()
                        for tick in range(ticks):process.stdin.write(payload)
            process.stdin.close();error=process.stderr.read();assert process.wait()==0,error.decode(errors='replace');os.replace(temporary,video)
            result=subprocess.run([ffprobe,'-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_read_frames:format=duration','-of','json',str(video)],capture_output=True,text=True,check=True)
            media=json.loads(result.stdout)
            assert media['streams'][0]['nb_read_frames']=='504' and media['streams'][0]['r_frame_rate']=='200/1'
            assert abs(float(media['format']['duration'])-2.52)<.000001
            write_json(directory/'video-check.json',media)
            production={'source':digest(ROOT/f'art/blender/unit-{key}.blend'),'sheet':digest(ROOT/f'public/assets/reborn/units{suffix}/{unit}.png'),'sockets':digest(ROOT/'public/assets/reborn/weapon-sockets.json')}
            assert production==model['source_hashes'],('Production changed',key)
            summary[key]={'passed':True,'source_sha256':digest(directory/f'unit-{key}.blend'),'sheet_sha256':digest(output),'frames':16,'unique_walk_frames':8,'unique_attack_frames':8,'sheet':[4096,256],'bounds':bounds,'contact_index':12,'contact_ms':160,'walk_ms':520,'attack_ms':320,'webm_fps':200,'webm_duration_ms':2520,'production_unchanged':True,'all_original_bindings_preserved':model.get('all_original_bindings_preserved',False)}
            sections.append(f'<section><h2>{key}</h2><video src="{key}/motion-comparison.webm" autoplay loop muted controls></video><p><a href="{key}/contact-sheet.jpg">Kontaktbogen</a></p></section>')
            print('MELEE_PACKED',key,flush=True)
        assert team_points[0]==team_points[1] and team_gaits[0]==team_gaits[1],('Team contract mismatch',unit)
        sockets[unit]=team_points[0];gaits[unit]=team_gaits[0]
    write_json(STAGE/'render-check.json',summary);write_json(STAGE/'weapon-sockets.json',sockets);write_json(STAGE/'gait-metadata.partial.json',gaits)
    overview=REVIEW.backdrop((1024,290*len(UNITS)));draw=ImageDraw.Draw(overview)
    for row,unit in enumerate(UNITS):
        for col,(suffix,frame) in enumerate([('',0),('',12),('-enemy',0),('-enemy',12)]):
            key=unit+suffix;im=Image.open(STAGE/key/'frames'/f'{frame:02d}.png').convert('RGBA')
            REVIEW.paste(overview,im,col*256,row*290+26)
            draw.text((col*256+10,row*290+5),key+(' / CONTACT' if frame==12 else ' / WALK'),font=REVIEW.SMALL,fill=(235,219,183))
    save_image(overview,STAGE/'family-overview.jpg',quality=94)
    html='''<!doctype html><html lang="de"><meta charset="utf-8"><title>AgeOfMax Nahkampfstudie</title><style>body{margin:32px;background:#111a22;color:#e4eaf0;font:17px system-ui}main{max-width:1320px;margin:auto}section{display:inline-block;vertical-align:top;width:calc(50% - 24px);margin:12px 12px 24px 0}video{max-width:100%;border:1px solid #405263}p{color:#b5c3ce;max-width:1050px}a{color:#e7bc72}</style><main><h1>Nahkampffamilie: 8 → 16 echte Blender-Frames</h1><p>Links aktueller Stand, rechts isolierte Studie. Je drei Gangzyklen à 520 ms und Angriffe à 320 ms; Kontakt nach 160 ms. Keulenschlag, Speerstoß, Schwertschnitt, Duellstoß und Titan-Hammerschlag haben eigene Bahnen. Beim Titan bleiben alle 16 Knochen, Panzergeometrie und Bindungen erhalten.</p>'''+''.join(sections)+'''<p>65 ms je Gangframe gelten bei nominaler Bewegung. Die gespeicherte Gangstrecke koppelt die Phase an die zurückgelegte Strecke; beim Stehen bleibt sie stehen. Die Angriffsuhr ist unabhängig. Der Geometrieaudit prüft 257 Zwischenzeiten und tatsächliche Griff- und Fußflächen. Diskrete Sprite-Bilder behalten ihre sichtbare zeitliche Quantisierung. Diese Dateien sind isolierte Kandidaten.</p></main></html>'''
    temp=STAGE/'review.writing.html';temp.write_text(html,encoding='utf-8');os.replace(temp,STAGE/'review.html')
    print(json.dumps({k:{n:v for n,v in row.items() if n!='bounds'} for k,row in summary.items()},indent=2))
if __name__=='__main__':main()