import { useEffect, type CSSProperties } from 'react';
import { create } from 'zustand';

type Dept = 'women' | 'men';
interface Mood { name: string; a: string; b: string }

/** Colour moods Claude picked for a hyper-premium feel (owner, 2026-10-24): deep jewel and metal tones, each a two-stop gradient. */
const MOODS: Record<Dept, Mood[]> = {
  women: [
    { name: 'Espresso', a: '#2e1f17', b: '#7a5a43' },
    { name: 'Champagne gold', a: '#b8924f', b: '#f3e3c3' },
    { name: 'Rose gold', a: '#a8616c', b: '#f0c4bc' },
    { name: 'Bordeaux', a: '#4a0f1c', b: '#9c3a4e' },
    { name: 'Emerald', a: '#0b3d2e', b: '#3f8f72' },
    { name: 'Pearl', a: '#cfc5b6', b: '#fffaf2' },
  ],
  men: [
    { name: 'Onyx', a: '#0b0b0c', b: '#2a2a2e' },
    { name: 'Gunmetal', a: '#2b2f35', b: '#6b727c' },
    { name: 'Midnight navy', a: '#0c1a33', b: '#355a8f' },
    { name: 'Racing green', a: '#0f2a20', b: '#3d6b56' },
    { name: 'Cognac', a: '#4a2a16', b: '#a8693a' },
    { name: 'Platinum', a: '#8f9296', b: '#e4e6e8' },
  ],
};

/** Each shop opens on the shade closest to its own look. */
const START: Record<Dept, number> = { women: 0, men: 0 };

const AUTO_MS = 30_000; // the colours move on by themselves every 30 seconds
const HOLD_MS = 60_000; // a colour the shopper picks stays for a minute first

interface MoodState {
  index: Record<Dept, number>;
  nextAt: number;
  pick: (dept: Dept, index: number) => void;
  advance: (dept: Dept) => void;
}

const useMoodStore = create<MoodState>()((set) => ({
  index: { ...START },
  nextAt: Date.now() + AUTO_MS,
  pick: (dept, index) => set((state) => ({ index: { ...state.index, [dept]: index }, nextAt: Date.now() + HOLD_MS })),
  advance: (dept) => set((state) => ({ index: { ...state.index, [dept]: (state.index[dept] + 1) % MOODS[dept].length }, nextAt: Date.now() + AUTO_MS })),
}));

/** Fixed tint layer behind the page content; also runs the 30-second rotation. */
export function MoodLayer({ dept }: { dept: Dept }) {
  const index = useMoodStore((state) => state.index[dept]);
  const advance = useMoodStore((state) => state.advance);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (Date.now() >= useMoodStore.getState().nextAt) advance(dept);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [dept, advance]);
  const mood = MOODS[dept][index];
  const style = { '--mood-a': mood.a, '--mood-b': mood.b, '--mood-on': 1 } as CSSProperties;
  // Shared on the page root so sections with their own backdrop (like the men's hero) can tint too.
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--mood-a', mood.a);
    root.setProperty('--mood-b', mood.b);
    root.setProperty('--mood-on', '1');
    // The logo's ring, star and shimmer take the same shade, lifted towards white so it stays readable on dark headers.
    root.setProperty('--logo-1', 'color-mix(in srgb, var(--mood-a) 75%, #fff)');
    root.setProperty('--logo-2', 'color-mix(in srgb, var(--mood-b) 55%, #fff)');
    root.setProperty('--logo-3', 'color-mix(in srgb, var(--mood-a) 40%, #fff)');
    root.setProperty('--logo-4', 'var(--mood-b)');
    root.setProperty('--logo-ink', 'color-mix(in srgb, var(--mood-b) 32%, #fff)');
  }, [mood]);
  // Two layers: one gives the hue, the other the light and depth of the shade.
  return <>
    <div className={`mood-layer mood-layer--${dept}`} style={style} aria-hidden="true" />
    <div className={`mood-layer mood-layer--light mood-layer--${dept}`} style={style} aria-hidden="true" />
  </>;
}

/** The colour bar: one gradient swatch per mood, with a pointer over the current one. */
export function MoodBar({ dept, className = '' }: { dept: Dept; className?: string }) {
  const index = useMoodStore((state) => state.index[dept]);
  const pick = useMoodStore((state) => state.pick);
  const moods = MOODS[dept];
  return <div className={`mood-bar ${className}`} role="group" aria-label="Shop colours" style={{ '--n': moods.length, '--i': index } as CSSProperties}>
    <i className="mood-bar__pointer" />
    <div>{moods.map((mood, i) => <button key={mood.name} type="button" title={mood.name} aria-label={`${mood.name} colours`} aria-pressed={i === index} className={i === index ? 'is-on' : ''} style={{ background: mood.a }} onClick={() => pick(dept, i)} />)}</div>
  </div>;
}
