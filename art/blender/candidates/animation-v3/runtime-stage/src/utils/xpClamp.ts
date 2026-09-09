// XP clamp utility to prevent runaway award events
export const MAX_XP_EVENT = 2000;

export function clampXPEvent(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  if (amount < 0) return 0;
  return amount > MAX_XP_EVENT ? MAX_XP_EVENT : amount;
}
