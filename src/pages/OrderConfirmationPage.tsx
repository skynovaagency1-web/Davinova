import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCart } from '../store/cart';

type PaymentState = 'checking' | 'paid' | 'failed' | 'unverified';

export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const clear = useCart((state) => state.clear);
  const sessionId = searchParams.get('session_id') || '';
  const returnedFromStripe = /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId);
  const [paymentState, setPaymentState] = useState<PaymentState>('checking');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    if (!returnedFromStripe) {
      setPaymentState('unverified');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timeoutId: number | undefined;

    const checkPayment = async () => {
      attempts += 1;
      try {
        const response = await fetch('/api/order-status?session_id=' + encodeURIComponent(sessionId), {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const result = await response.json() as { state?: string; orderNumber?: string };
        if (cancelled) return;

        if (response.ok && result.state === 'paid') {
          // Do not clear the customer's bag until the server reports a paid order.
          clear();
          setOrderNumber(result.orderNumber || '');
          setPaymentState('paid');
          return;
        }
        if (response.ok && result.state === 'failed') {
          setPaymentState('failed');
          return;
        }
      } catch {
        // A temporary status-check error must not delete the customer's bag.
      }

      if (attempts < 12) {
        timeoutId = window.setTimeout(checkPayment, 1500);
      } else {
        setPaymentState('unverified');
      }
    };

    void checkPayment();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [clear, returnedFromStripe, sessionId]);

  const heading = paymentState === 'paid'
    ? 'Thank you for your order.'
    : paymentState === 'failed'
      ? 'Payment was not completed.'
      : paymentState === 'unverified'
        ? 'Your order status.'
        : 'Checking your payment…';

  const message = paymentState === 'paid'
    ? 'Your payment is confirmed and we are preparing your order. We email your tracking number as soon as it ships.'
    : paymentState === 'failed'
      ? 'Stripe reports that the payment did not complete. Your bag has been kept so you can try again.'
      : paymentState === 'unverified'
        ? 'We could not confirm the payment status yet. Your bag has been kept. Refresh this page later to check again.'
        : 'We are checking the stored order status. Your bag will remain intact until payment is confirmed.';

  return <section className="section not-found">
    <p className="eyebrow">Davinova · Your order</p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      <CheckCircle2 size={25} strokeWidth={1.5} aria-hidden="true" />
      <h1 style={{ margin: 0 }}>{heading}</h1>
    </div>
    <p>{message}</p>
    {orderNumber && <p>Your order number is <strong>{orderNumber}</strong>. Keep it to <Link to="/track">track your order</Link> with the email you used.</p>}
    <Link className="button button--dark" to={paymentState === 'paid' ? '/shop' : '/cart'}>
      {paymentState === 'paid' ? 'Return to the collection' : 'Return to your bag'} <ArrowRight size={16} />
    </Link>
  </section>;
}
