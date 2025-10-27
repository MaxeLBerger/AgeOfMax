#  AUTOMATED A2A ASSET GENERATOR
# Automatisches Asset-Generierungssystem mit API-Aufrufen

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " AUTOMATED ASSET GENERATION SYSTEM" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# API Keys Check
$OPENAI_KEY = $env:OPENAI_API_KEY
$ELEVENLABS_KEY = $env:ELEVENLABS_API_KEY

if (-not $OPENAI_KEY -and -not $ELEVENLABS_KEY) {
    Write-Host "  WARNUNG: Keine API Keys gefunden!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Um vollautomatische Generation zu nutzen, setze:"
    Write-Host "  `$env:OPENAI_API_KEY = ''dein-key-hier''" -ForegroundColor Gray
    Write-Host "  `$env:ELEVENLABS_API_KEY = ''dein-key-hier''" -ForegroundColor Gray
    Write-Host ""
    Write-Host "ODER: Ich erstelle dir die Prompts zum manuellen Copy-Paste`n" -ForegroundColor Green
}

# Create directories
$soundsDir = "public/assets/sounds"
$musicDir = "public/assets/music"
$buildingsDir = "public/assets/buildings/bases"

New-Item -ItemType Directory -Force -Path $soundsDir | Out-Null
New-Item -ItemType Directory -Force -Path $musicDir | Out-Null
New-Item -ItemType Directory -Force -Path $buildingsDir | Out-Null

# =================================
# SOUND EFFECTS GENERATION
# =================================

Write-Host " SOUND EFFECTS" -ForegroundColor Yellow
Write-Host "----------------`n" -ForegroundColor Yellow

$sounds = @{
    "unit_spawn" = "Short 8-bit retro video game sound effect: unit spawning, pop sound with slight whoosh, 200ms duration, arcade style"
    "sword_clash" = "8-bit retro sword clash sound, metal clang with reverb, medieval combat, 300ms duration, arcade game style"
    "arrow_fire" = "Retro bow and arrow sound effect, whoosh then thud, 8-bit style, 400ms, arcade game"
    "gun_shot" = "Sharp retro gun shot, 8-bit rifle crack, military FPS style but simplified, 150ms"
    "explosion" = "Deep retro explosion boom, 8-bit style bomb blast, impactful, 500ms duration"
    "gold_collect" = "Retro coin collection sound, ching with sparkle, 8-bit arcade style, 250ms, happy tone"
    "xp_gain" = "8-bit level up sound, magical sparkle chime, retro RPG style, ascending notes, 300ms"
    "epoch_advance" = "Epic 8-bit fanfare, retro victory theme, triumphant trumpet-like melody, 1 second duration"
}

if ($ELEVENLABS_KEY) {
    Write-Host " ElevenLabs API Key found - Generating sounds automatically...`n" -ForegroundColor Green
    
    foreach ($sound in $sounds.GetEnumerator()) {
        Write-Host "   Generating $($sound.Key).mp3..." -NoNewline
        
        try {
            $body = @{
                text = $sound.Value
                duration_seconds = 1.0
                prompt_influence = 0.3
            } | ConvertTo-Json
            
            $headers = @{
                "xi-api-key" = $ELEVENLABS_KEY
                "Content-Type" = "application/json"
            }
            
            $response = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/sound-generation" `
                -Method Post `
                -Headers $headers `
                -Body $body `
                -OutFile "$soundsDir/$($sound.Key).mp3"
            
            Write-Host " " -ForegroundColor Green
        } catch {
            Write-Host "  Error: $_" -ForegroundColor Red
        }
        
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host " No API key - Saving prompts for manual generation`n" -ForegroundColor Yellow
    
    $promptsContent = "# SOUND EFFECTS PROMPTS FOR ELEVENLABS`n`n"
    $promptsContent += "Visit: https://elevenlabs.io/sound-effects`n`n"
    
    foreach ($sound in $sounds.GetEnumerator()) {
        $promptsContent += "## $($sound.Key).mp3`n"
        $promptsContent += "$($sound.Value)`n`n"
    }
    
    $promptsContent | Out-File -FilePath "$soundsDir/SOUND_PROMPTS.txt" -Encoding UTF8
    Write-Host "    Prompts saved to $soundsDir/SOUND_PROMPTS.txt" -ForegroundColor Green
}

Write-Host ""

# =================================
# MUSIC TRACKS
# =================================

Write-Host " MUSIC TRACKS" -ForegroundColor Yellow
Write-Host "---------------`n" -ForegroundColor Yellow

$music = @{
    "battle_ancient" = "[Instrumental][Genre: Chiptune, 8-bit][Mood: Primitive, Tribal][BPM: 100][Instruments: Tribal drums, primitive flutes][Length: 60s][Loop: Yes] Tribal battle theme for stone age warriors"
    "battle_medieval" = "[Instrumental][Genre: Chiptune, Medieval][Mood: Epic, Heroic][BPM: 110][Instruments: Medieval strings, lute, epic choir sounds][Length: 60s][Loop: Yes] Medieval castle battle music, knights and honor"
    "battle_renaissance" = "[Instrumental][Genre: Chiptune, Military March][Mood: Triumphant][BPM: 120][Instruments: Harpsichord, trumpets, marching drums][Length: 60s][Loop: Yes] Renaissance warfare, muskets and cannons"
    "battle_modern" = "[Instrumental][Genre: Chiptune, Industrial][Mood: Intense, Military][BPM: 130][Instruments: Electronic drums, brass, industrial sounds][Length: 60s][Loop: Yes] Modern warfare theme, tanks and rifles"
    "battle_future" = "[Instrumental][Genre: Synthwave, Chiptune][Mood: Futuristic][BPM: 140][Instruments: Synthesizers, electronic beats, sci-fi atmosphere][Length: 60s][Loop: Yes] Future warfare, laser weapons and mechs"
}

$musicPrompts = "# MUSIC GENERATION PROMPTS FOR SUNO AI`n`n"
$musicPrompts += "Visit: https://suno.ai`n`n"
$musicPrompts += "Steps:`n"
$musicPrompts += "1. Create free account`n"
$musicPrompts += "2. Click ''Create'' button`n"
$musicPrompts += "3. Paste each prompt below`n"
$musicPrompts += "4. Download MP3 and save to public/assets/music/`n`n"

foreach ($track in $music.GetEnumerator()) {
    $musicPrompts += "## $($track.Key).mp3`n"
    $musicPrompts += "```````n$($track.Value)`n```````n`n"
}

$musicPrompts | Out-File -FilePath "$musicDir/MUSIC_PROMPTS.txt" -Encoding UTF8
Write-Host "    Prompts saved to $musicDir/MUSIC_PROMPTS.txt" -ForegroundColor Green
Write-Host "   ℹ  Visit https://suno.ai to generate (10 free tracks/day)" -ForegroundColor Cyan

Write-Host ""

# =================================
# BASE BUILDINGS
# =================================

Write-Host " BASE BUILDINGS" -ForegroundColor Yellow
Write-Host "-----------------`n" -ForegroundColor Yellow

$buildings = @{
    "player-base-stone" = "Pixel art stone age base building for RTS game, side-view, 128x128 pixels, primitive stone hut with wooden support beams and thatched roof, brown and tan colors, 16-bit pixel art style, transparent PNG background, facing right, detailed but not cluttered"
    "enemy-base-stone" = "Pixel art stone age enemy base for RTS game, side-view, 128x128 pixels, dark cave entrance with wooden barricades, dark grays and browns, 16-bit pixel art style, transparent PNG background, facing left, slightly menacing look"
    "player-base-castle" = "Pixel art medieval castle base for RTS game, side-view, 128x128 pixels, stone castle with blue flags and battlements, gray stone blue accents, 16-bit pixel art style, transparent PNG background, facing right, heroic and defensive look"
    "enemy-base-castle" = "Pixel art dark fortress for RTS game enemy, side-view, 128x128 pixels, black stone castle with red flags, dark gray and red colors, 16-bit pixel art style, transparent PNG background, facing left, intimidating appearance"
}

if ($OPENAI_KEY) {
    Write-Host " OpenAI API Key found - Attempting DALL-E generation...`n" -ForegroundColor Green
    
    foreach ($building in $buildings.GetEnumerator()) {
        Write-Host "   Generating $($building.Key).png..." -NoNewline
        
        try {
            $body = @{
                model = "dall-e-3"
                prompt = $building.Value
                n = 1
                size = "1024x1024"
                quality = "standard"
            } | ConvertTo-Json
            
            $headers = @{
                "Authorization" = "Bearer $OPENAI_KEY"
                "Content-Type" = "application/json"
            }
            
            $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/images/generations" `
                -Method Post `
                -Headers $headers `
                -Body $body
            
            $imageUrl = $response.data[0].url
            Invoke-WebRequest -Uri $imageUrl -OutFile "$buildingsDir/$($building.Key).png"
            
            Write-Host " " -ForegroundColor Green
        } catch {
            Write-Host "  Error: $_" -ForegroundColor Red
        }
        
        Start-Sleep -Seconds 2
    }
} else {
    $imagePrompts = "# BASE BUILDING PROMPTS FOR DALL-E / BING IMAGE CREATOR`n`n"
    $imagePrompts += "Visit: https://www.bing.com/images/create (FREE!)`n`n"
    
    foreach ($building in $buildings.GetEnumerator()) {
        $imagePrompts += "## $($building.Key).png`n"
        $imagePrompts += "$($building.Value)`n`n"
    }
    
    $imagePrompts | Out-File -FilePath "$buildingsDir/IMAGE_PROMPTS.txt" -Encoding UTF8
    Write-Host "    Prompts saved to $buildingsDir/IMAGE_PROMPTS.txt" -ForegroundColor Green
    Write-Host "   ℹ  Visit https://www.bing.com/images/create (KOSTENLOS!)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ASSET GENERATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Generated files in:" -ForegroundColor Yellow
Write-Host "   - public/assets/sounds/" -ForegroundColor White
Write-Host "   - public/assets/music/" -ForegroundColor White
Write-Host "   - public/assets/buildings/bases/" -ForegroundColor White
Write-Host ""
Write-Host " Check *_PROMPTS.txt files for manual generation steps" -ForegroundColor Cyan
Write-Host ""
