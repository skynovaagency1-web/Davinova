import { ensureOrderTaxColumns } from '../../../server/orderTax';
import { complianceFields, EU_VAT_RATES } from '../../../server/tax';
import { isEuDelivery } from '../../../server/shippingCountries';
import { EUR_PER_USD } from '../../../src/lib/currency';

/**
 * Owner "Tax & URSSAF Reports" (admin password checked by functions/_middleware.ts).
 * GET ?month=YYYY-MM                → JSON summary for the admin page
 * GET ?month=YYYY-MM&type=ioss      → CSV for the monthly IOSS return (VAT collected per EU country)
 * GET ?month=YYYY-MM&type=urssaf    → CSV of turnover without VAT, EU vs outside EU, plus an order audit log
 * Only paid orders count; refunded and cancelled orders are left out. Never includes the IOSS number.
 */

interface Row {
  order_number: string; created_at: string; paid_at: string | null; status: string; currency: string;
  subtotal_cents: number; shipping_cents: number; discount_cents: number; total_cents: number;
  shipping_address_json: string; tracking_number: string | null;
  shipping_country: string | null; eur_exchange_rate: number | null; net_subtotal_eur: number | null;
  shipping_fee_eur: number | null; eu_vat_rate_applied: number | null; eu_vat_collected_eur: number | null;
  total_paid_eur: number | null; ioss_eligible: number | null; gift_cents: number | null;
}

export interface ReportOrder {
  orderNumber: string; paidAt: string; country: string; currency: string; eurRate: number; net: number; shipping: number;
  vatRate: number; vat: number; total: number; iossEligible: boolean; tracking: string; estimated: boolean;
}

const round = (value: number) => Math.round(value * 100) / 100;

function countryOf(row: Row): string {
  if (row.shipping_country) return row.shipping_country.toUpperCase();
  try { return String((JSON.parse(row.shipping_address_json || '{}') as { countryCode?: string }).countryCode || '').toUpperCase(); } catch { return ''; }
}

/** Orders paid before the tax columns existed are filled in from their amounts (rate estimated, flagged in the CSV). */
export function toReportOrder(row: Row): ReportOrder {
  const country = countryOf(row);
  const estimated = row.net_subtotal_eur === null || row.net_subtotal_eur === undefined;
  const tax = estimated
    ? complianceFields({
        currency: row.currency, country, iossEligible: row.ioss_eligible === 1, vatRate: Number(row.eu_vat_rate_applied || 0),
        subtotalCents: row.subtotal_cents, discountCents: row.discount_cents, giftCardCents: Number(row.gift_cents || 0),
        shippingCents: row.shipping_cents, eurRate: row.currency.toUpperCase() === 'EUR' ? 1 : EUR_PER_USD,
      })
    : null;
  return {
    orderNumber: row.order_number, paidAt: row.paid_at || row.created_at, country, currency: row.currency.toUpperCase(),
    eurRate: tax ? tax.eur_exchange_rate : Number(row.eur_exchange_rate || 1),
    net: tax ? tax.net_subtotal_eur : Number(row.net_subtotal_eur),
    shipping: tax ? tax.shipping_fee_eur : Number(row.shipping_fee_eur || 0),
    vatRate: tax ? tax.eu_vat_rate_applied : Number(row.eu_vat_rate_applied || 0),
    vat: tax ? tax.eu_vat_collected_eur : Number(row.eu_vat_collected_eur || 0),
    total: tax ? tax.total_paid_eur : Number(row.total_paid_eur || 0),
    iossEligible: row.ioss_eligible === 1, tracking: row.tracking_number || '', estimated,
  };
}

export function iossSummary(orders: ReportOrder[]) {
  const byCountry = new Map<string, { country: string; rate: number; base: number; vat: number; orders: number }>();
  for (const order of orders.filter((row) => row.iossEligible)) {
    const key = `${order.country}:${order.vatRate}`;
    const entry = byCountry.get(key) ?? { country: order.country, rate: order.vatRate, base: 0, vat: 0, orders: 0 };
    entry.base += order.net + order.shipping;
    entry.vat += order.vat;
    entry.orders += 1;
    byCountry.set(key, entry);
  }
  return [...byCountry.values()].sort((a, b) => a.country.localeCompare(b.country)).map((row) => ({ ...row, base: round(row.base), vat: round(row.vat) }));
}

export function urssafSummary(orders: ReportOrder[]) {
  const sum = (rows: ReportOrder[]) => round(rows.reduce((total, row) => total + row.net + row.shipping, 0));
  const eu = orders.filter((row) => isEuDelivery(row.country));
  const other = orders.filter((row) => !isEuDelivery(row.country));
  return { eu: sum(eu), nonEu: sum(other), total: sum(orders), euOrders: eu.length, nonEuOrders: other.length };
}

function cell(value: string | number): string {
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
const csvLine = (values: Array<string | number>) => values.map(cell).join(',');
const name = (code: string) => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch { return code; } };

function csv(body: string, filename: string): Response {
  return new Response('﻿' + body, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet({ request, env }: { request: Request; env: { DB: D1Database } }): Promise<Response> {
  const url = new URL(request.url);
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return Response.json({ error: 'Choose a month as YYYY-MM.' }, { status: 400 });
  await ensureOrderTaxColumns(env.DB);
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS gift_card_uses ( id TEXT PRIMARY KEY, gift_card_id TEXT NOT NULL, order_id TEXT NOT NULL UNIQUE, amount_cents INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')) )").run();

  const result = await env.DB.prepare(`
    SELECT o.order_number, o.created_at, o.paid_at, o.status, o.currency, o.subtotal_cents, o.shipping_cents, o.discount_cents, o.total_cents,
      o.shipping_address_json, COALESCE(o.tracking_number, (SELECT s.tracking_number FROM supplier_orders s WHERE s.order_id=o.id AND s.tracking_number IS NOT NULL LIMIT 1)) AS tracking_number,
      o.shipping_country, o.eur_exchange_rate, o.net_subtotal_eur, o.shipping_fee_eur, o.eu_vat_rate_applied, o.eu_vat_collected_eur,
      o.total_paid_eur, o.ioss_eligible, (SELECT g.amount_cents FROM gift_card_uses g WHERE g.order_id=o.id) AS gift_cents
    FROM orders o
    WHERE o.payment_status='paid' AND o.status NOT IN ('refunded','cancelled')
      AND substr(COALESCE(o.paid_at, o.created_at), 1, 7)=?
    ORDER BY COALESCE(o.paid_at, o.created_at)
  `).bind(month).all<Row>();
  const orders = (result.results ?? []).map(toReportOrder);
  const type = url.searchParams.get('type');

  if (type === 'ioss') {
    const lines = [csvLine(['Country Code', 'Country Name', 'VAT Rate (%)', 'Total Taxable Base (EUR)', 'Total EU VAT Collected (EUR)'])];
    for (const row of iossSummary(orders)) {
      lines.push(csvLine([row.country, name(row.country), round(row.rate * 100), row.base.toFixed(2), row.vat.toFixed(2)]));
    }
    return csv(lines.join('\n'), `davinova-ioss-${month}.csv`);
  }

  if (type === 'urssaf') {
    const totals = urssafSummary(orders);
    const lines = [
      csvLine(['Davinova turnover (excluding VAT)', month]),
      csvLine(['Zone', 'Orders', 'Turnover excl. VAT (EUR)']),
      csvLine(['EU', totals.euOrders, totals.eu.toFixed(2)]),
      csvLine(['Outside EU', totals.nonEuOrders, totals.nonEu.toFixed(2)]),
      csvLine(['Total', totals.euOrders + totals.nonEuOrders, totals.total.toFixed(2)]),
      '',
      csvLine(['Order', 'Paid at', 'Shipping country', 'Charged currency', 'EUR rate', 'Goods excl. VAT (EUR)', 'Shipping excl. VAT (EUR)', 'VAT rate (%)', 'EU VAT collected (EUR)', 'Total paid (EUR)', 'IOSS', 'Tracking number', 'Note']),
      ...orders.map((row) => csvLine([
        row.orderNumber, row.paidAt, row.country, row.currency, row.eurRate, row.net.toFixed(2), row.shipping.toFixed(2),
        round(row.vatRate * 100), row.vat.toFixed(2), row.total.toFixed(2), row.iossEligible ? 'yes' : 'no', row.tracking,
        row.estimated ? 'Paid before tax records; EUR amount estimated at the shop rate' : '',
      ])),
    ];
    return csv(lines.join('\n'), `davinova-urssaf-${month}.csv`);
  }

  return Response.json(
    { month, orders: orders.length, ioss: iossSummary(orders), urssaf: urssafSummary(orders), rates: EU_VAT_RATES },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
