import { env } from './env';

let clockOffsetMs = 0;

export function now(): Date {
  if (env.VITE_DATA_MODE === 'supabase') {
    return new Date();
  }
  return new Date(Date.now() + clockOffsetMs);
}

export function nowISO(): string {
  return now().toISOString();
}

export function advanceClock(minutes: number): void {
  clockOffsetMs += minutes * 60 * 1000;
}

export function resetClock(): void {
  clockOffsetMs = 0;
}

// In mock mode only, expose window.__skillshare
if (typeof window !== 'undefined' && env.VITE_DATA_MODE === 'mock') {
  (window as unknown as {
    __skillshare?: {
      advanceClock: (minutes: number) => void;
      resetClock: () => void;
      getNow: () => Date;
    };
  }).__skillshare = {
    advanceClock,
    resetClock,
    getNow: now,
  };
}
