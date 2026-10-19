import { useState, type FormEvent } from 'react';

type Result = {
  orderNumber: string; placedAt: string; step: number; label: string; note: string; country: string;
  trackingNumber: string | null; trackingUrl: string | null;
  items: { title: string; size: string; color: string; quantity: number }[];
};

const STEPS = ['Order received', 'Being prepared', 'On its way', 'Delivered'];

function safeUrl(value: string | null): string | null {
  return value && /^https:\/\//i.test(value) ? value : null;
}

/** Order lookup with the order number and checkout email. */
export function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ orderNumber, email }),
      });
      const data = await response.json() as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || 'We could not look up that order.');
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not look up that order.');
    } finally { setBusy(false); }
  }

  const link = safeUrl(result?.trackingUrl ?? null);
  return <>
    <form className="track__form" onSubmit={submit}>
      <label><span>Order number</span><input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="DV-…" autoComplete="off" required maxLength={30} /></label>
      <label><span>Email used at checkout</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={200} /></label>
      <button type="submit" disabled={busy}>{busy ? 'Looking…' : 'Track order'}</button>
    </form>
    {error && <p className="track__error" role="alert">{error}</p>}
    {result && <div className="track__result" role="status">
      <p className="help__big">{result.label}</p>
      <p>{result.note}</p>
      {result.step >= 0 && <ol className="track__steps">
        {STEPS.map((step, index) => <li key={step} className={index + 1 <= result.step ? 'done' : ''}>{step}</li>)}
      </ol>}
      {result.trackingNumber && <p>Tracking number: <b>{result.trackingNumber}</b>{link && <> · <a href={link} target="_blank" rel="noreferrer">Follow your parcel</a></>}</p>}
      <h2>Order {result.orderNumber}</h2>
      <ul>{result.items.map((item, index) => <li key={index}>{item.quantity} × {item.title}{[item.color, item.size].filter(Boolean).length ? ` (${[item.color, item.size].filter(Boolean).join(', ')})` : ''}</li>)}</ul>
      <p className="help__note">Placed {new Date(result.placedAt.replace(' ', 'T') + 'Z').toLocaleDateString()}{result.country ? ` · shipping to ${result.country}` : ''}</p>
    </div>}
  </>;
}
