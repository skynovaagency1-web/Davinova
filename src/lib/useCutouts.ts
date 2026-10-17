import { useEffect, useState } from 'react';

// public/cutouts/manifest.json maps product id → background-free photo, made by the "Product cutouts" GitHub Action.
let request: Promise<Record<string, string | null>> | null = null;
let cache: Record<string, string | null> = {};

export function loadCutouts() {
  request ??= fetch('/cutouts/manifest.json')
    .then((response) => (response.ok ? response.json() : {}))
    .catch(() => ({}))
    .then((data: Record<string, string | null>) => (cache = data));
  return request;
}

/** Returns a lookup from product id to its cut-out photo, or undefined while none exists. */
export function useCutouts(): (id: string) => string | undefined {
  const [map, setMap] = useState(cache);
  useEffect(() => { let alive = true; loadCutouts().then((data) => { if (alive) setMap(data); }); return () => { alive = false; }; }, []);
  return (id) => map[id] ?? undefined;
}
