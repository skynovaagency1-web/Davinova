import { useEffect, type CSSProperties } from 'react';
import { create } from 'zustand';

type Dept = 'women' | 'men';
interface Mood { name: string; a: string; b: string }

/** Colour moods from the owner's swatch boards: Men = 10 shades of black and grey, Women = cream to espresso. */
const MOODS: Record<Dept, Mood[]> = {
  women: [
    { name: 'Cream', a: '#f3ead8', b: '#dcc8a8' },
    { name: 'Beige', a: '#dcc8a8', b: '#9b7253' },
    { name: 'Mocha', a: '#9b7253', b: '#5a3a2a' },
    { name: 'Cocoa', a: '#5a3a2a', b: '#2e1f17' },
    { name: 'Espresso', a: '#2e1f17', b: '#5a3a2a' },
  ],
  men: [
    { name: 'Jet black', a: '#0b0b0b', b: '#232323' },
    { name: 'Charcoal grey', a: '#232323', b: '#3a3b3d' },
    { name: 'Graphite grey', a: '#3a3b3d', b: '#5f6063' },
    { name: 'Steel grey', a: '#5f6063', b: '#77787a' },
    { name: 'Smoky grey', a: '#77787a', b: '#8e8f91' },
    { name: 'Ash grey', a: '#8e8f91', b: '#a9aaac' },
    { name: 'Silver grey', a: '#a9aaac', b: '#c4c5c6' },
    { name: 'Pearl grey', a: '#c4c5c6', b: '#d6d6d6' },
    { name: 'Dove grey', a: '#d6d6d6', b: '#eeeeec' },
    { name: 'Platinum grey', a: '#eeeeec', b: '#d6d6d6' },
  ],
};

/** Each shop opens on the shade closest to its own look: espresso for Women, charcoal for Men. */
const START: Record<Dept, number> = { women: 4, men: 1 };

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
  }, [mood]);
  return <div className={`mood-layer mood-layer--${dept}`} style={style} aria-hidden="true" />;
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
