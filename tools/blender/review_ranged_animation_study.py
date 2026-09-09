"""Pack and compare staged ranged animation renders; never publish game assets."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
import review_animation_study as REVIEW
ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3/ranged-family'


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--preview',action='store_true');args=parser.parse_args()
    if args.preview:
        board=REVIEW.backdrop((1024,580));draw=ImageDraw.Draw(board)
        for row,unit in enumerate(['rifleman','sniper']):
            for col,frame in enumerate([0,3,12,15]):
                im=Image.open(STAGE/unit/'frames'/f'{frame:02d}.png').convert('RGBA')
                REVIEW.paste(board,im,col*256,row*290+25)
                draw.text((col*256+12,row*290+6),f'{unit} / frame {frame}',font=REVIEW.SMALL,fill=(233,225,207))
        board.save(STAGE/'pose-preview.jpg',quality=94);return
    summary={};sections=[]
    for unit in ['rifleman','sniper']:
        for faction in ['player','enemy']:
            suffix='-enemy' if faction=='enemy' else '';key=unit+suffix;directory=STAGE/key
            model=json.loads((directory/'model-check.json').read_text())
            old_sheet=Image.open(directory/'baseline'/f'{unit}.png').convert('RGBA')
            old=[old_sheet.crop((i*256,0,(i+1)*256,256)) for i in range(8)]
            frames=[Image.open(directory/'frames'/f'{i:02d}.png').convert('RGBA') for i in range(16)]
            assert all(im.size==(256,256) for im in frames)
            hashes=[hashlib.sha256(im.tobytes()).hexdigest() for im in frames]
            assert len(set(hashes[:8]))==8 and len(set(hashes[8:]))==8
            bounds=[im.getchannel('A').point(lambda v:255 if v>12 else 0).getbbox() for im in frames]
            assert all(b and b[0]>=2 and b[1]>=2 and b[2]<=254 and b[3]<=254 for b in bounds),(key,bounds)
            sheet=Image.new('RGBA',(4096,256))
            for i,im in enumerate(frames):sheet.paste(im,(i*256,0))
            sheet.save(directory/f'{key}-16.png')
            contact=REVIEW.backdrop((2048,1160));draw=ImageDraw.Draw(contact)
            for row,(title,items,ms) in enumerate([
                ('CURRENT WALK / 4 samples over 520 ms',old[:4],130),
                ('STUDY WALK / 8 samples over 520 ms',frames[:8],65),
                ('CURRENT ATTACK / 4 samples over 320 ms',old[4:],80),
                ('STUDY ATTACK / 8 samples over 320 ms',frames[8:],40)]):
                draw.text((14,row*290+5),key.upper()+' - '+title,font=REVIEW.FONT,fill=(225,233,239))
                pitch=2048//len(items)
                for index,im in enumerate(items):
                    REVIEW.paste(contact,im,index*pitch+(pitch-256)//2,row*290+30)
                    label=f'{index*ms} ms'+(' / CONTACT' if row>=2 and index*ms==160 else '')
                    draw.text((index*pitch+10,row*290+265),label,font=REVIEW.SMALL,fill=(238,194,111))
            contact.save(directory/'contact-sheet.jpg',quality=93)
            clips={clip:[REVIEW.video_frame(key,old,frames,clip,i) for i in range(8)] for clip in ['walk','attack']}
            ffmpeg=shutil.which('ffmpeg');ffprobe=shutil.which('ffprobe');assert ffmpeg and ffprobe
            process=subprocess.Popen([ffmpeg,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','640x336','-r','200','-i','pipe:0',
                '-an','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6','-crf','25','-b:v','0','-pix_fmt','yuv420p',str(directory/'motion-comparison.webm')],stdin=subprocess.PIPE,stderr=subprocess.PIPE)
            for clip,ticks in [('walk',13),('attack',8)]:
                for repeat in range(3):
                    for im in clips[clip]:
                        for tick in range(ticks):process.stdin.write(im.tobytes())
            process.stdin.close();error=process.stderr.read();assert process.wait()==0,error.decode(errors='replace')
            result=subprocess.run([ffprobe,'-v','error','-count_frames','-select_streams','v:0','-show_entries',
                'stream=width,height,r_frame_rate,nb_read_frames:format=duration','-of','json',str(directory/'motion-comparison.webm')],capture_output=True,text=True,check=True)
            media=json.loads(result.stdout)
            assert media['streams'][0]['nb_read_frames']=='504' and media['streams'][0]['r_frame_rate']=='200/1'
            assert abs(float(media['format']['duration'])-2.52)<.000001
            (directory/'video-check.json').write_text(json.dumps(media,indent=2),encoding='utf-8')
            production={'source':hashlib.sha256((ROOT/f'art/blender/unit-{key}.blend').read_bytes()).hexdigest(),
                'sheet':hashlib.sha256((ROOT/f'public/assets/reborn/units{suffix}/{unit}.png').read_bytes()).hexdigest(),
                'sockets':hashlib.sha256((ROOT/'public/assets/reborn/weapon-sockets.json').read_bytes()).hexdigest()}
            assert production==model['source_hashes']
            summary[key]={'passed':True,'frames':16,'unique_walk_frames':8,'unique_attack_frames':8,'sheet':[4096,256],
                'bounds':bounds,'contact_index':12,'contact_ms':160,'walk_ms':520,'attack_ms':320,
                'webm_fps':200,'webm_duration_ms':2520,'production_unchanged':True}
            sections.append(f'<section><h2>{key}</h2><video src="{key}/motion-comparison.webm" autoplay loop muted controls></video><p><a href="{key}/contact-sheet.jpg">Kontaktbogen</a></p></section>')
    (STAGE/'render-check.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
    (STAGE/'review.html').write_text('''<!doctype html><html lang="de"><meta charset="utf-8"><title>AgeOfMax Schützenstudie</title>
<style>body{margin:32px;background:#111a22;color:#e4eaf0;font:17px system-ui}main{max-width:1320px;margin:auto}section{display:inline-block;margin:12px 12px 24px 0}video{max-width:100%;border:1px solid #405263}p{color:#b5c3ce;max-width:1050px}a{color:#e7bc72}</style>
<main><h1>Schützenfamilie: 8 → 16 echte Blender-Frames</h1><p>Links aktueller Stand, rechts isolierte Studie. Drei Gangzyklen à 520 ms und drei Angriffe à 320 ms; Kontakt nach 160 ms. Beide Hände folgen festen Punkten der Waffe. Sniper-v2-Geometrie und Bindungen sind erhalten. Produktionsstand unverändert.</p>'''+''.join(sections)+'''
<p>65 ms je Gangframe gelten bei nominaler Bewegung. Bei Formationsbremsung soll die Laufphase später aus zurückgelegter Strecke entstehen. Die Angriffsuhr bleibt unabhängig davon. Die WebM-Dateien verwenden für beide Vergleichshälften dieselbe exakte Zeitachse.</p></main></html>''',encoding='utf-8')
    print(json.dumps({key:{k:v for k,v in report.items() if k!='bounds'} for key,report in summary.items()},indent=2))


if __name__=='__main__':main()
