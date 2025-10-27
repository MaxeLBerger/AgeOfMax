#  AUTOMATED ASSET GENERATION

Vollautomatisches System zur Asset-Generierung mit A2A (Agent-to-Agent) Workflows.

##  QUICK START - OHNE API KEYS (KOSTENLOS)

```powershell
cd tools/asset-automation
.\Generate-Assets.ps1
```

Das Script erstellt automatisch:
- `public/assets/sounds/SOUND_PROMPTS.txt` - Copy-paste Prompts für ElevenLabs
- `public/assets/music/MUSIC_PROMPTS.txt` - Copy-paste Prompts für Suno AI
- `public/assets/buildings/bases/IMAGE_PROMPTS.txt` - Copy-paste Prompts für Bing Image Creator

**Dann**: Öffne die .txt Dateien und kopiere die Prompts in die jeweiligen Websites!

---

##  VOLLAUTOMATISCH - MIT API KEYS

### 1. API Keys einrichten:

```powershell
# In PowerShell:
$env:OPENAI_API_KEY = "sk-xxx..."
$env:ELEVENLABS_API_KEY = "xxx..."
```

ODER dauerhaft in `.env` Datei:
```
OPENAI_API_KEY=sk-xxx...
ELEVENLABS_API_KEY=xxx...
```

### 2. Script ausführen:

```powershell
.\Generate-Assets.ps1
```

Das Script generiert automatisch:
-  8 Sound Effects über ElevenLabs API
-  4 Base Buildings über DALL-E API
-  Music Prompts (Suno hat noch keine öffentliche API)

---

##  WAS WIRD GENERIERT?

### Sounds (8 Dateien):
1. `unit_spawn.mp3` - Unit Spawn Sound
2. `sword_clash.mp3` - Melee Combat
3. `arrow_fire.mp3` - Ranged Attack
4. `gun_shot.mp3` - Gun Fire
5. `explosion.mp3` - Explosions
6. `gold_collect.mp3` - Gold Collection
7. `xp_gain.mp3` - XP Gain
8. `epoch_advance.mp3` - Epoch Advancement

### Music (5 Tracks):
1. `battle_ancient.mp3` - Stone Age Theme
2. `battle_medieval.mp3` - Castle Age Theme
3. `battle_renaissance.mp3` - Renaissance Theme
4. `battle_modern.mp3` - Modern Era Theme
5. `battle_future.mp3` - Future Theme

### Images (4+ Bases):
1. `player-base-stone.png` - Player Stone Age Base
2. `enemy-base-stone.png` - Enemy Stone Age Base
3. `player-base-castle.png` - Player Castle
4. `enemy-base-castle.png` - Enemy Fortress

---

##  KOSTENLOSE ALTERNATIVEN (Kein API Key nötig)

### Sounds:
1. **ElevenLabs** - https://elevenlabs.io/sound-effects
   - 10 Sounds/Tag gratis
   - Nutze `SOUND_PROMPTS.txt`

### Music:
1. **Suno AI** - https://suno.ai
   - 10 Songs/Tag gratis
   - Nutze `MUSIC_PROMPTS.txt`

### Images:
1. **Bing Image Creator** - https://www.bing.com/images/create
   - UNBEGRENZT gratis!
   - Nutze `IMAGE_PROMPTS.txt`

---

##  API KEYS ERHALTEN

### OpenAI (für DALL-E):
1. Gehe zu https://platform.openai.com/signup
2. Erstelle Account
3. Gehe zu API Keys  Create new secret key
4. Kopiere Key und speichere in `$env:OPENAI_API_KEY`
5. **Kosten**: ~$0.04 pro Bild (sehr günstig)

### ElevenLabs (für Sounds):
1. Gehe zu https://elevenlabs.io/sign-up
2. Erstelle kostenlosen Account
3. Gehe zu Profile  API Keys
4. Kopiere Key und speichere in `$env:ELEVENLABS_API_KEY`
5. **Gratis**: 10.000 Zeichen/Monat (ca. 100 kurze Sounds)

---

##  KOSTEN-ÜBERSICHT

| Service | Gratis Limit | Pro Monat | Asset-Kosten |
|---------|-------------|-----------|--------------|
| **ElevenLabs** | 10.000 chars | - | GRATIS für Sounds |
| **Suno AI** | 10 Songs/Tag | $10/mo | GRATIS für 5 Tracks |
| **Bing Images** | Unlimited | - | GRATIS |
| **OpenAI DALL-E** | - | Pay-as-go | $0.04/Bild (~$0.16 total) |

**TOTAL**: Komplett gratis möglich oder ~$0.16 wenn du DALL-E nutzt!

---

##  TROUBLESHOOTING

### "API Key nicht gefunden"
```powershell
# Prüfe ob gesetzt:
$env:OPENAI_API_KEY
$env:ELEVENLABS_API_KEY

# Falls leer, setze neu:
$env:ELEVENLABS_API_KEY = "dein-key-hier"
```

### "Invoke-RestMethod : 401 Unauthorized"
- API Key ist falsch oder abgelaufen
- Checke auf der jeweiligen Platform ob Key aktiv ist

### "Rate Limit erreicht"
- ElevenLabs: Warte 24h oder upgrade zu Pro
- OpenAI: Füge Credits hinzu oder warte

---

##  TIPPS

1. **Start mit Gratis-Version**: Nutze die .txt Prompt-Dateien ohne API Keys
2. **Teste einzeln**: Generiere erst 1-2 Assets manuell um Qualität zu prüfen
3. **Batch Processing**: Bei vielen Assets lohnt sich API (spart Zeit)
4. **Suno Trick**: Generiere alle 5 Musik-Tracks an einem Tag (nutze Gratis-Limit aus)

---

##  SUPPORT

Bei Fragen:
1. Prüfe ob alle Pfade existieren (`public/assets/...`)
2. Prüfe ob API Keys korrekt gesetzt sind
3. Teste API Keys manuell auf den Websites

---

**Happy Asset Generating! **
