import { useState, type FormEvent } from 'react';

interface SearchProduct {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  sellPriceUsd: number | null;
  discountPriceUsd: number | null;
  listedCount: number | null;
  inventoryTotal: number | null;
  verifiedInventory: number | null;
  category: string;
  freeShippingFlag: boolean | null;
  saleStatus: string;
  deliveryCycle: string;
}
interface Inventory {
  countryCode: string;
  total: number | null;
  cjStock: number | null;
  factoryStock: number | null;
  verifiedWarehouse: boolean;
}
interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  imageUrls: string[];
  category: string;
  sellPriceUsd: number | null;
  description: string;
  saleStatus: string;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    options: string;
    sellPriceUsd: number | null;
    inventory: Inventory[];
  }>;
}

interface FreightOption {
  logisticName: string;
  deliveryWindow: string;
  shippingUsd: number | null;
  totalPostageUsd: number | null;
  taxesUsd: number | null;
  customsClearanceUsd: number | null;
  note: string;
}
interface FreightResponse {
  ok?: boolean;
  error?: string;
  quotes?: FreightOption[];
}
const EUROPE_DESTINATIONS = [
  ['AT', 'Austria'], ['BE', 'Belgium'], ['BG', 'Bulgaria'], ['HR', 'Croatia'],
  ['CY', 'Cyprus'], ['CZ', 'Czechia'], ['DK', 'Denmark'], ['EE', 'Estonia'],
  ['FI', 'Finland'], ['FR', 'France'], ['DE', 'Germany'], ['GR', 'Greece'],
  ['HU', 'Hungary'], ['IE', 'Ireland'], ['IT', 'Italy'], ['LV', 'Latvia'],
  ['LT', 'Lithuania'], ['LU', 'Luxembourg'], ['MT', 'Malta'], ['NL', 'Netherlands'],
  ['PL', 'Poland'], ['PT', 'Portugal'], ['RO', 'Romania'], ['SK', 'Slovakia'],
  ['SI', 'Slovenia'], ['ES', 'Spain'], ['SE', 'Sweden'], ['GB', 'United Kingdom'],
  ['CH', 'Switzerland'], ['NO', 'Norway'], ['IS', 'Iceland'], ['LI', 'Liechtenstein'],
  ['AL', 'Albania'], ['AD', 'Andorra'], ['BA', 'Bosnia and Herzegovina'],
  ['MD', 'Moldova'], ['ME', 'Montenegro'], ['MK', 'North Macedonia'],
  ['RS', 'Serbia'], ['UA', 'Ukraine'], ['TR', 'Türkiye'], ['MC', 'Monaco'],
  ['SM', 'San Marino'], ['VA', 'Vatican City'], ['XK', 'Kosovo'],
] as const;
const SHIPPING_ORIGINS = [
  ['CN', 'China (CN)'], ['DE', 'Germany (DE)'], ['PL', 'Poland (PL)'],
  ['CZ', 'Czechia (CZ)'], ['ES', 'Spain (ES)'], ['US', 'United States (US)'],
] as const;

interface SearchResponse {
  ok?: boolean;
  error?: string;
  items?: SearchProduct[];
  totalRecords?: number;
  detail?: ProductDetail;
}
const money = (value: number | null) => value === null ? 'Not supplied' : new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
}).format(value);

export function CJCatalogAdminPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [keyword, setKeyword] = useState('wedding guest dress');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [details, setDetails] = useState<Record<string, ProductDetail>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sourceCountryCode, setSourceCountryCode] = useState('CN');
  const [destinationCountryCode, setDestinationCountryCode] = useState('FR');
  const [freightQuotes, setFreightQuotes] = useState<Record<string, Record<string, FreightOption[]>>>({});
  const [freightErrors, setFreightErrors] = useState<Record<string, string>>({});
  const [freightBusyVariant, setFreightBusyVariant] = useState<string | null>(null);

  async function readJson(response: Response): Promise<SearchResponse> {
    const data = await response.json() as SearchResponse;
    if (!response.ok) throw new Error(data.error || (response.status === 401 ? 'Admin password was not accepted.' : 'CJ request failed.'));
    return data;
  }

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setMessage('');
    if (!adminPassword) {
      setError('Enter the Davinova admin password configured in Cloudflare first.');
      return;
    }
    if (keyword.trim().length < 2) {
      setError('Enter at least two characters to search.');
      return;
    }
    setBusy(true);
    try {
      const params = new URLSearchParams({ q: keyword.trim(), page: '1', size: '10' });
      const response = await fetch('/api/admin/cj-catalog?' + params.toString(), {
        headers: { 'x-admin-password': adminPassword },
        cache: 'no-store',
      });
      const data = await readJson(response);
      setResults(data.items ?? []);
      setTotal(data.totalRecords ?? data.items?.length ?? 0);
      setDetails({});
      setMessage('Read-only search finished. No products were imported and no orders were placed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not search CJ right now.');
    } finally {
      setBusy(false);
    }
  }

  async function loadDetails(product: SearchProduct) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const params = new URLSearchParams({ pid: product.id });
      const response = await fetch('/api/admin/cj-catalog?' + params.toString(), {
        headers: { 'x-admin-password': adminPassword },
        cache: 'no-store',
      });
      const data = await readJson(response);
      if (!data.detail) throw new Error('CJ returned no product details.');
      setDetails((current) => ({ ...current, [product.id]: data.detail! }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load product variants.');
    } finally {
      setBusy(false);
    }
  }


  async function checkShipping(variant: ProductDetail['variants'][number]) {
    if (!adminPassword) {
      setError('Enter the Davinova admin password first.');
      return;
    }
    if (!variant.id) {
      setError('This variant has no CJ variant ID, so it cannot be quoted.');
      return;
    }
    setError('');
    setMessage('');
    setFreightErrors((current) => ({ ...current, [variant.id]: '' }));
    setFreightBusyVariant(variant.id);
    try {
      const params = new URLSearchParams({
        vid: variant.id,
        origin: sourceCountryCode,
        country: destinationCountryCode,
        quantity: '1',
      });
      const response = await fetch('/api/admin/cj-shipping?' + params.toString(), {
        headers: { 'x-admin-password': adminPassword },
        cache: 'no-store',
      });
      const data = await response.json() as FreightResponse;
      if (!response.ok) throw new Error(data.error || 'CJ could not return a shipping quote.');
      const quotes = (data.quotes ?? []).filter((quote) => quote.shippingUsd !== null || quote.totalPostageUsd !== null);
      setFreightQuotes((current) => ({
        ...current,
        [variant.id]: { ...(current[variant.id] ?? {}), [destinationCountryCode]: quotes },
      }));
      setMessage(quotes.length
        ? `CJ returned ${quotes.length} priced shipping method(s) for ${destinationCountryCode}. This is a preliminary estimate.`
        : `CJ returned no priced shipping method for ${destinationCountryCode}. That does not prove the route is permanently unavailable.`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'CJ shipping check failed.';
      setFreightErrors((current) => ({ ...current, [variant.id]: message }));
    } finally {
      setFreightBusyVariant(null);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f0eb', color: '#292522', padding: '32px 18px 60px', fontFamily: 'DM Sans, Arial, sans-serif' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <a href="/" style={{ color: '#6f625b', fontSize: 13, textDecoration: 'none' }}>← Davinova storefront</a>
        <p style={{ letterSpacing: '.18em', fontSize: 11, textTransform: 'uppercase', marginTop: 30 }}>Private sourcing workspace</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: 500, margin: '8px 0' }}>CJ product catalogue</h1>
        <p style={{ color: '#746960', lineHeight: 1.6, maxWidth: 720 }}>Search CJ’s catalogue and inspect variant IDs, listed prices and stock before choosing products for Davinova.</p>

        <section style={{ background: '#fffdfb', border: '1px solid #e4d8cf', borderRadius: 14, padding: 18, marginTop: 24 }}>
          <label htmlFor="adminPassword" style={{ display: 'block', fontSize: 13, marginBottom: 7 }}>Davinova admin password</label>
          <input id="adminPassword" type="password" autoComplete="current-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Enter the Cloudflare ADMIN_PASSWORD secret" style={{ boxSizing: 'border-box', width: '100%', padding: '12px 13px', border: '1px solid #d8cbc1', borderRadius: 8, background: '#fff', fontSize: 15 }} />
          <p style={{ color: '#82756d', fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>The password stays in this page’s memory only and is sent to your own site over HTTPS. It is not saved in the browser.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
            <div>
              <label htmlFor="sourceCountryCode" style={{ display: 'block', fontSize: 13, marginBottom: 7 }}>Shipping origin (must match stock location)</label>
              <select id="sourceCountryCode" value={sourceCountryCode} onChange={(event) => setSourceCountryCode(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #d8cbc1', borderRadius: 8, background: '#fff', fontSize: 14 }}>
                {SHIPPING_ORIGINS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="destinationCountryCode" style={{ display: 'block', fontSize: 13, marginBottom: 7 }}>European destination</label>
              <select id="destinationCountryCode" value={destinationCountryCode} onChange={(event) => setDestinationCountryCode(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #d8cbc1', borderRadius: 8, background: '#fff', fontSize: 14 }}>
                {EUROPE_DESTINATIONS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
          </div>
          <p style={{ color: '#82756d', fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>Choose a destination and check each variant. If CJ did not supply inventory records, the origin is an assumption and any quote is preliminary.</p>
          <form onSubmit={search} style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <label htmlFor="keyword" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Search CJ</label>
            <input id="keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="e.g. wedding guest dress" style={{ flex: '1 1 260px', minWidth: 0, padding: '13px 14px', border: '1px solid #d8cbc1', borderRadius: 8, background: '#fff', fontSize: 15 }} />
            <button type="submit" disabled={busy} style={{ padding: '13px 20px', border: 0, borderRadius: 8, background: '#292522', color: '#fff', cursor: busy ? 'wait' : 'pointer', opacity: busy ? .65 : 1 }}>{busy ? 'Please wait…' : 'Search CJ'}</button>
          </form>
        </section>

        <section style={{ background: '#efe5dc', borderRadius: 12, padding: 16, marginTop: 16, fontSize: 13, lineHeight: 1.6 }}>
          <strong>Safety status: read-only.</strong> This page only searches CJ and reads product information. It does not import products, publish listings, charge money or place supplier orders. Prices shown by CJ are item prices; shipping and landed costs still need checking.
        </section>

        {error && <p role="alert" style={{ color: '#9b3125', background: '#fff4f1', border: '1px solid #efc6be', borderRadius: 8, padding: 12, marginTop: 16 }}>{error}</p>}
        {message && <p role="status" style={{ color: '#466543', background: '#f2f6ef', border: '1px solid #d5e4d0', borderRadius: 8, padding: 12, marginTop: 16 }}>{message}</p>}

        {results.length > 0 && <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 32, fontWeight: 500, margin: 0 }}>Search results</h2>
            <span style={{ color: '#746960', fontSize: 13 }}>Up to 10 products shown · {total.toLocaleString()} matching CJ records reported</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16, marginTop: 16 }}>
            {results.map((product) => {
              const detail = details[product.id];
              return <article key={product.id} style={{ background: '#fffdfb', border: '1px solid #e4d8cf', borderRadius: 12, overflow: 'hidden' }}>
                {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} style={{ display: 'block', width: '100%', height: 270, objectFit: 'contain', background: '#f0e7df' }} /> : <div style={{ height: 270, display: 'grid', placeItems: 'center', background: '#f0e7df', color: '#82756d' }}>No image preview from CJ</div>}
                <div style={{ padding: 16 }}>
                  <p style={{ textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 10, color: '#82756d' }}>{product.category || 'CJ catalogue'}</p>
                  <h3 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, margin: '6px 0 10px' }}>{product.name}</h3>
                  <p style={{ margin: '5px 0', fontSize: 13 }}>CJ product ID: <code>{product.id}</code></p>
                  <p style={{ margin: '5px 0', fontSize: 13 }}>SKU: <code>{product.sku || 'Not supplied'}</code></p>
                  <p style={{ margin: '5px 0', fontSize: 13 }}>Listed item price: <strong>{money(product.discountPriceUsd ?? product.sellPriceUsd)}</strong></p>
                  <p style={{ margin: '5px 0', fontSize: 13 }}>Reported inventory: <strong>{product.inventoryTotal === null ? 'Not supplied' : product.inventoryTotal.toLocaleString()}</strong>; verified: {product.verifiedInventory === null ? 'not supplied' : product.verifiedInventory.toLocaleString()}</p>
                  <p style={{ margin: '5px 0', fontSize: 13 }}>Free-shipping flag: {product.freeShippingFlag === null ? 'not supplied' : product.freeShippingFlag ? 'Yes' : 'No'}</p>
                  <button type="button" onClick={() => loadDetails(product)} disabled={busy} style={{ marginTop: 12, padding: '10px 13px', border: '1px solid #bca99b', background: '#fff', borderRadius: 8, color: '#292522', cursor: busy ? 'wait' : 'pointer' }}>{detail ? 'Refresh variants' : 'Inspect sizes & variants'}</button>
                  {detail && <div style={{ marginTop: 16, borderTop: '1px solid #e4d8cf', paddingTop: 14 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Variants ({detail.variants.length})</h4>
                    {detail.variants.length === 0 ? <p style={{ fontSize: 13 }}>CJ did not return variants for this product.</p> : <div style={{ display: 'grid', gap: 10 }}>
                      {detail.variants.map((variant) => <div key={variant.id || variant.sku} style={{ background: '#f7f1ec', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{variant.options || variant.name || 'Variant'}</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>VID: <code>{variant.id || 'not supplied'}</code></div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>SKU: <code>{variant.sku || 'not supplied'}</code> · {money(variant.sellPriceUsd)}</div>
                        {variant.inventory.length > 0 ? variant.inventory.map((stock, index) => <div key={stock.countryCode + index} style={{ color: '#746960', fontSize: 12, marginTop: 5 }}>{stock.countryCode || 'Warehouse'}: {stock.total ?? '—'} total · CJ {stock.cjStock ?? '—'} · factory {stock.factoryStock ?? '—'} · {stock.verifiedWarehouse ? 'verified' : 'not verified'}</div>) : <div style={{ color: '#746960', fontSize: 12, marginTop: 5 }}>No inventory records supplied.</div>}
                        <button type="button" onClick={() => checkShipping(variant)} disabled={Boolean(freightBusyVariant) || busy} style={{ marginTop: 11, padding: '9px 11px', border: '1px solid #bca99b', background: '#fff', borderRadius: 8, color: '#292522', cursor: freightBusyVariant || busy ? 'wait' : 'pointer', opacity: freightBusyVariant || busy ? .65 : 1 }}>{freightBusyVariant === variant.id ? 'Checking shipping…' : `Check shipping to ${destinationCountryCode}`}</button>
                        {freightErrors[variant.id] && <p role="alert" style={{ color: '#9b3125', fontSize: 12, marginTop: 8 }}>{freightErrors[variant.id]}</p>}
                        {freightQuotes[variant.id]?.[destinationCountryCode] && <div style={{ marginTop: 10, borderTop: '1px solid #e4d8cf', paddingTop: 10 }}>
                          <div style={{ fontSize: 12, color: '#746960', marginBottom: 7 }}>Quote for {destinationCountryCode} · origin {sourceCountryCode} · quantity 1</div>
                          {freightQuotes[variant.id][destinationCountryCode].length === 0
                            ? <div style={{ fontSize: 12, color: '#746960' }}>No priced shipping methods were returned for this route.</div>
                            : freightQuotes[variant.id][destinationCountryCode].map((quote, quoteIndex) => <div key={quote.logisticName + quoteIndex} style={{ background: '#fffdfb', border: '1px solid #e4d8cf', borderRadius: 7, padding: 9, marginTop: 7, fontSize: 12, lineHeight: 1.5 }}>
                              <strong>{quote.logisticName || 'Shipping method'}</strong>
                              <div>{quote.totalPostageUsd !== null ? 'Total postage estimate: ' : 'Shipping estimate: '}{money(quote.totalPostageUsd ?? quote.shippingUsd)}</div>
                              {quote.deliveryWindow && <div>Estimated delivery: {quote.deliveryWindow}</div>}
                              {quote.taxesUsd !== null && <div>Taxes: {money(quote.taxesUsd)}</div>}
                              {quote.customsClearanceUsd !== null && <div>Customs clearance: {money(quote.customsClearanceUsd)}</div>}
                              {quote.note && <div style={{ color: '#8b4d30' }}>{quote.note}</div>}
                            </div>)}
                        </div>}
                      </div>)}
                    </div>}
                    <p style={{ color: '#82756d', fontSize: 12, lineHeight: 1.5, marginTop: 12 }}>Before selection, we still need to verify shipping to France, total landed cost, variant sizing accuracy and image rights.</p>
                  </div>}
                </div>
              </article>;
            })}
          </div>
        </div>}
        {results.length === 0 && !busy && !error && <p style={{ color: '#82756d', marginTop: 26, fontSize: 14 }}>Search for dresses when you’re ready. Results will appear here for review before anything is imported.</p>}
        <footer style={{ marginTop: 38, color: '#93867c', fontSize: 12 }}>Davinova · Private sourcing workspace · No supplier purchases can be made here.</footer>
      </div>
    </main>
  );
}
