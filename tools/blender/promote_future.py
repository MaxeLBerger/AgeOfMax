"""Publish the reviewed local Future candidate after backup and contract checks.

This script is intentionally scoped to exactly one canonical scene and its PNG.
It is run only after the supervising task has reviewed the candidate in the game.
"""
import hashlib
import json
import os
import shutil
import time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
STAGE=ROOT/'art/blender/candidates/future-v2'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_file(source,target):
    for attempt in range(12):
        try:
            os.replace(source,target)
            return
        except PermissionError:
            if attempt==11:
                raise
            time.sleep(.1*(attempt+1))


def main():
    source_check=json.loads((STAGE/'source-check.json').read_text())
    render_check=json.loads((STAGE/'render-check.json').read_text())
    proof=json.loads((STAGE/'reproduction-check.json').read_text())
    assert all(record['passed'] for record in [source_check,render_check,proof])
    pairs=[(STAGE/'background-future.blend',ROOT/'art/blender/background-future.blend',
            STAGE/'baseline/background-future.blend',proof['candidate_blend_sha256'],proof['canonical_blend_sha256']),
           (STAGE/'future.png',ROOT/'public/assets/reborn/backgrounds/future.png',
            STAGE/'baseline/future.png',proof['candidate_png_sha256'],proof['public_png_sha256'])]
    other_paths=[path for epoch in ['stone','castle','renaissance','modern']
                 for path in [ROOT/f'art/blender/background-{epoch}.blend',ROOT/f'public/assets/reborn/backgrounds/{epoch}.png']]
    other_before={str(path.relative_to(ROOT)):digest(path) for path in other_paths}
    for candidate,canonical,backup,new_hash,old_hash in pairs:
        assert candidate.resolve().is_relative_to(STAGE.resolve())
        assert canonical.resolve().is_relative_to(ROOT.resolve())
        assert digest(candidate)==new_hash,'Candidate changed after review'
        assert digest(backup)==old_hash,'Archived original changed'
        assert digest(canonical)==old_hash,'Canonical file changed since archival'
    # Both payloads are fully copied and verified before either live file is replaced.
    temporary=[]
    for candidate,canonical,backup,new_hash,old_hash in pairs:
        pending=canonical.with_name(canonical.name+'.future-v2-pending')
        shutil.copy2(candidate,pending)
        assert digest(pending)==new_hash
        temporary.append(pending)
    for pending,record in zip(temporary,pairs):
        replace_file(pending,record[1])
    for candidate,canonical,backup,new_hash,old_hash in pairs:
        assert digest(canonical)==new_hash
        assert digest(backup)==old_hash
    other_after={str(path.relative_to(ROOT)):digest(path) for path in other_paths}
    assert other_before==other_after,'Another background changed during publication'
    report={'passed':True,'scope':'Exactly Future canonical Blender source and public PNG',
            'authorization':'User requested complete local Blender rebuild; supervising task reviewed the Future candidate in the game HUD and explicitly approved these two files.',
            'files':[{'candidate':str(candidate.relative_to(ROOT)),'canonical':str(canonical.relative_to(ROOT)),
                      'backup':str(backup.relative_to(ROOT)),'old_sha256':old_hash,'new_sha256':new_hash}
                     for candidate,canonical,backup,new_hash,old_hash in pairs],
            'other_four_backgrounds_unchanged':True,'other_background_hashes':other_after,
            'replacement':'Each destination is replaced atomically after both payload copies validate; the two-file pair is not a filesystem transaction.'}
    (STAGE/'promotion.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    main()
