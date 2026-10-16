/**
 * A minimal, hand-written stand-in for D1Database that understands exactly the
 * statements functions/api/webhooks/stripe.ts (and server/auth.ts) issue. It is not
 * a SQL engine: each statement is matched by a distinctive substring and interpreted
 * directly against in-memory tables, including the partial-unique-index behaviour
 * added in migrations/0004_lock_owner_approval_notification.sql, so tests can
 * exercise the real concurrency semantics without a network-backed D1 instance.
 */

type Row = Record<string, unknown>;

export interface FakeOrder extends Row {
  id: string;
  order_number: string;
  email: string;
  status: string;
  payment_provider: string;
  payment_status: string;
  payment_reference: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  currency: string;
}

export class FakeD1 {
  orders = new Map<string, FakeOrder>();
  orderEvents: Row[] = [];
  webhookEvents = new Map<string, Row>();
  approvals: Row[] = [];

  seedOrder(order: FakeOrder): void {
    this.orders.set(order.id, { ...order });
  }

  prepare(sql: string) {
    const statement = sql.replace(/\s+/g, ' ').trim();
    return {
      bind: (...args: unknown[]) => ({
        run: async () => this.exec(statement, args),
        first: async <T>() => this.queryFirst(statement, args) as T | null,
      }),
    };
  }

  private exec(sql: string, args: unknown[]): { meta: { changes: number } } {
    if (sql.startsWith('INSERT OR IGNORE INTO webhook_events')) {
      const [id, payloadJson] = args as [string, string];
      if (this.webhookEvents.has(id)) return { meta: { changes: 0 } };
      this.webhookEvents.set(id, {
        id, provider: 'stripe', event_type: 'processing',
        processed_at: new Date().toISOString(), payload_json: payloadJson,
      });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith("UPDATE webhook_events SET processed_at=datetime('now'), payload_json=?")) {
      const [payloadJson, id, expectedProcessedAt] = args as [string, string, string];
      const row = this.webhookEvents.get(id);
      const cutoff = Date.now() - 5 * 60 * 1000;
      if (
        row && row.event_type === 'processing' && row.processed_at === expectedProcessedAt &&
        new Date(String(row.processed_at)).getTime() < cutoff
      ) {
        row.processed_at = new Date().toISOString();
        row.payload_json = payloadJson;
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.startsWith('DELETE FROM webhook_events')) {
      const [id, payloadJson] = args as [string, string];
      const row = this.webhookEvents.get(id);
      if (row && row.event_type === 'processing' && row.payload_json === payloadJson) {
        this.webhookEvents.delete(id);
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.startsWith('UPDATE webhook_events SET event_type=?')) {
      const [eventType, payloadJson, id, claimPayload] = args as [string, string, string, string];
      const row = this.webhookEvents.get(id);
      if (row && row.event_type === 'processing' && row.payload_json === claimPayload) {
        row.event_type = eventType;
        row.payload_json = payloadJson;
        row.processed_at = new Date().toISOString();
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.startsWith("UPDATE orders SET status='cancelled'")) {
      const [id, paymentReference] = args as [string, string];
      const order = this.orders.get(id);
      if (order && order.status === 'pending_payment' && order.payment_reference === paymentReference) {
        order.status = 'cancelled';
        order.payment_status = 'unpaid';
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.startsWith("UPDATE orders SET status='needs_attention'")) {
      const [id, paymentReference] = args as [string, string];
      const order = this.orders.get(id);
      if (order && order.payment_reference === paymentReference) {
        order.status = 'needs_attention';
        order.payment_status = 'paid';
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.startsWith("UPDATE orders SET status='pending_approval'")) {
      const [email, shippingAddressJson, id, paymentReference] = args as [string, string, string, string];
      const order = this.orders.get(id);
      if (order && order.status === 'pending_payment' && order.payment_reference === paymentReference) {
        order.status = 'pending_approval';
        order.payment_status = 'paid';
        order.email = email;
        order.shipping_address_json = shippingAddressJson;
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.startsWith('INSERT OR IGNORE INTO order_events')) {
      const eventType = this.extractEventType(sql);
      const [id, orderId] = args as [string, string];
      if (eventType === 'stripe_owner_approval_notified') {
        const exists = this.orderEvents.some((row) => row.order_id === orderId && row.event_type === eventType);
        if (exists) return { meta: { changes: 0 } };
      }
      this.orderEvents.push({ id, order_id: orderId, event_type: eventType });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith('INSERT INTO order_events')) {
      const eventType = this.extractEventType(sql);
      const [id, orderId] = args as [string, string];
      this.orderEvents.push({ id, order_id: orderId, event_type: eventType });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith('UPDATE order_events SET')) {
      const [metadataJson, orderId] = args as [string, string];
      const eventType = this.extractEventType(sql);
      const row = this.orderEvents.find((candidate) => candidate.order_id === orderId && candidate.event_type === eventType);
      if (row) row.metadata_json = metadataJson;
      return { meta: { changes: row ? 1 : 0 } };
    }
    if (sql.startsWith('DELETE FROM order_events')) {
      const [orderId] = args as [string];
      const eventType = this.extractEventType(sql);
      const before = this.orderEvents.length;
      this.orderEvents = this.orderEvents.filter((row) => !(row.order_id === orderId && row.event_type === eventType));
      return { meta: { changes: before - this.orderEvents.length } };
    }
    if (sql.startsWith('INSERT INTO approvals')) {
      const [id, orderId, tokenHash, expiresAt] = args as [string, string, string, string];
      this.approvals.push({ id, order_id: orderId, token_hash: tokenHash, expires_at: expiresAt, used_at: null });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith('UPDATE approvals SET used_at=')) {
      const [orderId] = args as [string];
      let changes = 0;
      for (const approval of this.approvals) {
        if (approval.order_id === orderId && approval.used_at === null) {
          approval.used_at = new Date().toISOString();
          changes++;
        }
      }
      return { meta: { changes } };
    }
    throw new Error('FakeD1: unhandled statement: ' + sql);
  }

  private queryFirst(sql: string, args: unknown[]): Row | null {
    if (sql.startsWith('SELECT event_type, processed_at FROM webhook_events')) {
      const [id] = args as [string];
      return this.webhookEvents.get(id) ?? null;
    }
    if (sql.startsWith('SELECT id, order_number, email, status, payment_provider')) {
      const [id] = args as [string];
      return this.orders.get(id) ?? null;
    }
    if (sql.startsWith('SELECT id FROM order_events')) {
      const [orderId] = args as [string];
      const eventType = this.extractEventType(sql);
      return this.orderEvents.find((row) => row.order_id === orderId && row.event_type === eventType) ?? null;
    }
    throw new Error('FakeD1: unhandled query: ' + sql);
  }

  private extractEventType(sql: string): string {
    const match = sql.match(/'(stripe_[a-z_]+)'/);
    if (!match) throw new Error('FakeD1: could not infer event_type from: ' + sql);
    return match[1];
  }
}
