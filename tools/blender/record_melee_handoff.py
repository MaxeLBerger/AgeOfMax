"""Record the complete, independently reviewable melee handoff without promotion."""
import argparse,datetime,hashlib,json,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];STAGE=ROOT/'art/blender/candidates/animation-v3/melee-family'
UNITS=['clubman','spearman','swordsman','duelist','super-heavy']
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def load(path):return json.loads(path.read_text())
def atomic(path,text):
    temp=path.with_name(path.stem+'.writing'+path.suffix);temp.write_text(text,encoding='utf-8');os.replace(temp,path)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--visual-reviewed',action='store_true');args=parser.parse_args();assert args.visual_reviewed
    source_audit=load(STAGE/'source-audit.json');preservation=load(STAGE/'source-preservation.json');renders=load(STAGE/'render-check.json');browser=load(STAGE/'browser-video-check.json')
    assert len(source_audit)==len(preservation)==len(renders)==10 and browser['passed'] and browser['videos']==10
    assets=[];table=[]
    for unit in UNITS:
        for suffix in ['', '-enemy']:
            key=unit+suffix;directory=STAGE/key;model=load(directory/'model-check.json')
            assert source_audit[key]['passed'] and preservation[key]['passed'] and renders[key]['passed']
            source=directory/f'unit-{key}.blend';sheet=directory/f'{key}-16.png'
            assert digest(source)==source_audit[key]['source_sha256']==preservation[key]['source_sha256']==renders[key]['source_sha256']
            assert digest(sheet)==renders[key]['sheet_sha256']
            for candidate,canonical,baseline,before in [
              (source,ROOT/f'art/blender/unit-{key}.blend',directory/'baseline'/f'unit-{key}.blend',model['source_hashes']['source']),
              (sheet,ROOT/f'public/assets/reborn/units{suffix}/{unit}.png',directory/'baseline'/f'{unit}.png',model['source_hashes']['sheet'])]:
                assert digest(canonical)==digest(baseline)==before
                assets.append({'unit':key,'candidate':str(candidate.relative_to(ROOT)).replace('\\','/'),'candidate_sha256':digest(candidate),'candidate_bytes':candidate.stat().st_size,'current_canonical':str(canonical.relative_to(ROOT)).replace('\\','/'),'current_canonical_sha256':before,'original_backup':str(baseline.relative_to(ROOT)).replace('\\','/'),'original_backup_sha256':before})
            assert digest(ROOT/'public/assets/reborn/weapon-sockets.json')==model['source_hashes']['sockets']
        model=load(STAGE/unit/'model-check.json');gait=source_audit[unit]['gait']
        table.append(f"| {unit} | {model['mesh_count']} | {model['bone_count']} | {gait['cycleDistancePixels']:.2f} px | {model['cycle_distance_world']:.9f} |")
    gait=load(STAGE/'gait-metadata.partial.json');sockets=load(STAGE/'weapon-sockets.json')
    assert set(gait)==set(sockets)==set(UNITS)
    assert all(len(sockets[u])==16 and len(gait[u])==7 for u in UNITS)
    report={'status':'complete_isolated_melee_family_ready_for_independent_review','created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'production_promoted':False,'units':UNITS,'teams':2,'sources':10,'sheets':10,'frames':160,'asset_count':len(assets),'assets':assets,'gait_metadata':'gait-metadata.partial.json','weapon_sockets':'weapon-sockets.json','passed_reports':['source-audit.json','source-preservation.json','render-check.json','browser-video-check.json'],'personal_visual_review':['pose-preview.jpg','extension-pose-preview.jpg','family-overview.jpg']+[u+'/contact-sheet.jpg' for u in UNITS],
      'max_nominal_or_half_stance_drift_game_pixels':max(s['max_stance_screen_drift_pixels'] for a in source_audit.values() for s in a['motion_scenarios']),'all_stopped_phase_drift_zero':all(a['motion_scenarios'][2]['max_stance_screen_drift_pixels']==0 for a in source_audit.values()),'max_clip_entry_loop_recovery_seam_world':max(max(a['loop_seam_world'],a['attack_entry_seam_world'],a['recovery_seam_world']) for a in source_audit.values()),'titan_real_mesh_surface_intersections_per_team':{k:len(source_audit[k]['surface_intersections']) for k in ['super-heavy','super-heavy-enemy']}}
    atomic(STAGE/'handoff.json',json.dumps(report,indent=2))
    text='''# Nahkampffamilie – isolierter Abschluss

Fünf Einheiten, beide Teams: zehn editierbare Blender-Quellen und zehn RGBA-Sheets mit je 16 echten Bildern. Noch keine dieser Dateien wurde durch diesen Batch nach Canonical, Public oder Dist übernommen. `handoff.json` enthält die 20 konkreten Kandidaten, aktuelle Zielhashes und Originalarchive.

Keulenschlag mit weitem Ausholen, axialer Speerstoß, angehobener Schwertschnitt, kompakter Duellstoß und separater schwerer Titan-Hammerschlag. Die frühen Posen beider Teilgruppen wurden vom übergeordneten Agenten persönlich angesehen und freigegeben. Der vollständige Kontaktbogen jeder Spielfigur und die gemeinsame Teamübersicht wurden anschließend lokal visuell geprüft.

| Einheit | Originalmeshes | Knochen im Kandidat | Gangstrecke im Spiel | Gangstrecke Blender |
|---|---:|---:|---:|---:|
'''+ '\n'.join(table)+'''

Alle Originalmeshes, ursprünglichen Restknochen, Kamera und tatsächlich verwendeten Materialeingaben, Verbindungen und Farbrampen bleiben erhalten. Gewöhnliche Figuren erhalten fehlende Hand-/Fuß-/Waffenkontrollen; Speer und Schwert einen real am zweiten Arm gehaltenen Schild. Beim Titan v2 bleiben zusätzlich sämtliche Bindungen und alle 16 Knochen erhalten; seine breitere Panzergeometrie und beide Hammergriffe werden eigenständig animiert. Blender lässt beim Speichern vier unreferenzierte alte Titan-Materialblöcke aus; sie bleiben im unveränderten Originalarchiv und sind in `source-preservation.json` ausdrücklich benannt.

Gespeicherter v3-Vertrag: getrennte Actions `walk` und `attack`, jeweils Bilder 0–7 plus ungerenderter Abschluss bei Actionframe 8. Walk 520 ms, Attack 320 ms, Kontakt auf Sprite 12 nach 160 ms. Die sieben Gangfelder sind sowohl direkt in jeder .blend als `animation_study_gait` als auch im jeweiligen JSON gespeichert; beide Teams stimmen exakt überein. 131 Gang- und 129 Angriffsschlüssel bewahren auch die Zwischenbewegung. Die Gangstrecke entsteht aus Geschwindigkeit, Displaymaßstab und echter Kameraprojektion.

`source-audit.json` prüft 257 Zeiten je Clip, reale Sohlenpunkte bei nominaler, halber und null Bewegung sowie echte Griffpunkte, Socketprojektion, unveränderte Produktionshashes und exakt schließende Loops. Beim Titan haben beide gepanzerten Handflächen in allen 16 Exportposen echte Segment-/Dreiecksschnitte mit dem Hammer: 32 je Team. Der vorherige reine Eckpunkt-Abstand meldete hier fälschlich einen Spalt; dieser Befund bleibt separat archiviert. Es wurde keine Toleranz vergrößert und dafür keine Geometrie verschoben.

`render-check.json` belegt je Sheet acht unterschiedliche Gangbilder, acht unterschiedliche Angriffsbilder, 4096 × 256 RGBA, identische Pixel zwischen Kacheln und Einzelexporten und keine Kachelabschneidung bei Alpha > 12. Alle zehn Vergleichsvideos werden tatsächlich als 504 Frames bei 200 fps dekodiert: exakt 2520 ms für drei Gang- und drei Angriffsdurchläufe. `browser-video-check.json` bestätigt Abspielen, voranschreitende Zeit, acht gezielte Seekzeiten und keine Browserfehler in einer separaten Browserinstanz.

Die kontinuierliche Standphase ist in Blender geprüft. Acht diskrete Gangbilder behalten ihre zeitliche Quantisierung. Übergänge aus beliebigen Laufphasen zu abruptem Stillstand oder Angriff müssen im integrierten Spiel beurteilt werden; dieser Kandidatenbatch ersetzt diese Laufzeitprüfung nicht. Der globale 20-Einheiten-/40-Sheet-Bootvertrag wird vom übergeordneten Agenten erst mit allen Familien umgestellt.

Die Originale liegen in jedem Einheitenordner unter `baseline/`. Vergleich: `review.html`, `family-overview.jpg`, pro Figur `contact-sheet.jpg` und `motion-comparison.webm`.
'''
    atomic(STAGE/'MELEE_REVIEW.md',text)
    print(json.dumps({k:v for k,v in report.items() if k!='assets'},indent=2))
if __name__=='__main__':main()