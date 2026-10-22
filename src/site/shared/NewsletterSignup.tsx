import { useState, type FormEvent } from 'react';

/** Footer newsletter sign-up for both shops. */
export function NewsletterSignup({ dept }: { dept: 'women' | 'men' }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('busy'); setError('');
    try {
      const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, dept }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not sign you up. Please try again.');
      setState('done');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign you up. Please try again.');
      setState('idle');
    }
  }

  return <div className="news">
    <div className="news__text">
      <strong>{dept === 'men' ? 'First look at new formalwear' : 'First look at new arrivals'}</strong>
      <span>Occasion edits and private offers. No spam, unsubscribe anytime.</span>
    </div>
    {state === 'done'
      ? <p className="news__done" role="status">You're on the list. Check your inbox.</p>
      : <form className="news__form" onSubmit={submit}>
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email" aria-label="Your email" autoComplete="email" />
        <button type="submit" disabled={state === 'busy'}>{state === 'busy' ? 'Joining…' : 'Join'}</button>
      </form>}
    {error && <p className="news__error" role="alert">{error}</p>}
  </div>;
}
