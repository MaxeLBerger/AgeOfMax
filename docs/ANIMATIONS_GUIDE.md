#  ANIMATIONS-GUIDE für Age of Max

##  Übersicht

Für lebendige, animierte Units brauchst du **mehrere Frames** pro Unit.
Dieses System erstellt automatisch Spritesheets mit allen Animationen!

---

##  Animations-Typen

Jede Unit sollte haben:

### 1. **IDLE** (4 Frames)
   - Standanimation / Atemanimation
   - Loop: JA
   - FPS: 8
   - Verwendung: Unit steht herum

### 2. **WALK** (6 Frames)
   - Laufanimation
   - Loop: JA  
   - FPS: 12
   - Verwendung: Unit bewegt sich

### 3. **ATTACK** (5 Frames)
   - Angriffsanimation
   - Loop: NEIN
   - FPS: 10
   - Verwendung: Unit greift an

### 4. **DEATH** (4 Frames)
   - Todesanimation
   - Loop: NEIN
   - FPS: 8
   - Verwendung: Unit stirbt

**GESAMT pro Unit: 19 Frames!**

---

##  Schritt 1: Frames generieren

### Option A: Mit Replicate (Empfohlen)

\\\powershell
# 1. API Key holen von https://replicate.com/account/api-tokens

# 2. Generiere alle Animationsframes:
python tools/generate-all-animations.py --api-key 'dein_api_key'

# Das erstellt:
# - downloads/animations/clubman/idle_001.png
# - downloads/animations/clubman/idle_002.png
# - downloads/animations/clubman/walk_001.png
# - ... (19 Frames pro Unit)
\\\

### Option B: Mit KI-Tools (Manual)

Nutze diese Prompts mit:
- **Midjourney** (/imagine prompt)
- **DALL-E 3** (ChatGPT Plus)
- **Leonardo.ai** (kostenlos!)
- **Stable Diffusion**

**Beispiel Clubman WALK Frames:**

\\\
Frame 1: Pixel art side-view sprite of caveman warrior walking, frame 1 of 6, left foot forward, holding wooden club, brown fur clothing, 64x64 pixels, transparent background, retro game sprite

Frame 2: Pixel art side-view sprite of caveman warrior walking, frame 2 of 6, mid-stride, club swinging slightly, 64x64 pixels, transparent background, retro game sprite

Frame 3: Pixel art side-view sprite of caveman warrior walking, frame 3 of 6, right foot forward, 64x64 pixels, transparent background, retro game sprite

[... etc für alle 6 Frames]
\\\

---

##  Schritt 2: Spritesheet erstellen

### Automatisch mit Python-Tool

\\\powershell
# Erstelle Spritesheets aus einzelnen Frames:
python tools/create-spritesheets.py

# Das erstellt:
# - public/assets/units/stone_age/clubman_spritesheet.png (1 Zeile = 1 Animation)
# - public/assets/units/stone_age/clubman_animations.json (Frame-Daten)
\\\

### Manuell mit Photoshop/GIMP

1. **Neue Datei**: 384x64 (6 Frames @ 64x64)
2. **Frames horizontal anordnen**: Idle Frame 1 | Idle Frame 2 | ... 
3. **Exportieren**: PNG mit Transparenz
4. **Speichern als**: clubman_idle.png

---

##  Schritt 3: Animationen ins Spiel einbauen

### In BattleScene.ts erweitern:

\\\	ypescript
// 1. Spritesheets laden (BootScene.ts)
this.load.spritesheet('clubman-idle', 
  'assets/units/stone_age/clubman_idle.png',
  { frameWidth: 64, frameHeight: 64 }
);

this.load.spritesheet('clubman-walk', 
  'assets/units/stone_age/clubman_walk.png',
  { frameWidth: 64, frameHeight: 64 }
);

// 2. Animationen erstellen (BattleScene.ts - create())
this.anims.create({
  key: 'clubman-idle-anim',
  frames: this.anims.generateFrameNumbers('clubman-idle', { start: 0, end: 3 }),
  frameRate: 8,
  repeat: -1 // Endlos-Loop
});

this.anims.create({
  key: 'clubman-walk-anim',
  frames: this.anims.generateFrameNumbers('clubman-walk', { start: 0, end: 5 }),
  frameRate: 12,
  repeat: -1
});

// 3. Animationen abspielen (in spawnUnit())
const unit = unitGroup.get(spawnX, LANE_Y, 'clubman-walk');
unit.play('clubman-walk-anim'); // Startet Animation!
\\\

---

##  Produktions-Übersicht

### Wenn du ALLE Units animierst:

- **16 Units** (Stone Age bis Modern Age)
- **19 Frames** pro Unit
- **= 304 Einzelbilder**

### Kosten-Schätzung (Replicate):

- Erste 100 Frames: **KOSTENLOS**
- Frames 101-304: ~\.05 pro Bild = **~\**
- **ODER** Abo \/Monat = **UNBEGRENZT**

### Zeit-Schätzung:

- **Automatisch (Python)**: ~20 Minuten
- **Semi-Auto (Leonardo)**: ~2-3 Stunden
- **Komplett Manual**: ~1-2 Tage

---

##  Quick Start (EINFACHSTE Methode)

### Nur 1 Unit animieren (Clubman):

\\\powershell
# 1. Generiere nur Clubman Frames
python tools/generate-single-unit-animation.py clubman

# 2. Erstelle Spritesheet
python tools/create-spritesheet.py clubman

# 3. Teste im Spiel!
npm run dev
\\\

---

##  Alternative: Frame-by-Frame Drawing

Wenn du selbst zeichnen möchtest:

1. **Aseprite** (beste Pixel-Art Software, \)
2. **Piskel** (kostenlos, Browser-basiert)
3. **GraphicsGale** (kostenlos, Windows)

**Tutorial-Video**: Suche YouTube nach 'pixel art walk cycle tutorial'

---

##  Datei-Struktur

\\\
public/assets/units/
  stone_age/
    clubman_idle.png        (256x64 - 4 Frames horizontal)
    clubman_walk.png        (384x64 - 6 Frames horizontal)
    clubman_attack.png      (320x64 - 5 Frames horizontal)
    clubman_death.png       (256x64 - 4 Frames horizontal)
    clubman.json            (Frame-Daten & Timing)
\\\

---

##  Nächste Schritte

**Wähle deinen Weg:**

### A) Vollautomatisch mit KI
 Nutze \generate-all-animations.py\
 ~20 Min, ~\ Kosten

### B) Semi-automatisch mit Leonardo.ai
 Generiere Frames manuell in Browser
 ~3 Std, KOSTENLOS

### C) Eigene Pixel Art zeichnen
 Nutze Aseprite/Piskel
 ~2 Tage, KOSTENLOS, aber zeitaufwändig

**Empfehlung**: Starte mit **Option B** (Leonardo.ai) für 1-2 Units zum Testen!

---

##  FAQ

**Q: Muss ich ALLE Units sofort animieren?**
A: Nein! Starte mit 1-2 Units, teste ob es dir gefällt.

**Q: Kann ich verschiedene Stile mischen?**
A: Ja, aber besser konsistent bleiben (gleicher Pixel-Stil).

**Q: Was wenn Frames nicht perfekt passen?**
A: Nutze Image-Editor, um Position/Größe anzupassen.

**Q: Brauche ich unbedingt 19 Frames?**
A: Nein! Minimalist: 3 Frames Walk reichen auch erstmal.

---

##  Brauchst du Hilfe?

Ich kann dir helfen:
1. Prompts für deine spezifischen Units zu schreiben
2. Python-Scripts zum automatischen Download zu erstellen
3. Phaser-Code für komplexe Animationen zu schreiben

**Frag einfach!** 
