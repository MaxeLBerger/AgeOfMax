#  UNIT SPRITE ANIMATION PROMPTS - Optimized (10 Sprites Per Image)

##  Generation Strategy

**Each unit requires 2 images with exactly 10 sprite frames each:**

### Image 1 - Primary Actions (10 frames):
- Row 1: IDLE (3), WALK (2)
- Row 2: WALK (2), ATTACK (3)

### Image 2 - Combat & Death (10 frames):  
- Row 1: ATTACK (2), DEATH (3)
- Row 2: DEATH (1), VICTORY/TAUNT (4)

---

##  Technical Specifications

### Image Dimensions:
- **Total Size**: `640x128 pixels`
- **Layout**: `10 sprites in 2 rows  5 columns`
- **Each Sprite**: `64x64 pixels`
- **Format**: PNG with transparency
- **Arrangement**: 
  ```
  [1][2][3][4][5]   Row 1 (sprites 1-5)
  [6][7][8][9][10]  Row 2 (sprites 6-10)
  ```

### Style Guidelines:
 Pixel art, clean pixels, no anti-aliasing blur
 Side view profile facing RIGHT  
 Transparent background
 High contrast colors
 Clear silhouette readable at 64x64
 Consistent character scale across frames

---

##  PROMPTS FOR ALL 16 UNITS

---

###  STONE AGE UNITS (1-4)

---

#### UNIT 1: CLUBMAN

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Stone Age clubman warrior arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: primitive caveman with wooden club, animal skin loincloth, messy hair, tribal markings. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Standing neutral, club at side, breathing position 1
2. IDLE: Slight weight shift, club moving slightly, breathing position 2  
3. IDLE: Return to center, club steady, breathing position 3
4. WALK: Left foot forward, club swinging back, start of walk cycle
5. WALK: Mid-stride, left foot planted, right foot lifting

Row 2 (sprites 6-10):
6. WALK: Right foot forward, club swinging forward
7. WALK: Contact pose, both feet together, club at neutral
8. ATTACK: Wind-up, club raised high above head, leaning back
9. ATTACK: Mid-swing, club at 45 degrees, body lunging forward
10. ATTACK: Impact frame, club fully extended, body committed

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Stone Age clubman warrior arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: primitive caveman with wooden club, animal skin loincloth, messy hair, tribal markings. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Follow-through, club at lowest point, body bent forward
2. ATTACK: Recovery, pulling club back up, returning to stance
3. DEATH: Hit reaction, staggering backward, club dropping
4. DEATH: Falling, knees buckling, arms flailing, club on ground
5. DEATH: Halfway to ground, body tilting forward

Row 2 (sprites 6-10):
6. DEATH: Lying on ground fully defeated, club beside body
7. VICTORY: Raising club triumphantly above head
8. VICTORY: Beating chest with free hand, club lowered
9. VICTORY: Jumping with club raised, celebrating
10. VICTORY: Standing proud, club on shoulder, victorious pose

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 2: SPEARMAN

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Stone Age spearman arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: tribal warrior with long spear, leather armor, feather headband, athletic build. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Standing alert, spear vertical beside body
2. IDLE: Weight shift left, spear tilting slightly
3. IDLE: Weight shift right, spear back to vertical
4. WALK: Left foot forward, spear angled back
5. WALK: Mid-stride, spear swinging forward

Row 2 (sprites 6-10):
6. WALK: Right foot forward, spear pointing ahead
7. WALK: Contact pose, spear neutral
8. ATTACK: Thrust preparation, spear pulled back, body coiled
9. ATTACK: Mid-thrust, spear extending forward, body lunging
10. ATTACK: Full extension, spear fully thrust forward

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Stone Age spearman arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: tribal warrior with long spear, leather armor, feather headband, athletic build. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Spear retraction, pulling back, body recovering
2. ATTACK: Return to guard, spear back to ready position
3. DEATH: Pierced, dropping spear, clutching chest
4. DEATH: Stumbling backward, spear on ground, arms out
5. DEATH: Falling to knees, head drooping

Row 2 (sprites 6-10):
6. DEATH: Collapsed face-down, spear beside body
7. VICTORY: Spear raised high, warrior shouting
8. VICTORY: Spinning spear overhead in circle
9. VICTORY: Planting spear in ground, arms spread
10. VICTORY: Standing with spear, confident warrior pose

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 3: SLINGER

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Stone Age slinger arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: agile tribesman with sling weapon, minimal clothing, quick nimble build. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Standing ready, sling in hand, stone loaded
2. IDLE: Weight on left foot, sling swaying
3. IDLE: Weight on right foot, sling steady
4. WALK: Jogging, left foot forward, sling in hand
5. WALK: Mid-jog, sling swinging

Row 2 (sprites 6-10):
6. WALK: Right foot forward, sling behind
7. WALK: Airborne moment, both feet off ground
8. ATTACK: Wind-up, sling spinning above head
9. ATTACK: Sling circling faster, body rotating
10. ATTACK: Release moment, sling extended forward, stone flying

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Stone Age slinger arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: agile tribesman with sling weapon, minimal clothing, quick nimble build. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Follow-through, arm extended, sling trailing
2. ATTACK: Recovery, loading new stone
3. DEATH: Hit by projectile, spinning from impact
4. DEATH: Losing balance, sling flying away
5. DEATH: Falling backward, arms windmilling

Row 2 (sprites 6-10):
6. DEATH: On back, defeated, sling nearby
7. VICTORY: Spinning sling above head, celebrating
8. VICTORY: Pumping fist, sling in other hand
9. VICTORY: Quick victory dance, sling swinging
10. VICTORY: Cocky stance, sling over shoulder

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 4: DINO RIDER

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Stone Age warrior riding a small raptor dinosaur, arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: warrior with primitive saddle on raptor, holding reins. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Raptor standing still breathing, rider steady
2. IDLE: Raptor head bobbing down, rider adjusting
3. IDLE: Raptor head back up, tail swaying
4. WALK: Raptor walking, left leg forward
5. WALK: Raptor mid-stride, rider bouncing

Row 2 (sprites 6-10):
6. WALK: Raptor right leg forward, tail up
7. WALK: Raptor contact pose, both legs close
8. ATTACK: Preparing to charge, raptor crouching, rider leaning
9. ATTACK: Charging, raptor lunging forward, mouth open
10. ATTACK: Impact, raptor biting, rider striking with weapon

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Stone Age warrior riding a small raptor dinosaur, arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: warrior with primitive saddle on raptor, holding reins. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Follow-through, raptor pulling back, rider recovering
2. ATTACK: Return to position, raptor settling
3. DEATH: Hit, raptor screeching, rider losing balance
4. DEATH: Rider falling off raptor, dinosaur stumbling
5. DEATH: Rider on ground, raptor collapsing beside

Row 2 (sprites 6-10):
6. DEATH: Both rider and raptor defeated on ground
7. VICTORY: Raptor rearing up, rider raising weapon
8. VICTORY: Raptor roaring, rider triumphant
9. VICTORY: Raptor pawing ground, rider celebrating
10. VICTORY: Raptor and rider in proud victory stance

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

###  CASTLE AGE UNITS (5-8)

---

#### UNIT 5: SWORDSMAN

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Castle Age swordsman arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: medieval knight with sword and shield, chainmail armor, helmet. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Standing guard, sword and shield ready
2. IDLE: Breathing, shield lowering slightly
3. IDLE: Shield back up, sword steady
4. WALK: Marching, left foot forward, armor clanking
5. WALK: Mid-march, shield swaying

Row 2 (sprites 6-10):
6. WALK: Right foot forward, sword and shield steady
7. WALK: Contact pose, armor settling
8. ATTACK: Wind-up, sword raised high, shield protecting
9. ATTACK: Mid-swing, sword descending, shield aside
10. ATTACK: Impact, sword at full extension, body lunging

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Castle Age swordsman arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: medieval knight with sword and shield, chainmail armor, helmet. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Follow-through, sword low, shield returning
2. ATTACK: Recovery, back to guard position
3. DEATH: Struck, armor dented, staggering
4. DEATH: Dropping sword and shield, falling
5. DEATH: On knees, helmet falling off

Row 2 (sprites 6-10):
6. DEATH: Collapsed in armor, weapons scattered
7. VICTORY: Raising sword high, shield at side
8. VICTORY: Sword in air, beating shield with fist
9. VICTORY: Planting sword in ground, arms spread
10. VICTORY: Standing proud, sword on shoulder

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 6: ARCHER

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Castle Age archer arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: medieval archer with longbow, leather armor, quiver of arrows. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Standing ready, bow in hand, arrow nocked
2. IDLE: Breathing, bow lowering
3. IDLE: Bow back up, checking arrow
4. WALK: Walking, left foot forward, bow at side
5. WALK: Mid-step, quiver bouncing

Row 2 (sprites 6-10):
6. WALK: Right foot forward, bow swinging
7. WALK: Contact pose, bow steady
8. ATTACK: Drawing bow, arrow nocked, pulling string back
9. ATTACK: Bow fully drawn, aiming, body tense
10. ATTACK: Releasing arrow, string snapping forward

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Castle Age archer arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: medieval archer with longbow, leather armor, quiver of arrows. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Follow-through, bow extended, arrow flying away
2. ATTACK: Lowering bow, reaching for new arrow
3. DEATH: Hit by arrow, dropping bow, clutching wound
4. DEATH: Stumbling, bow on ground, arrows spilling
5. DEATH: Falling to side, hand reaching out

Row 2 (sprites 6-10):
6. DEATH: Lying on ground, bow and arrows scattered
7. VICTORY: Raising bow high, arrow in other hand
8. VICTORY: Shooting arrow into air in celebration
9. VICTORY: Bow overhead, spinning in joy
10. VICTORY: Standing with bow, confident pose

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 7: KNIGHT

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Castle Age knight on horseback arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: heavy knight in full plate armor on horse, lance and shield. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Knight on horse standing, horse breathing
2. IDLE: Horse head bobbing, knight adjusting reins
3. IDLE: Horse pawing ground, knight steady
4. WALK: Horse trotting, left legs forward, knight bouncing
5. WALK: Horse mid-trot, armor clanking

Row 2 (sprites 6-10):
6. WALK: Horse right legs forward, lance swaying
7. WALK: Horse all legs close, knight rising
8. ATTACK: Charging, horse rearing, lance pulled back
9. ATTACK: Charging forward, horse galloping, lance extending
10. ATTACK: Lance impact, horse at full speed

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Castle Age knight on horseback arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: heavy knight in full plate armor on horse, lance and shield. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Follow-through, horse slowing, lance retracting
2. ATTACK: Recovery, horse turning, pulling out lance
3. DEATH: Struck, horse screeching, knight losing balance
4. DEATH: Knight falling from horse, armor clanging
5. DEATH: Knight hitting ground, horse collapsing

Row 2 (sprites 6-10):
6. DEATH: Knight and horse both defeated on ground
7. VICTORY: Horse rearing, knight raising lance triumphantly
8. VICTORY: Knight circling lance overhead on horse
9. VICTORY: Horse prancing, knight in victory pose
10. VICTORY: Knight and horse standing proud

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 8: BALLISTA

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Castle Age ballista siege weapon arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: mobile ballista with wooden frame, wheels, operated by crew. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Ballista stationary, crew standing by
2. IDLE: Crew adjusting aim slightly, weapon steady
3. IDLE: Crew loading bolt, weapon ready
4. WALK: Ballista being pushed, crew pushing wheels
5. WALK: Ballista rolling, wheels turning, crew straining

Row 2 (sprites 6-10):
6. WALK: Ballista mid-roll, crew repositioning
7. WALK: Ballista stopping, crew resetting
8. ATTACK: Aiming, crew tensioning string
9. ATTACK: Fully drawn, bolt loaded, crew holding trigger
10. ATTACK: Firing, bolt launching, string snapping, recoil

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Castle Age ballista siege weapon arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: mobile ballista with wooden frame, wheels, operated by crew. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Recoiling, crew steadying, bolt flying
2. ATTACK: Resetting, crew reloading
3. DEATH: Hit, wood splintering, crew panicking
4. DEATH: Breaking, wheels collapsing, crew fleeing
5. DEATH: Falling apart, frame cracking

Row 2 (sprites 6-10):
6. DEATH: Destroyed, pile of wood and parts
7. VICTORY: Crew celebrating around intact ballista
8. VICTORY: Crew raising arms, cheering
9. VICTORY: Crew patting ballista proudly
10. VICTORY: Crew standing triumphant by weapon

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

###  RENAISSANCE AGE UNITS (9-12)

---

#### UNIT 9: MUSKETEER

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Renaissance musketeer arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: Renaissance soldier with musket rifle, plumed hat, colorful uniform. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Standing at attention, musket at shoulder
2. IDLE: Relaxed stance, musket lowering
3. IDLE: Checking musket, adjusting hat
4. WALK: Marching, left foot forward, musket on shoulder
5. WALK: Mid-march, coat swaying

Row 2 (sprites 6-10):
6. WALK: Right foot forward, musket steady
7. WALK: Contact pose, military bearing
8. ATTACK: Aiming, musket raised to shoulder
9. ATTACK: Steadying aim, finger on trigger
10. ATTACK: Firing, muzzle flash, smoke puff, recoil

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Renaissance musketeer arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: Renaissance soldier with musket rifle, plumed hat, colorful uniform. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Recoiling, musket kicking back, smoke dispersing
2. ATTACK: Lowering musket, reloading
3. DEATH: Shot, stumbling backward, musket falling
4. DEATH: Clutching wound, hat flying off
5. DEATH: Falling backward, arms out

Row 2 (sprites 6-10):
6. DEATH: On back, defeated, musket beside
7. VICTORY: Raising musket high, shouting
8. VICTORY: Firing musket into air in celebration
9. VICTORY: Removing hat, bowing victoriously
10. VICTORY: Standing proud, musket at shoulder

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 10: CAVALRY

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of Renaissance cavalry on horseback arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: Renaissance horseman with saber, decorated uniform, cavalry hat. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Cavalry on horse standing, horse breathing
2. IDLE: Horse head bobbing, rider adjusting
3. IDLE: Horse pawing, rider steady with saber
4. WALK: Horse cantering, left legs forward, rider bouncing
5. WALK: Horse mid-canter, all legs off ground

Row 2 (sprites 6-10):
6. WALK: Horse right legs forward, rider steady
7. WALK: Horse contact pose, rider ready
8. ATTACK: Charging, horse galloping, saber raised high
9. ATTACK: At full speed, saber swinging down
10. ATTACK: Saber strike, blade slashing through

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of Renaissance cavalry on horseback arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: Renaissance horseman with saber, decorated uniform, cavalry hat. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Follow-through, saber low, horse past target
2. ATTACK: Recovery, saber raised again, horse turning
3. DEATH: Struck, rider falling from horse
4. DEATH: Rider tumbling, horse rearing
5. DEATH: Rider hitting ground, horse galloping away

Row 2 (sprites 6-10):
6. DEATH: Rider lying defeated, saber on ground
7. VICTORY: Horse rearing, rider waving saber
8. VICTORY: Rider circling saber overhead
9. VICTORY: Horse prancing, rider celebrating
10. VICTORY: Triumphant pose, saber raised

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 11: CANNON

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Renaissance cannon arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: mobile artillery cannon with crew, wheeled carriage, gunpowder barrels. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Cannon stationary, crew standing ready
2. IDLE: Crew loading powder, cannon steady
3. IDLE: Crew adjusting aim, barrel tilting
4. WALK: Cannon being rolled, crew pushing wheels
5. WALK: Cannon rolling, wheels turning, crew straining

Row 2 (sprites 6-10):
6. WALK: Cannon mid-roll, barrel bouncing
7. WALK: Cannon stopping, crew setting brakes
8. ATTACK: Aiming, crew lighting fuse
9. ATTACK: Fuse burning, crew stepping back
10. ATTACK: Firing, huge explosion, smoke cloud, recoil

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Renaissance cannon arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: mobile artillery cannon with crew, wheeled carriage, gunpowder barrels. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Recoiling, wheels lifting, smoke billowing
2. ATTACK: Settling, crew rushing to reload, smoke clearing
3. DEATH: Hit, barrel cracking, crew diving
4. DEATH: Exploding, barrels detonating, crew fleeing
5. DEATH: In pieces, fire and smoke

Row 2 (sprites 6-10):
6. DEATH: Destroyed, smoldering wreckage
7. VICTORY: Crew celebrating around cannon
8. VICTORY: Crew raising fists, cheering
9. VICTORY: Crew firing cannon in celebration
10. VICTORY: Crew standing proud by weapon

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 12: DUELIST

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Renaissance duelist arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: Renaissance swordsman with rapier, fancy clothing, musketeer hat with feather. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Standing en garde, rapier extended
2. IDLE: Weight shift, rapier circling
3. IDLE: Back to center, rapier ready
4. WALK: Advancing, rapier forward
5. WALK: Mid-step, coat flowing

Row 2 (sprites 6-10):
6. WALK: Right foot forward, rapier circling
7. WALK: Light-footed, rapier steady
8. ATTACK: Lunging preparation, rapier pulled back
9. ATTACK: Mid-lunge, rapier extending, body forward
10. ATTACK: Full lunge, rapier piercing, fully extended

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Renaissance duelist arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: Renaissance swordsman with rapier, fancy clothing, musketeer hat with feather. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Pulling back, rapier withdrawing
2. ATTACK: Recovery, back to en garde, rapier ready
3. DEATH: Struck, staggering, dropping rapier
4. DEATH: Stumbling, hat falling, hand on wound
5. DEATH: Falling to knees, rapier clattering

Row 2 (sprites 6-10):
6. DEATH: Collapsed dramatically, coat spread out
7. VICTORY: Rapier raised high, hat removed, bowing
8. VICTORY: Flourishing rapier in figure-8 pattern
9. VICTORY: Saluting with rapier
10. VICTORY: Standing en garde, confident victor

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

###  MODERN AGE UNITS (13-16)

---

#### UNIT 13: RIFLEMAN

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Modern rifleman arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: WW1/WW2 soldier with rifle, military uniform, helmet. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Standing at ready, rifle at hip
2. IDLE: Scanning area, rifle adjusting
3. IDLE: Alert stance, rifle ready
4. WALK: Tactical walk, left foot forward, rifle ready
5. WALK: Mid-walk, rifle swaying

Row 2 (sprites 6-10):
6. WALK: Right foot forward, helmet steady
7. WALK: Contact pose, military bearing
8. ATTACK: Aiming, rifle to shoulder, sighting down barrel
9. ATTACK: Holding breath, finger on trigger
10. ATTACK: Firing, muzzle flash, shell ejecting, recoil

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Modern rifleman arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: WW1/WW2 soldier with rifle, military uniform, helmet. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Recoiling, rifle kicking, smoke
2. ATTACK: Chambering next round, ready to fire
3. DEATH: Hit, spinning from impact, rifle dropping
4. DEATH: Falling, helmet flying off
5. DEATH: Hitting ground, rifle bouncing away

Row 2 (sprites 6-10):
6. DEATH: Lying defeated, rifle beside body
7. VICTORY: Raising rifle overhead with both hands
8. VICTORY: Firing rifle into air in celebration
9. VICTORY: Rifle on shoulder, saluting
10. VICTORY: Standing at attention, victorious

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 14: GRENADIER

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Modern grenadier arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: modern soldier with grenades, tactical vest, helmet. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Standing ready, grenade in hand
2. IDLE: Checking grenades, vest adjusting
3. IDLE: Alert stance, grenade ready
4. WALK: Jogging, left foot forward, grenades bouncing
5. WALK: Mid-jog, vest swaying

Row 2 (sprites 6-10):
6. WALK: Right foot forward, helmet steady
7. WALK: Airborne, tactical movement
8. ATTACK: Pulling pin, grenade ready
9. ATTACK: Winding up, arm back, grenade in hand
10. ATTACK: Throwing, arm extended, grenade launching

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Modern grenadier arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: modern soldier with grenades, tactical vest, helmet. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Follow-through, arm down, grenade flying
2. ATTACK: Taking cover, turning away
3. DEATH: Hit, grenades detonating on vest
4. DEATH: Explosion, flying backward
5. DEATH: In air, debris flying

Row 2 (sprites 6-10):
6. DEATH: On ground, smoldering, equipment scattered
7. VICTORY: Raising grenade triumphantly (pin still in)
8. VICTORY: Fist pumping, grenades rattling
9. VICTORY: Tapping vest proudly
10. VICTORY: Standing ready, victorious stance

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 15: TANK

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Modern tank arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: military tank, armored vehicle with cannon turret, treads. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Stationary, engine idling, turret scanning
2. IDLE: Slight vibration, exhaust puffing
3. IDLE: Turret rotating slightly, engine rumbling
4. WALK: Rolling, treads moving, engine roaring
5. WALK: Mid-roll, turret bouncing

Row 2 (sprites 6-10):
6. WALK: Continuing, treads churning
7. WALK: Steady roll, exhaust trail
8. ATTACK: Aiming, turret aligning, barrel elevating
9. ATTACK: Locked on target, turret still
10. ATTACK: Firing, massive muzzle flash, huge recoil

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Modern tank arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: military tank, armored vehicle with cannon turret, treads. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Recoiling, chassis rocking, smoke billowing
2. ATTACK: Settling, ejecting shell casing, reloading
3. DEATH: Hit, armor penetrated, fire starting
4. DEATH: Exploding, turret flying off, flames erupting
5. DEATH: Engulfed in flames, ammo cooking off

Row 2 (sprites 6-10):
6. DEATH: Destroyed, burning wreck, turret on ground
7. VICTORY: Turret rotating triumphantly
8. VICTORY: Firing cannon in celebration
9. VICTORY: Turret raised high in victory pose
10. VICTORY: Stationary, victorious, engine revving

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

#### UNIT 16: SNIPER

**Image 1 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Modern sniper arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: elite soldier with sniper rifle, ghillie suit camouflage, scope. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. IDLE: Crouched, rifle steady, scanning through scope
2. IDLE: Adjusting position, rifle lowering
3. IDLE: Checking surroundings, rifle at side
4. WALK: Low crawl, left arm forward, dragging rifle
5. WALK: Mid-crawl, body sliding

Row 2 (sprites 6-10):
6. WALK: Right arm forward, rifle close
7. WALK: Steady crawl, ghillie suit dragging
8. ATTACK: Aiming, eye to scope, finger on trigger
9. ATTACK: Holding breath, crosshair steady, tension
10. ATTACK: Firing, muzzle flash, shell ejecting, rifle kick

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

**Image 2 Prompt (10 sprites, 640x128px):**
```
Create a pixel art spritesheet, 640x128 pixels, containing exactly 10 frames of a Modern sniper arranged in 2 rows of 5 sprites each. Each sprite is 64x64 pixels. Character: elite soldier with sniper rifle, ghillie suit camouflage, scope. Side view facing right, transparent background.

Row 1 (sprites 1-5):
1. ATTACK: Recoiling, rifle settling, smoke trail
2. ATTACK: Chambering round, returning to aim
3. DEATH: Spotted and hit, rifle dropping
4. DEATH: Collapsing, ghillie suit bunching
5. DEATH: Falling to side, rifle sliding away

Row 2 (sprites 6-10):
6. DEATH: Lying still, camouflaged but defeated
7. VICTORY: Rising from prone, rifle raised high
8. VICTORY: Standing, raising rifle overhead
9. VICTORY: Removing ghillie hood, victorious
10. VICTORY: Sniper stance, scope glinting

Pixel art style, clean pixels, side view facing right, transparent background, 640x128 total size.
```

---

##  USAGE GUIDE

### For Leonardo.ai / DALL-E 3 / Midjourney:

1. **Copy prompt exactly as written**
2. **Set aspect ratio to 5:1** (closest to 640x128)
3. **Enable transparent background** in settings
4. **Specify "pixel art" style** if available
5. **Generate and download**

### Post-Processing:

1. **Resize to exactly 640x128px** if needed
2. **Ensure transparency** (remove white background if present)
3. **Verify 10 sprites** are clearly visible
4. **Check alignment** - sprites should be in 2 rows of 5
5. **Save as PNG** with alpha channel

### Integration into Game:

```typescript
// Load spritesheet
this.load.spritesheet('clubman-sheet1', 'clubman-1.png', {
  frameWidth: 64,
  frameHeight: 64
});

// Create animations from first image (frames 0-9)
this.anims.create({
  key: 'clubman-idle',
  frames: this.anims.generateFrameNumbers('clubman-sheet1', { start: 0, end: 2 }),
  frameRate: 8,
  repeat: -1
});

this.anims.create({
  key: 'clubman-walk',
  frames: this.anims.generateFrameNumbers('clubman-sheet1', { start: 3, end: 6 }),
  frameRate: 12,
  repeat: -1
});

this.anims.create({
  key: 'clubman-attack',
  frames: this.anims.generateFrameNumbers('clubman-sheet1', { start: 7, end: 9 }),
  frameRate: 10,
  repeat: 0
});
```

---

##  SUMMARY

**Total Required:**
- **32 images** (2 per unit  16 units)
- **320 sprites** (10 per image  32 images)
- **Image dimensions**: 640x128px each
- **Sprite size**: 64x64px each
- **Format**: PNG with transparency

**Generation Order:**
1. Generate Image 1 for all 16 units (primary actions)
2. Generate Image 2 for all 16 units (death & victory)
3. Post-process and integrate into game

**Estimated Time:**
- ~2-3 minutes per image generation
- ~32 images = ~60-90 minutes total
- Post-processing: ~30 minutes
- **Total: ~2 hours for all sprites**

---

**Ready to generate! Start with Stone Age units and work your way through the epochs!** 