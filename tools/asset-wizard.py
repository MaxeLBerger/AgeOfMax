#!/usr/bin/env python3
"""
Interactive Asset Wizard

Guides you through generating assets one-by-one (or in batches) with your
preferred image tool, then validates and organizes them automatically.

Requirements:
  - Python 3.10+
  - Pillow (optional, for strict transparency checks): pip install pillow

Usage examples:
  python tools/asset-wizard.py                 # start from 1, pause every 10
  python tools/asset-wizard.py --from 11 --to 20
  python tools/asset-wizard.py --strict        # require PNG w/ transparency
"""

from __future__ import annotations
import json
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
import argparse


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "tools" / "assets-manifest.json"


@dataclass
class Asset:
    id: int
    slug: str
    filename: str
    w: int
    h: int
    prompt: str

    @staticmethod
    def from_dict(d: dict) -> "Asset":
        return Asset(
            id=int(d["id"]),
            slug=str(d["slug"]),
            filename=str(d["filename"]),
            w=int(d["w"]),
            h=int(d["h"]),
            prompt=str(d["prompt"]) 
        )


def find_downloads() -> Path | None:
    d = Path.home() / "Downloads"
    return d if d.exists() else None


def load_manifest() -> list[Asset]:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return [Asset.from_dict(x) for x in data]


def print_header(title: str):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60 + "\n")


def run_validator(strict: bool, path: Path) -> tuple[bool, str]:
    args = ["python", str(ROOT / "tools" / "validate-assets.py")]
    args += ["--path", str(path)]
    if strict:
        args.append("--strict")
    try:
        result = subprocess.run(args, capture_output=True, text=True, check=False)
        ok = result.returncode in (0,)
        return ok, result.stdout
    except Exception as e:
        return False, f"Validator error: {e}"


def move_asset(file: Path, asset: Asset):
    assets_root = ROOT / "public" / "assets"
    # Determine subfolder from organize script mapping
    if 1 <= asset.id <= 16:
        sub = "units"
    elif 17 <= asset.id <= 31:
        sub = "turrets" if asset.id <= 31 else "turrets"
    elif 32 <= asset.id <= 33:
        sub = "buildings"
    elif 34 <= asset.id <= 38:
        sub = "projectiles"
    elif 39 <= asset.id <= 43:
        sub = "ui"
    else:
        sub = "backgrounds"

    target_dir = assets_root / sub
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / {
        1:"clubman.png",2:"spearman.png",3:"slinger.png",4:"dino-rider.png",
        5:"swordsman.png",6:"archer.png",7:"knight.png",8:"ballista.png",
        9:"musketeer.png",10:"cavalry.png",11:"cannon.png",12:"duelist.png",
        13:"rifleman.png",14:"grenadier.png",15:"tank.png",16:"sniper.png",
        17:"stone-tower-t1.png",18:"stone-tower-t2.png",19:"stone-tower-t3.png",
        20:"castle-tower-t1.png",21:"castle-tower-t2.png",22:"castle-tower-t3.png",
        23:"cannon-tower-t1.png",24:"cannon-tower-t2.png",25:"cannon-tower-t3.png",
        26:"gun-turret-t1.png",27:"gun-turret-t2.png",28:"gun-turret-t3.png",
        29:"laser-turret-t1.png",30:"laser-turret-t2.png",31:"laser-turret-t3.png",
        32:"player-base.png",33:"enemy-base.png",
        34:"rock.png",35:"arrow.png",36:"cannonball.png",37:"bullet.png",38:"laser.png",
        39:"gold-coin.png",40:"xp-star.png",41:"raining-rocks-icon.png",42:"artillery-strike-icon.png",43:"turret-placeholder.png",
        44:"stone-age-bg.png",45:"castle-age-bg.png",46:"renaissance-bg.png",47:"modern-bg.png",48:"future-bg.png",
    }[asset.id]

    data = file.read_bytes()
    target.write_bytes(data)
    return target


def find_candidate(downloads: Path, asset: Asset) -> Path | None:
    # accept filenames that include the asset id or the expected filename
    idstr = str(asset.id)
    for p in sorted(downloads.glob("*")):
        if not p.is_file():
            continue
        name = p.name.lower()
        if (idstr in name) or (asset.filename.lower() in name):
            if p.suffix.lower() in (".png", ".jpg", ".webp"):
                return p
    return None


def wizard(start: int, end: int | None, pause_every: int, strict: bool):
    assets = load_manifest()
    downloads = find_downloads()
    if not downloads:
        print("Downloads-Ordner nicht gefunden. Bitte --path in validate-assets.py nutzen.")
        return 1

    # Clamp selection
    selection = [a for a in assets if a.id >= start and (end is None or a.id <= end)]
    if not selection:
        print("Keine Assets in diesem Bereich.")
        return 0

    print_header(f"Asset Wizard: {selection[0].id} bis {selection[-1].id}")
    for idx, asset in enumerate(selection, start=1):
        print(f"Asset {asset.id} — {asset.slug}  ({asset.w}x{asset.h})")
        print("Dateiname:", asset.filename)
        print("Prompt:")
        print(asset.prompt)
        print("\nÖffne Codex/Tool, generiere das Bild, speichere es in Downloads.")

        # Poll for file arrival
        candidate = None
        for _ in range(180):  # up to ~3 minutes
            candidate = find_candidate(downloads, asset)
            if candidate:
                break
            time.sleep(1)

        if not candidate:
            input("Kein Download gefunden. Drücke Enter nach dem Speichern...")
            candidate = find_candidate(downloads, asset)

        if not candidate:
            print("Übersprungen: Keine Datei gefunden. Weiter zum nächsten.")
            continue

        print("Gefunden:", candidate.name)

        ok, out = run_validator(strict=strict, path=downloads)
        print(out)
        if not ok:
            ans = input("Validator meldet Probleme. Trotzdem verschieben? (y/N): ").strip().lower()
            if ans != "y":
                print("Bitte neu generieren und erneut versuchen.")
                continue

        target = move_asset(candidate, asset)
        print("Verschoben nach:", target.relative_to(ROOT))

        # Pause every N
        if pause_every and (asset.id % pause_every == 0) and (end is None or asset.id < end):
            input(f"Batch bis {asset.id} abgeschlossen. Enter zum Fortfahren...")

    print("\nFertig für diesen Bereich.")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="start", type=int, default=1, help="Start-Asset (default: 1)")
    ap.add_argument("--to", dest="end", type=int, default=None, help="End-Asset (inklusive)")
    ap.add_argument("--pause", dest="pause", type=int, default=10, help="Pause nach N Assets (default: 10)")
    ap.add_argument("--strict", action="store_true", help="Strenge Validierung (PNG + Transparenz)")
    args = ap.parse_args()

    return wizard(args.start, args.end, args.pause, args.strict)


if __name__ == "__main__":
    raise SystemExit(main())

