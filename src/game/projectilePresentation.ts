/** Raw 256px Blender frame coordinates, indexed by unit ID and animation frame. */
export type WeaponSockets = Record<string, Array<[number, number]>>;

export function muzzlePoint(sockets: WeaponSockets | undefined, id: string, frame: number,
  x: number, y: number, scaleX: number, scaleY: number, flipped: boolean): { x: number; y: number } {
  const socket = sockets?.[id]?.[frame];
  // A stable fallback keeps diagnostic/test sprites usable; Boot requires the export in the shipped game.
  const [px, py] = socket ?? [190, 170];
  return { x: x + (px - 128) * scaleX * (flipped ? -1 : 1), y: y + (py - 256 * 0.92) * scaleY };
}

export function unitTargetHeight(id: string): number {
  if (['tank', 'ballista', 'cannon'].includes(id)) return 30;
  if (['dino-rider', 'knight', 'cavalry'].includes(id)) return 40;
  if (['mech', 'super-heavy'].includes(id)) return 52;
  return 43;
}

export function projectileTexture(id: string): string {
  if (id === 'slinger') return 'rock';
  if (['archer', 'ballista'].includes(id)) return 'arrow';
  if (['cannon', 'tank'].includes(id)) return 'cannonball';
  if (id === 'grenadier') return 'grenade';
  if (id === 'plasma-trooper') return 'plasma';
  if (['laser-soldier', 'mech'].includes(id)) return 'laser';
  return 'bullet';
}
