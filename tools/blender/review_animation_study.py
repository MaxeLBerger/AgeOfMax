"""Pack study sheets and make time-matched old/new motion reviews, without publishing."""
import hashlib,json,shutil,subprocess
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/animation-v3'
FONT=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',18)
SMALL=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',13)
BG=(24,34,43)


def backdrop(size):
    image=Image.new('RGB',size,BG)
    return image


def paste(canvas,sprite,x,y):canvas.paste(sprite,(x,y),sprite.getchannel('A'))


def video_frame(unit,old,new,clip,index):
    image=backdrop((640,336));draw=ImageDraw.Draw(image)
    draw.text((18,12),unit.upper()+' / '+('WALK 520 ms' if clip=='walk' else 'ATTACK 320 ms'),font=FONT,fill=(226,233,238))
    draw.text((44,43),'Current 8-frame sheet',font=SMALL,fill=(171,187,199))
    draw.text((356,43),'Blender study: 16 frames',font=SMALL,fill=(171,187,199))
    offset=8 if clip=='attack' else 0
    old_index=index//2+(4 if clip=='attack' else 0)
    paste(image,old[old_index],32,64);paste(image,new[offset+index],352,64)
    draw.line((18,300,304,300),fill=(65,81,94));draw.line((338,300,624,300),fill=(65,81,94))
    if clip=='attack' and index==4:
        draw.text((246,312),'CONTACT 160 ms',font=SMALL,fill=(239,196,112))
    else:draw.text((258,312),f'{index*(40 if clip=="attack" else 65)} ms',font=SMALL,fill=(171,187,199))
    return image


def main():
    all_sockets={};summaries={}
    for unit in ['clubman','knight']:
        directory=STAGE/unit
        report=json.loads((directory/'geometry-check.json').read_text())
        old_sheet=Image.open(directory/'baseline'/f'{unit}.png').convert('RGBA')
        old=[old_sheet.crop((i*256,0,(i+1)*256,256)) for i in range(8)]
        frames=[Image.open(directory/'frames'/f'{i:02d}.png').convert('RGBA') for i in range(16)]
        assert all(im.size==(256,256) for im in frames)
        hashes=[hashlib.sha256(im.tobytes()).hexdigest() for im in frames]
        assert len(set(hashes[:8]))==8 and len(set(hashes[8:]))==8,'Duplicated actual study render'
        bounds=[im.getchannel('A').point(lambda v:255 if v>12 else 0).getbbox() for im in frames]
        assert all(b and b[0]>=2 and b[1]>=2 and b[2]<=254 and b[3]<=254 for b in bounds),bounds
        sheet=Image.new('RGBA',(4096,256))
        for i,im in enumerate(frames):sheet.paste(im,(i*256,0))
        sheet.save(directory/f'{unit}-16.png')
        contact=backdrop((2048,1160));draw=ImageDraw.Draw(contact)
        for row,(title,items,ms) in enumerate([
                ('CURRENT WALK / 4 samples over 520 ms',old[:4],130),
                ('STUDY WALK / 8 samples over 520 ms',frames[:8],65),
                ('CURRENT ATTACK / 4 samples over 320 ms',old[4:],80),
                ('STUDY ATTACK / 8 samples over 320 ms',frames[8:],40)]):
            draw.text((14,row*290+5),unit.upper()+' - '+title,font=FONT,fill=(225,233,239))
            pitch=2048//len(items)
            for index,im in enumerate(items):
                x=index*pitch+(pitch-256)//2
                paste(contact,im,x,row*290+30)
                label=f'{index*ms} ms'
                if row>=2 and index*ms==160:label+=' / CONTACT'
                draw.text((index*pitch+10,row*290+265),label,font=SMALL,fill=(238,194,111))
        contact.save(directory/'contact-sheet.jpg',quality=93)
        clips={clip:[video_frame(unit,old,frames,clip,i) for i in range(8)] for clip in ['walk','attack']}
        ffmpeg=shutil.which('ffmpeg')
        assert ffmpeg,'A local ffmpeg executable is required for the exact-timing comparison'
        command=[ffmpeg,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','640x336','-r','200','-i','pipe:0',
                 '-an','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6','-crf','25','-b:v','0','-pix_fmt','yuv420p',
                 str(directory/'motion-comparison.webm')]
        process=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
        for clip,repeats,ticks in [('walk',3,13),('attack',3,8)]:
            for repeat in range(repeats):
                for im in clips[clip]:
                    payload=im.tobytes()
                    for tick in range(ticks):process.stdin.write(payload)
        process.stdin.close();error=process.stderr.read();code=process.wait()
        assert code==0,error.decode(errors='replace')
        ffprobe=shutil.which('ffprobe')
        assert ffprobe,'A local ffprobe is required to verify actual video decoding'
        probe=subprocess.run([ffprobe,'-v','error','-count_frames','-select_streams','v:0','-show_entries',
            'stream=width,height,r_frame_rate,nb_read_frames:format=duration','-of','json',str(directory/'motion-comparison.webm')],capture_output=True,text=True,check=True)
        media=json.loads(probe.stdout)
        assert media['streams'][0]['nb_read_frames']=='504' and media['streams'][0]['r_frame_rate']=='200/1'
        assert abs(float(media['format']['duration'])-2.52)<.000001
        (directory/'video-check.json').write_text(json.dumps(media,indent=2),encoding='utf-8')
        # GIF is a convenient secondary preview; 65ms walk holds alternate60/70ms
        # because GIF has a10ms clock. Exact65ms timing is preserved in the WebM.
        images=[];durations=[]
        for clip,repeats in [('walk',3),('attack',3)]:
            for repeat in range(repeats):
                images.extend(clips[clip]);durations.extend([60,70]*4 if clip=='walk' else [40]*8)
        images[0].save(directory/'motion-comparison.gif',save_all=True,append_images=images[1:],duration=durations,loop=0,disposal=2)
        all_sockets[unit]=report['sockets']
        production={'source':hashlib.sha256((ROOT/f'art/blender/unit-{unit}.blend').read_bytes()).hexdigest(),
                    'sheet':hashlib.sha256((ROOT/f'public/assets/reborn/units/{unit}.png').read_bytes()).hexdigest(),
                    'sockets':hashlib.sha256((ROOT/'public/assets/reborn/weapon-sockets.json').read_bytes()).hexdigest()}
        assert production==report['production_hashes']
        summaries[unit]={'passed':True,'frames':16,'unique_walk_frames':8,'unique_attack_frames':8,'bounds':bounds,
                         'sheet':[4096,256],'contact_index':12,'contact_ms':160,'webm_fps':200,'webm_duration_ms':2520,
                         'production_unchanged':True,'source_geometry_report':'geometry-check.json'}
    (STAGE/'weapon-sockets.json').write_text(json.dumps(all_sockets,indent=2),encoding='utf-8')
    (STAGE/'render-check.json').write_text(json.dumps(summaries,indent=2),encoding='utf-8')
    (STAGE/'review.html').write_text('''<!doctype html><html lang="de"><meta charset="utf-8"><title>AgeOfMax Animationsstudie</title>
<style>body{margin:32px;background:#111a22;color:#e4eaf0;font:17px system-ui}main{max-width:1320px;margin:auto}section{display:inline-block;margin:12px 12px 24px 0}video{max-width:100%;border:1px solid #405263}p{color:#b5c3ce;max-width:1000px}a{color:#e7bc72}</style>
<main><h1>Blender-Animationsstudie: 8 → 16 Frames</h1><p>Links aktueller Stand, rechts echte neue Blender-Frames. Drei Gangzyklen à 520 ms, danach drei Angriffe à 320 ms. Kontakt jeweils 160 ms nach Angriffsbeginn. Die Videos verwenden identische Zeitachsen. Produktionsassets und Laufzeit sind unverändert.</p>
<section><h2>Keulenkämpfer</h2><video src="clubman/motion-comparison.webm" autoplay loop muted controls></video><p><a href="clubman/contact-sheet.jpg">Kontaktbogen</a></p></section>
<section><h2>Ritter</h2><video src="knight/motion-comparison.webm" autoplay loop muted controls></video><p><a href="knight/contact-sheet.jpg">Kontaktbogen</a></p></section>
<p>Gang: acht Frames à 65 ms statt vier Frames à 130 ms. Angriff: acht Frames à 40 ms statt vier Frames à 80 ms. Der neue Treffer liegt auf Sprite 12. Getrennte Blender-Actions enthalten eigene ungerenderte Loop-/Recovery-Abschlussschlüssel. WebM bewahrt 65 ms exakt; GIF ist nur die Zweitvorschau mit 60/70-ms-Wechsel.</p></main></html>''',encoding='utf-8')
    print(json.dumps({unit:{k:v for k,v in report.items() if k!='bounds'} for unit,report in summaries.items()},indent=2))


if __name__=='__main__':main()
