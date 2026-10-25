import { useState, type FormEvent } from 'react';

/**
 * Owner tool: finds winning products and hot niches on CJ. "Heat" is how many other shops list a product
 * (CJ's listed count): products many stores keep selling are proven sellers. Only items above the quality
 * floor are counted. Importing adds the product as "Coming soon"; the photo check and pricing follow as usual.
 */

interface Item { id: string; name: string; imageUrl: string; minPriceUsd: number | null; listedCount: number | null; inventoryTotal: number | null; category: string }
interface Niche { label: string; q: string; collection: string; subcategory: string; floor: number }
interface NicheResult { niche: Niche; items: Item[]; heat: number; error?: string }

const NICHES: Niche[] = [
  { label: 'Wedding guest dresses', q: 'wedding guest dress', collection: 'weddings-and-events', subcategory: 'evening-dresses', floor: 10 },
  { label: 'Cocktail dresses', q: 'cocktail party dress', collection: 'weddings-and-events', subcategory: 'cocktail-dresses', floor: 10 },
  { label: 'Satin maxi dresses', q: 'satin maxi dress', collection: 'tops-and-sets', subcategory: 'lady-dresses', floor: 10 },
  { label: 'Bridesmaid dresses', q: 'bridesmaid dress', collection: 'weddings-and-events', subcategory: 'bridesmaid-dresses', floor: 10 },
  { label: 'Men’s wedding suits', q: 'men slim fit wedding suit', collection: 'mens-formal', subcategory: 'wedding-suits', floor: 10 },
  { label: 'Tuxedos', q: 'men tuxedo', collection: 'mens-formal', subcategory: 'tuxedos-and-dinner-jackets', floor: 10 },
  { label: 'Men’s watches', q: 'men stainless steel watch', collection: 'jewelry-and-watches', subcategory: 'mens-watches', floor: 8 },
  { label: 'Women’s watches', q: 'women luxury watch', collection: 'jewelry-and-watches', subcategory: 'womens-watches', floor: 8 },
  { label: 'Engagement rings', q: 'moissanite ring', collection: 'jewelry-and-watches', subcategory: 'engagement-rings', floor: 4 },
  { label: 'Sterling silver jewelry', q: '925 sterling silver necklace', collection: 'jewelry-and-watches', subcategory: 'fine', floor: 4 },
  { label: 'Shoulder bags', q: 'women leather shoulder bag', collection: 'womens-bags', subcategory: 'shoulder-bags', floor: 8 },
  { label: 'Evening clutches', q: 'evening clutch bag', collection: 'womens-bags', subcategory: 'clutches', floor: 8 },
  { label: 'Heels', q: 'women stiletto heels', collection: 'womens-shoes', subcategory: 'pumps', floor: 8 },
  { label: 'Men’s dress shoes', q: 'men leather oxford shoes', collection: 'mens-accessories', subcategory: 'formal-shoes', floor: 8 },
  { label: 'Wool coats', q: 'women wool coat', collection: 'outerwear-and-jackets', subcategory: 'womens-wool-coats', floor: 10 },
  { label: 'Hair tools', q: 'hair curling iron', collection: 'beauty-tools', subcategory: 'curling-iron', floor: 4 },
];

const KEY = 'davinova-admin-password';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function readPassword() { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } }
const heatOf = (items: Item[]) => items.reduce((sum, item) => sum + (item.listedCount ?? 0), 0);

export function WinnersAdminPage() {
  const [password, setPassword] = useState(readPassword);
  const [results, setResults] = useState<NicheResult[]>([]);
  const [open, setOpen] = useState<string>('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [imported, setImported] = useState<Record<string, string>>({});

  async function search(niche: Niche): Promise<Item[]> {
    const params = new URLSearchParams({ q: niche.q, page: '1', size: '10', min: String(niche.floor) });
    const response = await fetch('/api/admin/cj-catalog?' + params.toString(), { headers: { 'x-admin-password': password }, cache: 'no-store' });
    const data = await response.json().catch(() => ({})) as { items?: Item[]; error?: string };
    if (!response.ok) throw new Error(response.status === 401 ? 'Admin password was not accepted.' : data.error || 'CJ search failed.');
    return (data.items ?? []).filter((item) => (item.minPriceUsd ?? 0) >= niche.floor).sort((a, b) => (b.listedCount ?? 0) - (a.listedCount ?? 0));
  }

  async function scan(event?: FormEvent) {
    event?.preventDefault();
    if (!password) { setError('Enter the admin password first.'); return; }
    try { sessionStorage.setItem(KEY, password); } catch { /* private mode */ }
    setError(''); setResults([]);
    const found: NicheResult[] = [];
    for (const niche of NICHES) {
      setBusy(`Scanning ${niche.label}…`);
      try {
        const items = await search(niche);
        found.push({ niche, items, heat: heatOf(items) });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'CJ search failed.';
        found.push({ niche, items: [], heat: 0, error: message });
        if (/password/.test(message)) { setError(message); break; }
      }
      setResults([...found].sort((a, b) => b.heat - a.heat));
      await sleep(1100); // CJ allows about one search per second.
    }
    setBusy('');
  }

  async function importItem(niche: Niche, item: Item) {
    setBusy(`Importing ${item.name.slice(0, 40)}…`);
    try {
      const response = await fetch('/api/admin/cj-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ productId: item.id, storeCollection: niche.collection, storeSubcategory: niche.subcategory }),
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Import failed.');
      setImported((current) => ({ ...current, [item.id]: 'Added as Coming soon' }));
    } catch (cause) {
      setImported((current) => ({ ...current, [item.id]: cause instanceof Error ? cause.message : 'Import failed.' }));
    }
    setBusy('');
  }

  const maxHeat = Math.max(1, ...results.map((result) => result.heat));
  return <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px', fontFamily: 'Inter, system-ui, sans-serif', color: '#2e2019' }}>
    <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 40, margin: '0 0 6px' }}>Winning products</h1>
    <p style={{ margin: '0 0 20px', color: '#8e735b' }}>Hot niches and proven sellers on CJ, ranked by how many shops list them. Only items above your quality floor count.</p>
    <form onSubmit={scan} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
      <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" aria-label="Admin password" style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid #e4d8cf', minWidth: 220 }} />
      <button type="submit" disabled={Boolean(busy)} style={{ padding: '10px 18px', border: 0, borderRadius: 999, background: '#2e2019', color: '#fbf1e2', fontWeight: 700 }}>Scan niches</button>
      {busy && <span role="status" style={{ alignSelf: 'center', color: '#8e735b' }}>{busy}</span>}
    </form>
    {error && <p role="alert" style={{ color: '#b3261e' }}>{error}</p>}
    <div style={{ display: 'grid', gap: 10 }}>
      {results.map(({ niche, items, heat, error: nicheError }) => <section key={niche.label} style={{ background: '#fffdfb', border: '1px solid #e4d8cf', borderRadius: 14, padding: 14 }}>
        <button type="button" onClick={() => setOpen(open === niche.label ? '' : niche.label)} style={{ all: 'unset', cursor: 'pointer', display: 'grid', gridTemplateColumns: 'minmax(0, 220px) 1fr auto', gap: 12, alignItems: 'center', width: '100%' }}>
          <strong>{niche.label}</strong>
          <span style={{ height: 10, borderRadius: 999, background: '#f1e7dd', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${(heat / maxHeat) * 100}%`, background: 'linear-gradient(90deg, #cdb69e, #8e735b)' }} /></span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: '#8e735b' }}>{nicheError ? 'error' : `${heat.toLocaleString()} listings · ${items.length} good`}</span>
        </button>
        {open === niche.label && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginTop: 12 }}>
          {nicheError && <p style={{ color: '#b3261e' }}>{nicheError}</p>}
          {items.map((item) => <article key={item.id} style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            <img src={item.imageUrl} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, background: '#f4ede6' }} />
            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</span>
            <span style={{ color: '#8e735b' }}>CJ ${item.minPriceUsd?.toFixed(2)} · {item.listedCount ?? 0} shops</span>
            {imported[item.id]
              ? <span>{imported[item.id]}</span>
              : <button type="button" disabled={Boolean(busy)} onClick={() => void importItem(niche, item)} style={{ padding: '8px 12px', border: 0, borderRadius: 999, background: '#2e2019', color: '#fbf1e2', fontWeight: 700 }}>Import</button>}
          </article>)}
        </div>}
      </section>)}
    </div>
  </main>;
}
