import { useEffect, useState } from 'react';

export type Region = { country: string; eu: boolean; euOpen: boolean };

let cached: Promise<Region | null> | null = null;
function loadRegion(): Promise<Region | null> {
  cached ??= fetch('/api/region').then((response) => (response.ok ? response.json() as Promise<Region> : null)).catch(() => null);
  return cached;
}

/** The visitor's country and whether EU delivery is open; null until known (or if the lookup fails). */
export function useRegion(): Region | null {
  const [region, setRegion] = useState<Region | null>(null);
  useEffect(() => { let live = true; loadRegion().then((value) => { if (live) setRegion(value); }); return () => { live = false; }; }, []);
  return region;
}
