import { useEffect, useState, type FormEvent } from 'react';

interface Item { title: string; size: string; color: string; quantity: number; unit_price_cents: number; unit_cost_cents: number }
interface Order {
  id: string; order_number: string; email: string; status: string; payment_status: string; total_cents: number; currency: string;
  tracking_number: string | null; tracking_url: string | null; created_at: string; test: boolean;
  supplier_status: string | null; supplier_error: string | null;
  address: { name?: string; city?: string; country?: string; countryCode?: string };
  items: Item[];
}

const KEY = 'davinova-admin-password';
const card = { background: '#fffdfb', border: '1px solid #e4d8cf', borderRadius: 12, padding: 16 } as const;
const button = { padding: '10px 16px', border: 0, borderRadius: 999, background: '#292522', color: '#fffaf5', fontWeight: 700, cursor: 'pointer' } as const;
const STATUS: Record<string, string> = {
  pending_payment: 'Not paid yet', pending_approval: 'Waiting for you', ordered: 'Sent to CJ', shipped: 'Shipped',
  delivered: 'Delivered', needs_attention: 'Needs attention', cancelled: 'Cancelled', refunded: 'Refunded', paid: 'Paid',
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
}
function readPassword() { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } }

/** Owner order list: every paid order, with the button that opens the one-time CJ approval review. */
export function OrdersAdminPage() {
  const [password, setPassword] = useState(readPassword);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function load(secret = password) {
    setError('');
    const response = await fetch('/api/admin/orders', { headers: { 'x-admin-password': secret }, cache: 'no-store' });
    const data = await response.json().catch(() => ({})) as { orders?: Order[]; error?: string };
    if (!response.ok) { setOrders(null); setError(response.status === 401 ? 'Admin password was not accepted.' : data.error || 'Could not load orders.'); return; }
    try { sessionStorage.setItem(KEY, secret); } catch { /* storage blocked */ }
    setOrders(data.orders ?? []);
  }
  useEffect(() => { if (password) void load(password); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function review(order: Order) {
    setBusy(order.id); setError('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify({ orderId: order.id }),
      });
      const data = await response.json() as { token?: string; error?: string };
      if (!response.ok || !data.token) throw new Error(data.error || 'Could not open the review.');
      window.location.assign('/approve-cj?token=' + encodeURIComponent(data.token));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not open the review.'); setBusy(''); }
  }

  async function exportSubscribers() {
    setError('');
    const response = await fetch('/api/admin/newsletter', { headers: { 'x-admin-password': password }, cache: 'no-store' });
    if (!response.ok) { setError('Could not download subscribers.'); return; }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(await response.blob());
    link.download = 'davinova-subscribers.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function signIn(event: FormEvent) { event.preventDefault(); void load(); }
  const waiting = orders?.filter((order) => order.status === 'pending_approval').length ?? 0;

  return <main style={{ minHeight: '100vh', background: '#f5f0eb', color: '#292522', padding: '32px 18px 60px', fontFamily: 'DM Sans, Arial, sans-serif' }}>
    <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 16 }}>
      <header>
        <p style={{ letterSpacing: '.16em', textTransform: 'uppercase', fontSize: 11, margin: 0 }}>Davinova · Owner</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, margin: '6px 0' }}>Orders</h1>
        {orders && <p style={{ margin: 0 }}>{waiting ? `${waiting} paid order${waiting > 1 ? 's' : ''} waiting for your approval.` : 'Nothing is waiting for you.'}</p>}
      </header>
      {!orders && <form onSubmit={signIn} style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" autoComplete="current-password"
          style={{ flex: '1 1 220px', padding: '10px 12px', borderRadius: 8, border: '1px solid #d6c7bb' }} />
        <button type="submit" style={button}>Open orders</button>
      </form>}
      {error && <p role="alert" style={{ color: '#a1301b', margin: 0 }}>{error}</p>}
      {orders && <button type="button" onClick={() => void load()} style={{ ...button, justifySelf: 'start', background: '#efe5dc', color: '#292522' }}>Refresh</button>}
      {orders && <button type="button" onClick={() => void exportSubscribers()} style={{ ...button, justifySelf: 'start', background: '#efe5dc', color: '#292522' }}>Download newsletter subscribers (CSV)</button>}
      {orders?.map((order) => {
        const cost = order.items.reduce((sum, item) => sum + item.unit_cost_cents * item.quantity, 0);
        return <article key={order.id} style={{ ...card, display: 'grid', gap: 8, borderColor: order.status === 'pending_approval' ? '#8e735b' : '#e4d8cf' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <strong>{order.order_number}{order.test && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#efe5dc' }}>TEST</span>}</strong>
            <span style={{ fontWeight: 700 }}>{STATUS[order.status] ?? order.status.replaceAll('_', ' ')}</span>
          </div>
          <div style={{ fontSize: 14, opacity: .85 }}>
            {new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleString()} · {order.address.name || order.email} · {[order.address.city, order.address.country].filter(Boolean).join(', ')}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {order.items.map((item, index) => <li key={index}>{item.quantity} × {item.title} ({[item.color, item.size].filter(Boolean).join(', ')})</li>)}
          </ul>
          <div style={{ fontSize: 14 }}>Paid <b>{money(order.total_cents, order.currency)}</b>{cost > 0 && <> · CJ cost about {money(cost, order.currency)} + shipping</>}</div>
          {order.tracking_number && <div style={{ fontSize: 14 }}>Tracking: <b>{order.tracking_number}</b></div>}
          {order.supplier_error && <div style={{ fontSize: 13, color: '#a1301b' }}>{order.supplier_error}</div>}
          {order.status === 'pending_approval' && <button type="button" disabled={busy === order.id} onClick={() => void review(order)} style={{ ...button, justifySelf: 'start' }}>
            {busy === order.id ? 'Opening…' : 'Review and send to CJ'}
          </button>}
        </article>;
      })}
    </div>
  </main>;
}
