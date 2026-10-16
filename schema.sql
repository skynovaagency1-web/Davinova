PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  supplier TEXT NOT NULL CHECK (supplier IN ('cj','fondmart')), supplier_product_id TEXT, supplier_product_url TEXT,
  catalog_source TEXT NOT NULL DEFAULT 'fondmart' CHECK (catalog_source IN ('cj','fondmart')),
  catalog_source_product_id TEXT, catalog_source_url TEXT, cj_product_id TEXT,
  supplier_verified INTEGER NOT NULL DEFAULT 0 CHECK (supplier_verified IN (0,1)),
  collection_category TEXT NOT NULL DEFAULT 'unassigned' CHECK (collection_category IN ('wedding-guest','cocktail-party','maxi-holiday','unassigned')),
  catalog_source_cost_cents INTEGER CHECK (catalog_source_cost_cents IS NULL OR catalog_source_cost_cents >= 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0), compare_at_cents INTEGER CHECK (compare_at_cents IS NULL OR compare_at_cents >= 0),
  cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0), currency TEXT NOT NULL DEFAULT 'USD',
  occasion TEXT NOT NULL DEFAULT 'wedding-guest', color TEXT NOT NULL DEFAULT 'Blush', length TEXT NOT NULL DEFAULT 'Midi',
  sleeve TEXT NOT NULL DEFAULT 'Sleeveless', neckline TEXT NOT NULL DEFAULT 'V-neck', tags_json TEXT NOT NULL DEFAULT '[]',
  model3d_json TEXT, seo_title TEXT, seo_description TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)), popularity INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, size TEXT NOT NULL, color TEXT NOT NULL,
  sku TEXT UNIQUE, supplier_variant_id TEXT, cj_variant_id TEXT, cj_sku TEXT,
  available_stock INTEGER CHECK (available_stock IS NULL OR available_stock >= 0), stock_checked_at TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), UNIQUE(product_id, size, color)
);
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, url TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL DEFAULT 0, is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1))
);
CREATE TABLE IF NOT EXISTS size_charts (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'cm', measurements_json TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE UNIQUE, first_name TEXT, last_name TEXT, phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, order_number TEXT NOT NULL UNIQUE, customer_id TEXT REFERENCES customers(id),
  email TEXT NOT NULL COLLATE NOCASE, status TEXT NOT NULL CHECK (status IN ('pending_payment','paid','pending_approval','approved','ordered','awaiting_manual_order','shipped','delivered','rejected','refunded','needs_attention','cancelled')),
  payment_provider TEXT CHECK (payment_provider IN ('stripe','paypal')), payment_reference TEXT, payment_status TEXT NOT NULL DEFAULT 'unpaid',
  subtotal_cents INTEGER NOT NULL DEFAULT 0, shipping_cents INTEGER NOT NULL DEFAULT 0, discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD', shipping_address_json TEXT NOT NULL DEFAULT '{}',
  shipping_method TEXT NOT NULL DEFAULT 'standard', tracking_number TEXT, tracking_url TEXT, notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id TEXT REFERENCES products(id),
  variant_id TEXT REFERENCES product_variants(id), cj_product_id TEXT, cj_variant_id TEXT, product_title TEXT NOT NULL,
  sku TEXT, size TEXT NOT NULL, color TEXT NOT NULL, quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0), unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
  supplier TEXT NOT NULL CHECK (supplier IN ('cj','fondmart')), supplier_product_url TEXT
);
CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, event_type TEXT NOT NULL,
  from_status TEXT, to_status TEXT, message TEXT NOT NULL DEFAULT '', metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS supplier_orders (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, supplier TEXT NOT NULL CHECK (supplier IN ('cj','fondmart')),
  supplier_order_id TEXT, cj_order_id TEXT, shipment_order_id TEXT, cj_pay_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', tracking_number TEXT, tracking_url TEXT, error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0, next_retry_at TEXT, approved_at TEXT, last_synced_at TEXT, tracking_email_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(order_id, supplier)
);
CREATE TABLE IF NOT EXISTS discount_codes (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE COLLATE NOCASE, discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0), minimum_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER, uses_count INTEGER NOT NULL DEFAULT 0, starts_at TEXT, expires_at TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, event_type TEXT NOT NULL, processed_at TEXT NOT NULL DEFAULT (datetime('now')), payload_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS newsletter_subscribers (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, consent_at TEXT NOT NULL DEFAULT (datetime('now')), unsubscribed_at TEXT);
CREATE TABLE IF NOT EXISTS contact_messages (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '', message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON products(active, featured);
CREATE INDEX IF NOT EXISTS idx_products_occasion ON products(occasion);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_cj_variants_lookup ON product_variants(cj_variant_id);
CREATE INDEX IF NOT EXISTS idx_cj_products_lookup ON products(cj_product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_events_owner_notified_once ON order_events(order_id) WHERE event_type = 'stripe_owner_approval_notified';
CREATE TABLE IF NOT EXISTS admin_auth_attempts (
  ip TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
