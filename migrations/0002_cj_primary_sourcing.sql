-- Keep FondMart records as discovery references; migrate fulfilment to CJ.
ALTER TABLE products ADD COLUMN catalog_source TEXT NOT NULL DEFAULT 'fondmart' CHECK (catalog_source IN ('cj','fondmart'));
ALTER TABLE products ADD COLUMN catalog_source_product_id TEXT;
ALTER TABLE products ADD COLUMN catalog_source_url TEXT;
ALTER TABLE products ADD COLUMN cj_product_id TEXT;
ALTER TABLE products ADD COLUMN supplier_verified INTEGER NOT NULL DEFAULT 0 CHECK (supplier_verified IN (0,1));
ALTER TABLE products ADD COLUMN collection_category TEXT NOT NULL DEFAULT 'unassigned' CHECK (collection_category IN ('wedding-guest','cocktail-party','maxi-holiday','unassigned'));
ALTER TABLE products ADD COLUMN catalog_source_cost_cents INTEGER CHECK (catalog_source_cost_cents IS NULL OR catalog_source_cost_cents >= 0);
UPDATE products SET catalog_source_product_id=supplier_product_id,catalog_source_url=supplier_product_url,catalog_source_cost_cents=cost_cents,supplier_product_id=NULL,supplier_product_url=NULL,cost_cents=0,supplier='cj' WHERE supplier='fondmart';
UPDATE products SET collection_category='wedding-guest' WHERE occasion='wedding-guest';
UPDATE products SET collection_category='cocktail-party' WHERE occasion='cocktail';
ALTER TABLE product_variants ADD COLUMN cj_variant_id TEXT;
ALTER TABLE product_variants ADD COLUMN cj_sku TEXT;
ALTER TABLE product_variants ADD COLUMN available_stock INTEGER CHECK (available_stock IS NULL OR available_stock >= 0);
ALTER TABLE product_variants ADD COLUMN stock_checked_at TEXT;
ALTER TABLE order_items ADD COLUMN cj_product_id TEXT;
ALTER TABLE order_items ADD COLUMN cj_variant_id TEXT;
ALTER TABLE supplier_orders ADD COLUMN cj_order_id TEXT;
ALTER TABLE supplier_orders ADD COLUMN shipment_order_id TEXT;
ALTER TABLE supplier_orders ADD COLUMN cj_pay_id TEXT;
ALTER TABLE supplier_orders ADD COLUMN approved_at TEXT;
ALTER TABLE supplier_orders ADD COLUMN last_synced_at TEXT;
ALTER TABLE supplier_orders ADD COLUMN tracking_email_sent_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_orders_order_supplier_unique ON supplier_orders(order_id,supplier);
CREATE INDEX IF NOT EXISTS idx_cj_variants_lookup ON product_variants(cj_variant_id);
CREATE INDEX IF NOT EXISTS idx_cj_products_lookup ON products(cj_product_id);

-- Treat current FondMart candidates as research-only until a CJ match is verified and manually activated.
UPDATE products SET active=0,supplier_verified=0,cj_product_id=NULL,cost_cents=0
WHERE id IN ('fdm-f00361671','fdm-f00361699','fdm-f00361436','fdm-f00361663','fdm-f00356114','fdm-f00361706','fdm-f00361731','fdm-f00361802');
UPDATE products SET price_cents=CASE id
  WHEN 'fdm-f00361671' THEN 5900
  WHEN 'fdm-f00361699' THEN 6400
  WHEN 'fdm-f00361436' THEN 6200
  WHEN 'fdm-f00361663' THEN 5900
  WHEN 'fdm-f00356114' THEN 6500
  WHEN 'fdm-f00361706' THEN 6900
  WHEN 'fdm-f00361731' THEN 6500
  WHEN 'fdm-f00361802' THEN 5500
  ELSE price_cents END
WHERE id IN ('fdm-f00361671','fdm-f00361699','fdm-f00361436','fdm-f00361663','fdm-f00356114','fdm-f00361706','fdm-f00361731','fdm-f00361802');
