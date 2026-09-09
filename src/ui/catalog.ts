export const epochNames: Record<string, string> = {
  stone: 'Steinzeit', castle: 'Mittelalter', renaissance: 'Renaissance', modern: 'Moderne', future: 'Zukunft'
};

export const unitNames: Record<string, string> = {
  clubman: 'Keulenkrieger', spearman: 'Speerwächter', slinger: 'Steinschleuder', 'dino-rider': 'Dinosaurierreiter',
  swordsman: 'Schwertkämpfer', archer: 'Bogenschütze', knight: 'Ritter', ballista: 'Balliste',
  musketeer: 'Musketier', cavalry: 'Kavallerie', cannon: 'Feldkanone', duelist: 'Duellant',
  rifleman: 'Infanterist', grenadier: 'Grenadier', tank: 'Kampfpanzer', sniper: 'Scharfschütze',
  'laser-soldier': 'Laserinfanterie', mech: 'Kampfmech', 'plasma-trooper': 'Plasmaschütze', 'super-heavy': 'Titan'
};

export const unitRoles: Record<string, string> = {
  clubman: 'Preiswerte Front', spearman: 'Konter gegen Sturmtruppen · +70 % Schaden', slinger: 'Unterstützung aus der Distanz', 'dino-rider': 'Sturmtrupp · Stark gegen Fernkampf und Festungen',
  swordsman: 'Gepanzerte Front', archer: 'Fernkampf-Unterstützung', knight: 'Sturmtrupp · Stark gegen Fernkampf und Festungen', ballista: 'Belagerung · Durchschlag · Hoher Festungsschaden',
  musketeer: 'Gezielte Salven', cavalry: 'Sturmtrupp · Stark gegen Fernkampf und Festungen', cannon: 'Belagerung · Flächenschaden · Langsamer Schuss', duelist: 'Schneller Nahkampf',
  rifleman: 'Flexible Feuerkraft', grenadier: 'Flächenschaden gegen Gruppen und Festungen', tank: 'Gepanzerter Vorstoß', sniper: 'Konter gegen Fronttruppen · +40 % Schaden',
  'laser-soldier': 'Schnelle Energiefeuerkraft', mech: 'Schwere Feuerunterstützung', 'plasma-trooper': 'Belagerung · Plasma mit Flächenschaden', 'super-heavy': 'Schwerer Sturmtrupp · Sehr viele Lebenspunkte'
};

export const turretNames: Record<string, string> = {
  'rock-thrower': 'Steinwerfer', 'wooden-spike': 'Palisade', 'basic-tower': 'Wachturm',
  'arrow-tower': 'Bogenturm', ballista: 'Balliste', trebuchet: 'Trebuchet', cannon: 'Kanone',
  'musket-tower': 'Musketenturm', fortress: 'Bastion', 'machine-gun': 'MG-Nest', 'anti-tank': 'Panzerabwehr',
  artillery: 'Artillerie', 'laser-turret': 'Laserturm', 'rail-gun': 'Railgun', 'ion-cannon': 'Ionenkanone'
};

export const turretTexture = (epoch: string, index: number): string => `${epoch}-tower-${index + 1}`;
