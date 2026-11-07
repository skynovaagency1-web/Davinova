/** Davinova Club terms: shared by the account pages (what the customer reads) and the Workers (what is credited). */

/** Points for day 1..7 of a check-in streak; day 7 is the weekly gift, then the streak starts again. */
export const CHECKIN_POINTS = [10, 20, 30, 40, 60, 90, 150] as const;

/** Points turn into balance in blocks: POINTS_PER_BLOCK points = BLOCK_CENTS of credit. */
export const POINTS_PER_BLOCK = 100;
export const BLOCK_CENTS = 100;

/** Points earned per whole dollar of a shipped order. */
export const POINTS_PER_DOLLAR = 1;

/** Balance top-up amounts, in cents. */
export const TOPUP_AMOUNTS_CENTS = [2500, 5000, 10000, 20000] as const;

export interface Level {
  key: string;
  name: string;
  /** Lifetime points needed. */
  min: number;
  /** Credit on every shipped order of a friend you invited, in percent of what they paid for items. */
  friendPercent: number;
  /** Check-in points multiplier. */
  boost: number;
}

export const LEVELS: readonly Level[] = [
  { key: 'starter', name: 'Starter', min: 0, friendPercent: 3, boost: 1 },
  { key: 'silver', name: 'Silver', min: 1000, friendPercent: 4, boost: 1 },
  { key: 'gold', name: 'Gold', min: 3000, friendPercent: 5, boost: 1.5 },
  { key: 'platinum', name: 'Platinum', min: 8000, friendPercent: 6, boost: 1.5 },
  { key: 'diamond', name: 'Diamond', min: 20000, friendPercent: 8, boost: 2 },
];

export function levelFor(lifetimePoints: number): { level: Level; next: Level | null; index: number } {
  let index = 0;
  LEVELS.forEach((level, i) => { if (lifetimePoints >= level.min) index = i; });
  return { level: LEVELS[index], next: LEVELS[index + 1] ?? null, index };
}

/** Points for the given streak day (1..7) at a level. */
export function checkinPoints(day: number, boost = 1): number {
  return Math.round(CHECKIN_POINTS[Math.min(Math.max(day, 1), 7) - 1] * boost);
}

export interface RewardEntry { kind: string; cents: number; points: number; note: string; at: string }

export interface Rewards {
  walletCode: string | null;
  balanceCents: number;
  points: number;
  lifetimePoints: number;
  streak: number;
  checkedInToday: boolean;
  level: string;
  referralCode: string | null;
  friends: { joined: number; ordered: number };
  earnedCents: { total: number; friends: number; points: number; month: number; week: number; today: number };
  history: RewardEntry[];
}
