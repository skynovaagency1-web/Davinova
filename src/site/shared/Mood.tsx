import { useEffect, type CSSProperties } from 'react';
import { create } from 'zustand';

type Dept = 'women' | 'men';
interface Mood { name: string; a: string; b: string }

/** Colour moods that tint the whole shop. The first one is the shop's own look (no tint). */
const MOODS: Record<Dept, Mood[]> = {
  women: [
    { name: 'Bronze', a: '#8e735b', b: '#cdb69e' },
    { name: 'Rose gold', a: '#b76e79', b: '#f3c6c1' },
    { name: 'Champagne', a: '#c9a25f', b: '#f7e7c4' },
    { name: 'Plum', a: '#6b2d58', b: '#c27aa8' },
    { name: 'Emerald', a: '#0f5a4a', b: '#6fc2a5' },
    { name: 'Sapphire', a: '#1d2b64', b: '#7f93e0' },
  ],
  men: [
    { name: 'Charcoal', a: '#111111', b: '#6f736d' },
    { name: 'Sage', a: '#3f6a5a', b: '#a7c4b5' },
    { name: 'Navy', a: '#16264a', b: '#5c7bb0' },
    { name: 'Cognac', a: '#6b4a33', b: '#c08a5c' },
    { name: 'Burgundy', a: '#4a1520', b: '#a8434f' },
    { name: 'Ice', a: '#2b3a42', b: '#a9d3e2' },
  ],
};

const AUTO_MS = 30_000; // the colours move on by themselves every 30 seconds
const HOLD_MS = 60_000; // a colour the shopper picks stays for a minute first

interface MoodState {
  index: Record<Dept, number>;
  nextAt: number;
  pick: (dept: Dept, index: number) => void;
  advance: (dept: Dept) => void;
}

const useMoodStore = create<MoodState>()((set) => ({
  index: { women: 0, men: 0 },
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
  const style = { '--mood-a': mood.a, '--mood-b': mood.b, '--mood-on': index === 0 ? 0 : 1 } as CSSProperties;
  // Shared on the page root so sections with their own backdrop (like the men's hero) can tint too.
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--mood-a', mood.a);
    root.setProperty('--mood-b', mood.b);
    root.setProperty('--mood-on', index === 0 ? '0' : '1');
  }, [mood, index]);
  return <div className={`mood-layer mood-layer--${dept}`} style={style} aria-hidden="true" />;
}

/** The colour bar: one gradient swatch per mood, with a pointer over the current one. */
export function MoodBar({ dept, className = '' }: { dept: Dept; className?: string }) {
  const index = useMoodStore((state) => state.index[dept]);
  const pick = useMoodStore((state) => state.pick);
  const moods = MOODS[dept];
  return <div className={`mood-bar ${className}`} role="group" aria-label="Shop colours" style={{ '--n': moods.length, '--i': index } as CSSProperties}>
    <i className="mood-bar__pointer" />
    <div>{moods.map((mood, i) => <button key={mood.name} type="button" title={mood.name} aria-label={`${mood.name} colours`} aria-pressed={i === index} className={i === index ? 'is-on' : ''} style={{ background: `linear-gradient(135deg, ${mood.a}, ${mood.b})` }} onClick={() => pick(dept, i)} />)}</div>
  </div>;
}
