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
  orderItems: Row[] = [];
  orderEvents: Row[] = [];
  webhookEvents = new Map<string, Row>();
  approvals: Row[] = [];
  catalogRows = new Map<string, Row>();
  variantStockWrites: Row[] = [];
  adminAuthAttempts = new Map<string, Row>();

  seedOrder(order: FakeOrder): void {
    this.orders.set(order.id, { ...order });
  }

  seedCatalogRow(productId: string, size: string, row: Row): void {
    this.catalogRows.set(productId + '::' + size.toLowerCase(), { ...row });
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

  async batch<T = unknown>(statements: Array<{ run: () => Promise<T> }>): Promise<T[]> {
    const results: T[] = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
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
      const [id, paymentReference] = args as [string, string | undefined];
      const order = this.orders.get(id);
      const referenceOk = paymentReference === undefined || order?.payment_reference === paymentReference;
      if (order && order.status === 'pending_payment' && referenceOk) {
        order.status = 'cancelled';
        order.payment_status = 'unpaid';
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.startsWith("UPDATE orders SET status='needs_attention', payment_status='paid'")) {
      const [id, paymentReference] = args as [string, string];
      const order = this.orders.get(id);
      if (order && order.payment_reference === paymentReference) {
        order.status = 'needs_attention';
        order.payment_status = 'paid';
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.startsWith("UPDATE orders SET status='needs_attention', updated_at=")) {
      const [id] = args as [string];
      const order = this.orders.get(id);
      if (order) {
        order.status = 'needs_attention';
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    if (sql.startsWith('UPDATE product_variants SET available_stock=?')) {
      const [availableStock, cjVariantId] = args as [number, string];
      this.variantStockWrites.push({ cj_variant_id: cjVariantId, available_stock: availableStock });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith('INSERT INTO orders')) {
      const [id, orderNumber, email, subtotalCents, shippingCents, totalCents, currency] = args as
        [string, string, string, number, number, number, string];
      this.orders.set(id, {
        id, order_number: orderNumber, email, status: 'pending_payment',
        payment_provider: 'stripe', payment_status: 'unpaid', payment_reference: undefined as unknown as string,
        subtotal_cents: subtotalCents, shipping_cents: shippingCents, total_cents: totalCents, currency,
      });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith('INSERT INTO order_items')) {
      const [itemId, orderId, productId] = args as [string, string, string];
      this.orderItems.push({ id: itemId, order_id: orderId, product_id: productId });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith('UPDATE orders SET payment_reference=?')) {
      const [paymentReference, subtotalCents, shippingCents, discountCents, totalCents, currency, id] = args as
        [string, number, number, number, number, string, string];
      const order = this.orders.get(id);
      if (order && order.status === 'pending_payment') {
        order.payment_reference = paymentReference;
        order.subtotal_cents = subtotalCents;
        order.shipping_cents = shippingCents;
        (order as Row).discount_cents = discountCents;
        order.total_cents = totalCents;
        order.currency = currency;
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
    if (sql.startsWith('INSERT INTO admin_auth_attempts')) {
      const [ip, failures, lockedUntil] = args as [string, number, string | null];
      this.adminAuthAttempts.set(ip, { ip, failures, locked_until: lockedUntil, updated_at: new Date().toISOString() });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith('DELETE FROM admin_auth_attempts')) {
      const [ip] = args as [string];
      const existed = this.adminAuthAttempts.delete(ip);
      return { meta: { changes: existed ? 1 : 0 } };
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
    if (sql.startsWith('SELECT status, payment_status FROM orders')) {
      const [paymentReference] = args as [string];
      for (const order of this.orders.values()) {
        if (order.payment_provider === 'stripe' && order.payment_reference === paymentReference) {
          return { status: order.status, payment_status: order.payment_status };
        }
      }
      return null;
    }
    if (sql.startsWith('SELECT id FROM order_events')) {
      const [orderId] = args as [string];
      const eventType = this.extractEventType(sql);
      return this.orderEvents.find((row) => row.order_id === orderId && row.event_type === eventType) ?? null;
    }
    if (sql.startsWith('SELECT p.id AS product_id')) {
      const [productId, size] = args as [string, string];
      return this.catalogRows.get(productId + '::' + String(size).toLowerCase()) ?? null;
    }
    if (sql.startsWith('SELECT locked_until FROM admin_auth_attempts') || sql.startsWith('SELECT failures, locked_until FROM admin_auth_attempts')) {
      const [ip] = args as [string];
      return this.adminAuthAttempts.get(ip) ?? null;
    }
    throw new Error('FakeD1: unhandled query: ' + sql);
  }

  private extractEventType(sql: string): string {
    const match = sql.match(/'(stripe_[a-z_]+)'/);
    if (!match) throw new Error('FakeD1: could not infer event_type from: ' + sql);
    return match[1];
  }
}
