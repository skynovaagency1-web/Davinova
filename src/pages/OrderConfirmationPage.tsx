import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCart } from '../store/cart';

export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const clear = useCart((state) => state.clear);
  const sessionId = searchParams.get('session_id') || '';
  const returnedFromStripe = /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId);

  useEffect(() => {
    // The success URL is a customer experience only. The Stripe webhook, not this
    // browser redirect, verifies payment and marks the order paid in D1.
    if (returnedFromStripe) clear();
  }, [clear, returnedFromStripe]);

  return <section className="section not-found">
    <p className="eyebrow">Davinova · Your order</p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      <CheckCircle2 size={25} strokeWidth={1.5} aria-hidden="true" />
      <h1 style={{ margin: 0 }}>{returnedFromStripe ? 'Thank you for your order.' : 'Your order status.'}</h1>
    </div>
    <p>
      {returnedFromStripe
        ? 'You have returned from Stripe Checkout. We are verifying the payment with Stripe and recording your order securely.'
        : 'To protect your order, payment status is confirmed by the secure checkout service, not by this page.'}
    </p>
    <p>
      Supplier fulfilment is not confirmed here. Davinova checks the paid order, product variant, stock and delivery details before the owner approves any CJ supplier order.
    </p>
    <Link className="button button--dark" to="/shop">Return to the collection <ArrowRight size={16} /></Link>
  </section>;
}
