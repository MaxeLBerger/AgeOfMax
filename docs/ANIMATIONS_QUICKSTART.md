#  ANIMATIONS QUICK START

##  Dein Weg zu animierten Units (3 einfache Wege)

---

##  WEG 1: Einfachster Start (Leonardo.ai - KOSTENLOS)

###  Am besten für: Schnelles Testen, kein Budget

**Zeit**: 30 Minuten  
**Kosten**: KOSTENLOS (150 Bilder/Tag)  
**Schwierigkeit**: Einfach 

### Schritte:
1. **Gehe zu**: https://leonardo.ai
2. **Registriere dich** (kostenlos)
3. **Öffne**: \docs/ANIMATION_PROMPTS_CLUBMAN.md\
4. **Kopiere** jeden Prompt einzeln (19 Stück)
5. **Generiere** in Leonardo.ai:
   - Model: **Pixel Art Diffusion XL**
   - Size: **512x512**
   - Generate **4 versions** pro Prompt
6. **Download** beste Version jedes Frames
7. **Benenne um**: 
   - \clubman_idle_001.png\
   - \clubman_idle_002.png\
   - ... bis \clubman_death_004.png\

###  Fertig! Du hast jetzt 19 Animationsframes!

---

##  WEG 2: Vollautomatisch (Replicate API)

###  Am besten für: Alle Units auf einmal, minimaler Aufwand

**Zeit**: 20 Minuten (läuft automatisch)  
**Kosten**: Erste 100 KOSTENLOS, dann ~\ für alle  
**Schwierigkeit**: Mittel 

### Schritte:
1. **API Key holen**:
   - Gehe zu: https://replicate.com/account/api-tokens
   - Kopiere deinen Token

2. **Script ausführen**:
\\\powershell
# Generiere NUR Clubman (zum Testen)
python tools/generate-single-unit-animations.py clubman --api-key 'dein_key'

# ODER alle 16 Units auf einmal
python tools/generate-all-unit-animations.py --api-key 'dein_key'
\\\

3. **Warten**: Script lädt alle Frames automatisch herunter

###  Fertig! Frames sind in \downloads/animations/\

---

##  WEG 3: Selbst zeichnen (Pixel Art Tools)

###  Am besten für: Maximale Kontrolle, eigener Stil

**Zeit**: 1-2 Tage pro Unit  
**Kosten**: KOSTENLOS (oder \ für Aseprite)  
**Schwierigkeit**: Fortgeschritten 

### Tools:
- **Aseprite** (\) - Beste Pixel-Art Software
- **Piskel** (kostenlos) - https://www.piskelapp.com
- **GraphicsGale** (kostenlos) - Windows only

### Tutorial:
- YouTube: 'pixel art walk cycle tutorial'
- YouTube: 'sprite animation for games'

---

##  Nach der Generierung: Spritesheets erstellen

### Option A: Automatisch (Python)
\\\powershell
python tools/create-spritesheets.py
\\\

### Option B: Manuell (Photoshop/GIMP)
1. Neue Datei: **384x64** (6 Frames x 64px)
2. Frames **horizontal** anordnen
3. Exportieren als **PNG** mit Transparenz
4. Speichern als: \clubman_walk.png\

---

##  Animationen ins Spiel einbauen

### 1. Spritesheets kopieren
\\\
public/assets/units/stone_age/
  clubman_idle.png
  clubman_walk.png
  clubman_attack.png
  clubman_death.png
\\\

### 2. Code hinzufügen (siehe unten)

### 3. Testen!
\\\powershell
npm run dev
\\\

---

##  Minimale Implementation (nur Walk-Animation)

Wenn du erstmal NUR die Walk-Animation testen willst:

### Nur 6 Frames generieren statt 19!

**Prompts** (Kopiere diese in Leonardo.ai):

\\\
1. Pixel art caveman walking, frame 1/6, left foot forward, 64x64, transparent
2. Pixel art caveman walking, frame 2/6, mid-stride, 64x64, transparent
3. Pixel art caveman walking, frame 3/6, right foot forward, 64x64, transparent
4. Pixel art caveman walking, frame 4/6, mid-stride, 64x64, transparent
5. Pixel art caveman walking, frame 5/6, left foot forward, 64x64, transparent
6. Pixel art caveman walking, frame 6/6, cycle complete, 64x64, transparent
\\\

**Erstelle Spritesheet**: Alle 6 Frames nebeneinander = **384x64 PNG**

**Code** (BattleScene.ts):
\\\	ypescript
// In create():
this.load.spritesheet('clubman', 'assets/units/stone_age/clubman_walk.png', {
  frameWidth: 64,
  frameHeight: 64
});

this.anims.create({
  key: 'clubman-walk',
  frames: this.anims.generateFrameNumbers('clubman', { start: 0, end: 5 }),
  frameRate: 12,
  repeat: -1
});

// In spawnUnit():
unit.play('clubman-walk');
\\\

---

##  Vergleich der Wege

| Methode | Zeit | Kosten | Schwierigkeit | Qualität |
|---------|------|--------|---------------|----------|
| Leonardo.ai | 30 Min | KOSTENLOS |  |  |
| Replicate API | 20 Min | ~\ |  |  |
| Selbst zeichnen | 1-2 Tage | \-20 |  |  |

---

##  Meine Empfehlung

### Für dich (schneller Test):
1. **Starte mit Leonardo.ai** (kostenlos)
2. **Mache NUR Clubman** (19 Frames)
3. **Teste im Spiel**
4. **Wenn es dir gefällt**: Mache mehr Units!

### Falls es zu viel ist:
 Mach erstmal NUR Walk-Animation (6 Frames)
 Teste ob dir der Stil gefällt
 Dann Rest später

---

##  Brauchst du Hilfe?

**Ich kann dir helfen mit**:
- Prompts für spezifische Units schreiben
- Python-Scripts zum Automatisieren erstellen
- Phaser-Code für komplexe Animationen

**Sag einfach Bescheid!** 

---

##  Weitere Docs

- \docs/ANIMATIONS_GUIDE.md\ - Kompletter Guide
- \docs/ANIMATION_PROMPTS_CLUBMAN.md\ - Alle 19 Prompts
- \	ools/auto-generate-assets.py\ - Automatisierungs-Script
