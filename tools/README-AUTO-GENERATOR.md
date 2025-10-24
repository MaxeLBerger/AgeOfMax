#  Automatische Asset-Generierung

## Schritt 1: API Key holen (2 Minuten)

1. Gehe zu: https://replicate.com/signin
2. Registriere dich (KOSTENLOS - erste 100 Generierungen gratis!)
3. Gehe zu: https://replicate.com/account/api-tokens
4. Kopiere deinen API Token (sieht so aus: r8_abc123...)

## Schritt 2: Script ausführen

`powershell
# Mit API Key:
python tools/auto-generate-assets.py --api-key "DEIN_API_KEY_HIER"

# Oder setze Umgebungsvariable:
$env:REPLICATE_API_TOKEN = "DEIN_API_KEY_HIER"
python tools/auto-generate-assets.py
`

## Schritt 3: Warten

Das Script generiert jetzt ALLE 48 Assets automatisch!
- Dauert ca. 3-5 Minuten
- Alle Bilder werden in downloads/generated-assets/ gespeichert
- Automatische Benennung: asset-1-clubman.png, asset-2-spearman.png, etc.

## Schritt 4: Assets organisieren

`powershell
python tools/organize-assets.py
`

Das kopiert alle Assets in die richtigen Ordner (public/assets/units/, etc.)

## Fertig! 

---

##  Kosten

- Replicate: Erste 100 Generierungen KOSTENLOS
- Danach: ~$0.05 pro Bild = ~$2.40 für alle 48 Assets
- Alternativ: Monatliches Abo $20 = unbegrenzt

---

##  Erweiterte Optionen

`powershell
# Nur Vorschau (ohne zu generieren):
python tools/auto-generate-assets.py --dry-run

# Ab Asset 10 starten (z.B. wenn 1-9 schon fertig):
python tools/auto-generate-assets.py --start-from 10

# Hilfe anzeigen:
python tools/auto-generate-assets.py --help
`

---

##  Probleme?

**"No module named 'replicate'"**
 Das Script installiert es automatisch beim ersten Mal

**"ERROR: No API key found!"**
 Folge Schritt 1 oben

**"Rate limit exceeded"**
 Warte 1 Minute und führe Script nochmal aus (mit --start-from N)

---

##  Style anpassen?

Bearbeite 	ools/auto-generate-assets.py und ändere die Prompts im ASSETS-Array!
