#  Age of Max

A strategic tower defense game inspired by the classic Age of War series. Build units, advance through epochs, and defend your base!

![Game Version](https://img.shields.io/badge/version-1.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![Phaser](https://img.shields.io/badge/Phaser-3.85-green)
![License](https://img.shields.io/badge/license-MIT-green)

##  Features

- **5 Historical Epochs**: Progress from Stone Age to Future Age
- **20 Unique Units**: 4 units per epoch with distinct abilities
- **3 Difficulty Levels**: Easy, Medium, and Hard modes
- **Strategic Gameplay**: Balance melee and ranged units
- **Smart Enemy AI**: Adapts to your unit composition
- **Turret Defense System**: Place defensive turrets strategically
- **Special Abilities**: Powerful abilities to turn the tide
- **Professional UI**: Modern menu system with settings

##  Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

\\\ash
```bash
# Clone the repository
git clone https://github.com/MaxelBerger/AgeOfMax.git

# Navigate to project directory
cd AgeOfMax

# Install dependencies
npm install

# Start development server
npm run dev
\\\

The game will open at \http://localhost:5173\

### Build for Production

\\\ash
npm run build
\\\

##  How to Play

### Controls

- **U1-U5**: Spawn units from current epoch
- **T1-T5**: Place defensive turrets
- **F2**: Toggle debug overlay
- **Mouse**: Click special ability buttons (top right)

### Game Flow

1. **Select Difficulty**: Choose Easy, Medium, or Hard
2. **Earn Gold**: Automatic gold generation over time
3. **Spawn Units**: Purchase units to attack enemy base
4. **Defend**: Place turrets to protect your base
5. **Advance Epochs**: Gain XP to unlock better units
6. **Win**: Destroy the enemy base before they destroy yours!

##  Epochs & Units

### Stone Age
-  **Clubman** (Melee) - Basic warrior
-  **Spearman** (Melee) - Strong defender
-  **Slinger** (Ranged) - Distance attacker
-  **Dino Rider** (Melee) - Fast cavalry

### Castle Age
-  **Swordsman** (Melee) - Armored fighter
-  **Archer** (Ranged) - Long-range damage
-  **Knight** (Melee) - Heavy cavalry
-  **Ballista** (Ranged) - Siege weapon

### Renaissance
-  **Musketeer** (Ranged) - Gunpowder infantry
-  **Cavalry** (Melee) - Elite horseman
-  **Cannon** (Ranged) - Heavy artillery
-  **Duelist** (Melee) - Quick swordsman

### Modern Age
-  **Rifleman** (Ranged) - Modern infantry
-  **Grenadier** (Ranged) - Explosive specialist
-  **Tank** (Ranged) - Armored vehicle
-  **Sniper** (Ranged) - Precision shooter

### Future Age
-  **Laser Soldier** (Ranged) - Energy weapons
-  **Mech** (Ranged) - Heavy combat suit
-  **Plasma Trooper** (Ranged) - Advanced tech
-  **Super Heavy** (Melee) - Ultimate defender

##  Difficulty Modes

| Difficulty | Enemy Spawn Rate | Enemy Stats | Starting Gold |
|------------|------------------|-------------|---------------|
| **Easy** | 6000ms | 70% | 200g |
| **Medium** | 4000ms | 100% | 100g |
| **Hard** | 3000ms | 130% | 50g |

##  Technology Stack

- **Game Engine**: Phaser 3.85
- **Language**: TypeScript 5.5
- **Build Tool**: Vite 5.4
- **Testing**: Jest + Playwright

##  Project Structure

\\\
AgeOfMax/
 src/
    scenes/          # Game scenes
       BattleScene.ts
       MenuScene.ts
       DifficultyScene.ts
       CreditsScene.ts
       SettingsScene.ts
    game/           # Game types
    utils/          # Helper functions
 data/               # Game data (JSON)
    epochs.json
    units.json
    turrets.json
 public/             # Static assets
    assets/
        units/
        turrets/
        backgrounds/
        ui/
 docs/              # Documentation
\\\

##  Asset Credits

All game assets were generated using AI tools (Leonardo.ai, DALL-E) and are included under fair use for this educational project.

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (\git checkout -b feature/AmazingFeature\)
3. Commit your changes (\git commit -m 'Add some AmazingFeature'\)
4. Push to the branch (\git push origin feature/AmazingFeature\)
5. Open a Pull Request

##  Development Roadmap

### Phase 2 - Gameplay Enhancements
- [ ] Unit formation system
- [ ] Kill streak gold bonuses
- [ ] Dynamic gold generation
- [ ] Unit retreat mechanics
- [ ] Enhanced special abilities

### Phase 3 - Polish & Features
- [ ] Sound effects system
- [ ] Background music
- [ ] Unit veterancy system
- [ ] Achievement system
- [ ] Leaderboards

##  Known Issues

See [Issues](https://github.com/MaxelBerger/AgeOfMax/issues) for current bugs and feature requests.

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Author

**Maximilian Haak**
- GitHub: [@MaxelBerger](https://github.com/MaxelBerger)
- Support: [GitHub Sponsors](https://github.com/sponsors/MaxelBerger)

##  Acknowledgments

- Inspired by the original Age of War series by Max Games
- Built with [Phaser 3](https://phaser.io/)
- TypeScript community for excellent tooling
- All AI asset generation tools used in development

##  Support

If you encounter any issues or have questions:
- Open an [Issue](https://github.com/MaxelBerger/AgeOfMax/issues)
- Check the [Documentation](./docs/)
- Contact via GitHub

---

**Enjoy the game! ** If you like it, consider giving it a  on GitHub!
