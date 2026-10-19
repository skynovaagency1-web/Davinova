/** What the customer sees for each internal order status. */
export const STEPS: Record<string, { step: number; label: string; note: string }> = {
  pending_payment: { step: 0, label: 'Waiting for payment', note: 'We have not received your payment yet.' },
  paid: { step: 1, label: 'Order received', note: 'Your payment is confirmed and we are preparing your order.' },
  pending_approval: { step: 1, label: 'Order received', note: 'Your payment is confirmed and we are preparing your order.' },
  approved: { step: 1, label: 'Order received', note: 'Your payment is confirmed and we are preparing your order.' },
  needs_attention: { step: 1, label: 'Order received', note: 'We are preparing your order. If we need anything, we will email you.' },
  awaiting_manual_order: { step: 2, label: 'Being prepared', note: 'Your order is being prepared at our warehouse.' },
  ordered: { step: 2, label: 'Being prepared', note: 'Your order is being prepared at our warehouse. We email your tracking number as soon as it ships.' },
  shipped: { step: 3, label: 'On its way', note: 'Your order has shipped. Carrier updates can take a day or two to appear.' },
  delivered: { step: 4, label: 'Delivered', note: 'Your order has been delivered. We hope you love it.' },
  cancelled: { step: -1, label: 'Cancelled', note: 'This order was cancelled. If you were charged, the refund is on its way.' },
  rejected: { step: -1, label: 'Cancelled', note: 'This order was cancelled. If you were charged, the refund is on its way.' },
  refunded: { step: -1, label: 'Refunded', note: 'This order was refunded. It can take 5–10 business days to reach your card.' },
};

