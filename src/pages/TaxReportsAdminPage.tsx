import { useEffect, useState, type FormEvent } from 'react';

interface Summary {
  month: string; orders: number;
  ioss: Array<{ country: string; rate: number; base: number; vat: number; orders: number }>;
  urssaf: { eu: number; nonEu: number; total: number; euOrders: number; nonEuOrders: number };
}

const KEY = 'davinova-admin-password';
const card = { background: '#fffdfb', border: '1px solid #e4d8cf', borderRadius: 12, padding: 16 } as const;
const button = { padding: '10px 16px', border: 0, borderRadius: 999, background: '#292522', color: '#fffaf5', fontWeight: 700, cursor: 'pointer' } as const;
const field = { padding: '10px 12px', borderRadius: 8, border: '1px solid #d6c7bb', background: '#fff' } as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const eur = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
function readPassword() { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } }

/** Owner tax page: monthly IOSS return and URSSAF turnover, each downloadable as CSV. */
export function TaxReportsAdminPage() {
  const now = new Date();
  const [password, setPassword] = useState(readPassword);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const period = `${year}-${String(month).padStart(2, '0')}`;

  async function load(secret = password) {
    setError('');
    const response = await fetch(`/api/admin/tax-reports?month=${period}`, { headers: { 'x-admin-password': secret }, cache: 'no-store' });
    const data = await response.json().catch(() => ({})) as Summary & { error?: string };
    if (!response.ok) { setSummary(null); setError(response.status === 401 ? 'Admin password was not accepted.' : data.error || 'Could not load the report.'); return; }
    try { sessionStorage.setItem(KEY, secret); } catch { /* storage blocked */ }
    setSummary(data);
  }
  useEffect(() => { if (password) void load(password); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  async function download(type: 'ioss' | 'urssaf') {
    setError('');
    const response = await fetch(`/api/admin/tax-reports?month=${period}&type=${type}`, { headers: { 'x-admin-password': password }, cache: 'no-store' });
    if (!response.ok) { setError('Could not download the file.'); return; }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(await response.blob());
    link.download = `davinova-${type}-${period}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function signIn(event: FormEvent) { event.preventDefault(); void load(); }
  const years = Array.from({ length: 4 }, (_, index) => now.getFullYear() - index);

  return <main style={{ minHeight: '100vh', background: '#f5f0eb', color: '#292522', padding: '32px 18px 60px', fontFamily: 'DM Sans, Arial, sans-serif' }}>
    <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 16 }}>
      <header>
        <p style={{ letterSpacing: '.16em', textTransform: 'uppercase', fontSize: 11, margin: 0 }}>Davinova · Owner</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, margin: '6px 0' }}>Tax &amp; URSSAF Reports</h1>
        <p style={{ margin: 0 }}>Paid orders only. Refunded and cancelled orders are left out.</p>
      </header>
      {!summary && <form onSubmit={signIn} style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" autoComplete="current-password" style={{ ...field, flex: '1 1 220px' }} />
        <button type="submit" style={button}>Open reports</button>
      </form>}
      {error && <p role="alert" style={{ color: '#a1301b', margin: 0 }}>{error}</p>}
      {summary && <>
        <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))} aria-label="Month" style={field}>
            {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
          </select>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label="Year" style={field}>
            {years.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <span style={{ opacity: .75 }}>{summary.orders} paid order{summary.orders === 1 ? '' : 's'}</span>
        </div>

        <section style={{ ...card, display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>IOSS return</h2>
          <p style={{ margin: 0, fontSize: 14, opacity: .8 }}>EU orders of €150 or less where VAT was collected at checkout, per country.</p>
          {summary.ioss.length === 0 ? <p style={{ margin: 0 }}>No IOSS sales this month.</p>
            : <table style={{ borderCollapse: 'collapse', fontSize: 14 }}><thead><tr>{['Country', 'VAT rate', 'Taxable base', 'VAT collected'].map((head) => <th key={head} style={{ textAlign: 'left', padding: '4px 8px' }}>{head}</th>)}</tr></thead>
              <tbody>{summary.ioss.map((row) => <tr key={row.country + row.rate}><td style={{ padding: '4px 8px' }}>{row.country}</td><td style={{ padding: '4px 8px' }}>{Math.round(row.rate * 1000) / 10}%</td><td style={{ padding: '4px 8px' }}>{eur(row.base)}</td><td style={{ padding: '4px 8px' }}>{eur(row.vat)}</td></tr>)}</tbody></table>}
          <button type="button" onClick={() => void download('ioss')} style={{ ...button, justifySelf: 'start' }}>Download IOSS CSV</button>
        </section>

        <section style={{ ...card, display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>URSSAF turnover</h2>
          <p style={{ margin: 0, fontSize: 14, opacity: .8 }}>Goods and shipping excluding VAT, in euros.</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span>EU: <strong>{eur(summary.urssaf.eu)}</strong> ({summary.urssaf.euOrders})</span>
            <span>Outside EU: <strong>{eur(summary.urssaf.nonEu)}</strong> ({summary.urssaf.nonEuOrders})</span>
            <span>Total: <strong>{eur(summary.urssaf.total)}</strong></span>
          </div>
          <button type="button" onClick={() => void download('urssaf')} style={{ ...button, justifySelf: 'start' }}>Download URSSAF CSV (with order log)</button>
        </section>
      </>}
    </div>
  </main>;
}
