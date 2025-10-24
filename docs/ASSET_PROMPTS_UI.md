# UI Asset Generation Prompts

## Menu Background (1280x720px)

### Prompt for AI Image Generation

```
Epic battle scene panorama for "Age of Max" strategy game menu background, 1280x720px, cinematic widescreen composition. 
Medieval castle fortress on the left side with stone walls and banners, transitioning through different historical eras from left to right: medieval knights, Renaissance gunmen, Industrial Age soldiers, Modern Age army, ending with futuristic sci-fi warriors on the right side.
Dramatic battlefield atmosphere with sunset sky, glowing epic lighting, war-torn landscape with dramatic clouds.
Game art style, vibrant colors with deep contrast, suitable for UI overlay with text readability.
Central area darker for UI menu placement, bright epic lighting on the edges.
High quality digital art, fantasy realism style, inspired by Age of War and Age of Empires aesthetics.
No text, no UI elements, pure background art.
Format: 16:9 widescreen, PNG with high detail.
```

### Alternative Prompt (More Stylized)

```
Pixel art style epic battle panorama, 1280x720px, Age of War inspired.
Left to right timeline: Stone Age cavemen, Medieval knights with castle, Renaissance musketeers, Industrial steam tanks, Modern soldiers, Futuristic mechs.
Two opposing bases facing each other across a battlefield middle ground.
Sunset epic sky with dramatic clouds and volumetric lighting.
Vibrant colors: warm oranges and reds for sunset, cool blues for shadows.
Game menu background, central area slightly darker for text overlay.
High resolution pixel art or semi-realistic game art style.
No UI, no text, pure background environment.
16:9 aspect ratio, PNG format.
```

### Technical Specs
- **Resolution**: 1280x720px (16:9)
- **Format**: PNG with transparency support
- **Color Mode**: RGB
- **File Size Target**: < 500KB optimized
- **Usage**: Main menu background in Phaser 3 game
- **Key Requirement**: Center area must support white/yellow text overlay

---

## Game Icon / Logo (Multiple Sizes)

### Prompt for 512x512px Master Icon

```
Game logo icon for "Age of Max" strategy game, 512x512px square format.
Central shield emblem design featuring a golden crown at top.
Shield divided into 4 quadrants showing evolution through ages:
- Top left: Stone Age spear and fire
- Top right: Medieval sword and castle tower
- Bottom left: Renaissance musket and cannon
- Bottom right: Futuristic energy weapon and circuit board
Bold "AGE OF MAX" text incorporated into shield design or banner below.
Epic fantasy game art style with metallic gold borders and deep red/blue color scheme.
Strong silhouette for icon recognition at small sizes.
Suitable for favicon, app icon, and launcher icon.
High contrast, bold shapes, easily recognizable at 64x64px when scaled down.
PNG with transparent background.
Game logo style similar to Age of Empires, Clash of Clans iconic design.
```

### Alternative Simplified Icon (Better for Small Sizes)

```
Minimal game icon for "Age of Max", 512x512px square.
Central emblem: Golden medieval crown sitting on crossed spear and futuristic energy sword.
Simple, bold design with strong silhouette.
Color palette: Gold crown, silver/steel weapons, deep red circular background.
Thick black outline for clarity at small sizes.
"AoM" monogram text integrated subtly at bottom in stylized font.
Icon style: bold, simple shapes, high contrast.
Scalable design that works from 512px down to 32px favicon.
PNG with transparent or solid circular background.
Game app icon aesthetic: simple, memorable, instantly recognizable.
```

### Prompt for Simplified Favicon (64x64px)

```
Ultra simple favicon icon, 64x64px.
Golden crown symbol on red shield background.
Minimal details, maximum contrast.
Thick lines, bold shapes.
Instantly recognizable at browser tab size.
PNG or ICO format with transparency.
Color: Gold #FFD700 on Red #8B0000 background.
```

### Technical Specs for Icon Set

#### Master Icon (512x512px)
- **Resolution**: 512x512px
- **Format**: PNG with transparent background
- **Color Mode**: RGBA
- **Usage**: App icon, launcher, promotional materials

#### Standard Icons
- **256x256px**: Windows desktop shortcut
- **128x128px**: Mac app icon, store listing
- **64x64px**: Browser bookmark, small UI elements
- **32x32px**: Favicon primary
- **16x16px**: Favicon fallback

#### Export Settings
- PNG-24 with alpha transparency
- No JPEG (needs transparency)
- Generate .ico file with multiple sizes embedded
- Optimize file size while maintaining quality

---

## Implementation Notes

### Menu Background
1. Load as `this.load.image('menu-bg', 'assets/ui/menu-background.png')` in Boot/Menu scene
2. Display with `this.add.image(640, 360, 'menu-bg').setOrigin(0.5)`
3. Add dark overlay for text readability: `this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.4)`
4. Scale and position to cover full game canvas

### Game Icon
1. Place 512x512 master in `public/assets/ui/icon-512.png`
2. Generate icon set using ImageMagick or online tool:
   ```bash
   magick icon-512.png -resize 256x256 icon-256.png
   magick icon-512.png -resize 128x128 icon-128.png
   magick icon-512.png -resize 64x64 icon-64.png
   magick icon-512.png -resize 32x32 icon-32.png
   magick icon-512.png -resize 16x16 icon-16.png
   ```
3. Create .ico file: `magick icon-512.png icon-256.png icon-128.png icon-64.png icon-32.png icon-16.png favicon.ico`
4. Update `index.html`:
   ```html
   <link rel="icon" type="image/png" sizes="32x32" href="/assets/ui/icon-32.png">
   <link rel="icon" type="image/png" sizes="16x16" href="/assets/ui/icon-16.png">
   <link rel="shortcut icon" href="/favicon.ico">
   ```

---

## Recommended AI Tools

### For Menu Background
- **DALL-E 3**: Best for complex scene composition
- **Midjourney**: Best for epic cinematic quality
- **Stable Diffusion XL**: Free alternative, good with detailed prompts
- **Leonardo.ai**: Game art style specialization

### For Game Icon
- **DALL-E 3**: Clean logo generation
- **Midjourney**: Stylized emblem design
- **Canva AI**: Quick icon variations
- **Looka / Brandmark**: Logo-specific AI tools

### Settings Recommendations
- **Style**: Digital art, game asset, high contrast
- **Aspect Ratio**: 16:9 for background, 1:1 for icon
- **Quality**: High/Max settings
- **Negative Prompts**: "blur, low quality, watermark, text, signature, UI elements"

---

## Color Palette Reference

Based on existing game assets:

### Primary Colors
- **Gold**: #FFD700 (crowns, highlights, buttons)
- **Red**: #8B0000, #DC143C (enemy units, alerts)
- **Blue**: #4169E1, #1E90FF (player units, UI)
- **Brown**: #8B4513 (wood, castle textures)
- **Green**: #228B22 (grass, nature elements)

### UI Colors
- **Background Dark**: #1a1a1a
- **Panel**: #2a2a2a with alpha
- **Text Primary**: #FFFFFF
- **Text Secondary**: #CCCCCC
- **Accent**: #FFD700

Use these colors to ensure visual consistency with existing game assets.
