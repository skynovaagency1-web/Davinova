import { useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 24;

/** Renders a long list in pages of 24, loading the next page as the sentinel nears the viewport. */
export function usePaged<T>(items: T[], resetKey: string) {
  const [count, setCount] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => setCount(PAGE_SIZE), [resetKey]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || count >= items.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setCount((value) => value + PAGE_SIZE);
    }, { rootMargin: '600px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [count, items.length]);

  return { visible: items.slice(0, count), remaining: Math.max(0, items.length - count), more: () => setCount((value) => value + PAGE_SIZE), sentinel };
}
