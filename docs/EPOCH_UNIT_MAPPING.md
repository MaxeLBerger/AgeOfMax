# EPOCH-UNIT MAPPING VERIFICATION

##  Stone Age (stone)
- Clubman (50g) - Melee
- Spearman (70g) - Melee  
- Slinger (60g) - Ranged
- Dino Rider (90g) - Melee

##  Castle Age (castle)
- Swordsman (100g) - Melee
- Archer (110g) - Ranged
- Knight (150g) - Melee
- Ballista (180g) - Ranged

##  Renaissance Age (renaissance)
- Musketeer (180g) - Ranged
- Cavalry (220g) - Melee
- Cannon (260g) - Ranged
- Duelist (160g) - Melee

##  Modern Age (modern)
- Rifleman (250g) - Ranged
- Grenadier (280g) - Ranged
- Tank (400g) - Ranged
- Sniper (320g) - Ranged

##  Future Age (future)
- Laser Soldier (350g) - Ranged
- Mech (500g) - Ranged
- Plasma Trooper (400g) - Ranged
- Super Heavy (600g) - Melee

## Implementation Details

### Filtering Logic (BattleScene.ts)
The updateAvailableUnits() method filters units by epoch.id:
- Gets current epoch ID (stone, castle, renaissance, modern, future)
- Filters all units where unit.epoch === epochId
- Takes first 5 units (all epochs have exactly 4 units)
- Updates UI buttons with unit names and costs

### Triggers
The available units are updated when:
1. Game starts (create()  createTestUI()  updateAvailableUnits())
2. Epoch advances (addXP()  updateAvailableUnits())

### Visual Feedback
- Active buttons: Gray (0x444444) with unit name and cost
- Inactive buttons: Dark gray (0x222222) with '---'
- Console log shows epoch name and available unit names
