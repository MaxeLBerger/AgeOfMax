import { muzzlePoint, projectileTexture, unitTargetHeight } from '../game/projectilePresentation';

describe('Blender weapon attachment', () => {
  it('projects a contact-frame muzzle around the foot anchor for both factions', () => {
    const frames: Array<[number, number]> = Array.from({ length: 8 }, () => [200, 176]);
    frames[6] = [220, 160];
    const sockets = { rifleman: frames };
    expect(muzzlePoint(sockets, 'rifleman', 6, 600, 507, .5, .5, false)).toEqual({ x: 646, y: 469.24 });
    expect(muzzlePoint(sockets, 'rifleman', 6, 600, 493, .5, .5, true)).toEqual({ x: 554, y: 455.24 });
  });
  it('distinguishes ammunition by weapon, including units within the same epoch', () => {
    expect(projectileTexture('musketeer')).toBe('bullet');
    expect(projectileTexture('cannon')).toBe('cannonball');
    expect(projectileTexture('rifleman')).toBe('bullet');
    expect(projectileTexture('grenadier')).toBe('grenade');
    expect(projectileTexture('laser-soldier')).toBe('laser');
    expect(projectileTexture('plasma-trooper')).toBe('plasma');
    expect(projectileTexture('archer')).toBe('arrow');
  });
  it('aims at bodies above each formation row rather than at the feet', () => {
    expect(unitTargetHeight('rifleman')).toBe(43);
    expect(unitTargetHeight('tank')).toBe(30);
    expect(unitTargetHeight('super-heavy')).toBe(52);
  });
});
