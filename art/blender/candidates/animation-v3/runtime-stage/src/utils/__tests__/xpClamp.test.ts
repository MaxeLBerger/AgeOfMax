import { clampXPEvent, MAX_XP_EVENT } from '../xpClamp.ts';

describe('clampXPEvent', () => {
  it('clamps negative values to 0', () => {
    expect(clampXPEvent(-50)).toBe(0);
  });

  it('returns same value for normal positive amount', () => {
    expect(clampXPEvent(150)).toBe(150);
  });

  it('caps very large awards at MAX_XP_EVENT', () => {
    expect(clampXPEvent(MAX_XP_EVENT + 5000)).toBe(MAX_XP_EVENT);
  });

  it('handles non-finite values safely', () => {
    expect(clampXPEvent(Number.POSITIVE_INFINITY)).toBe(0);
    // @ts-expect-error intentional invalid type
    expect(clampXPEvent('not-a-number')).toBe(0);
  });
});
