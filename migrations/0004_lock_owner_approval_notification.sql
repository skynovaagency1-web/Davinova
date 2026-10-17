-- Two Stripe webhook deliveries with different event IDs (e.g. checkout.session.completed
-- and checkout.session.async_payment_succeeded) can report the same paid order. Without a
-- DB-level lock, both can pass a read-then-write "already notified?" check concurrently and
-- send two separate one-time owner-approval emails/tokens for the same order. This partial
-- unique index lets the webhook handler claim the notification atomically via
-- INSERT OR IGNORE, the same pattern already used for webhook_events.
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_events_owner_notified_once
  ON order_events(order_id)
  WHERE event_type = 'stripe_owner_approval_notified';
