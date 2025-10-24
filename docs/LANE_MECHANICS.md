# Lane Mechanics Documentation

## Lane Constants (BattleScene.ts)

- LANE_Y: 360 - Vertical center of combat lane
- LANE_WIDTH: 1280 - Full battlefield width
- LANE_HEIGHT: 120 - Combat zone height
- PLAYER_SPAWN_X: 150 - Player unit spawn point
- ENEMY_SPAWN_X: 1130 - Enemy unit spawn point
- PLAYER_BASE_X: 100 - Player base position
- ENEMY_BASE_X: 1180 - Enemy base position
- UNIT_CLEANUP_MARGIN: 50 - Offscreen distance before recycling
- KNOCKBACK_DISTANCE: 5 - Collision pushback pixels
- COMBAT_COOLDOWN_MS: 1000 - Time between attacks

## Unit Movement

1. Spawn at side spawn point with data from units.json
2. March at constant speed toward enemy base
3. Stop on enemy collision (mutual knockback)
4. Resume march after combat or death

## Combat System

### Unit vs Unit
- Collision stops both units
- 5px knockback applied
- After 1s cooldown: mutual damage exchange
- XP awarded for damage dealt
- Dead units recycled to pool

### Projectile vs Unit  
- Instant damage on hit
- XP for damage dealt
- Both recycled after hit

## Object Pools

- Units: Max 100, recycled not destroyed
- Projectiles: Max 200, recycled on miss/hit
- Performance: Reduces GC pressure

## Data: units.json

Key stats per unit:
- hp: Health points
- damage: Attack damage
- speed: Movement velocity
- range: Attack range
- attackSpeed: Seconds between attacks
- goldCost: Spawn cost
- type: melee/ranged

## Epoch Progression

Stone Age: Fast, weak (speed 35-40, HP 50-100)
Castle Age: Balanced (speed 40-50, HP 60-180)
Renaissance: Cavalry focus (speed 40-70)
Modern: Heavy units (HP 90-350)
Future: Ultra heavy (HP 120-600)
