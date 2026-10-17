-- Seed exactly one requested CJ dress as a visible, browse-only catalogue item.
-- It has no retail price and its only known variant is inactive with unknown stock.
-- Apply after 0002_cj_primary_sourcing.sql. This does not enable checkout or place orders.
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO products (
  id, slug, title, description, supplier, supplier_product_id, supplier_product_url,
  price_cents, compare_at_cents, cost_cents, currency, occasion, color, length,
  sleeve, neckline, tags_json, active, featured, popularity, catalog_source,
  catalog_source_product_id, catalog_source_url, cj_product_id, supplier_verified,
  collection_category, catalog_source_cost_cents
) VALUES (
  'cj-2607170630321612300',
  'white-lace-boho-tassel-maxi-dress',
  'White Lace Boho Tassel Maxi Dress',
  'A vintage-inspired white lace dress with a V-neckline, three-quarter sleeves and tassel detailing. Stock, precise size mapping, total landed cost, delivery and commercial image rights remain under verification.',
  'cj', NULL, NULL,
  0, NULL, 0, 'USD', 'wedding-guest', 'White', 'Maxi',
  'Three-quarter sleeve', 'V-neck',
  '["lace","boho","tassel","wedding guest","maxi"]',
  1, 1, 0, 'cj',
  '2607170630321612300',
  'https://www.cjdropshipping.com/product/elegant-vintage-womens-boho-tassel-dress-white-lace-v-neck-fringe-sleeve-autumn-fashion-party-dress-wedding-guest-maxi-dresses-p-2607170630321612300.html',
  '2607170630321612300', 0, 'wedding-guest', 1459
);

INSERT OR IGNORE INTO product_images (id, product_id, url, alt, position, is_primary) VALUES
  ('cjimg-2607170630321612300-1', 'cj-2607170630321612300', 'https://cf.cjdropshipping.com/quick/product/65395296-6be3-4937-bce4-1792f605ac0e.jpg', 'Actual CJ supplier product photo; commercial-use rights not yet confirmed', 0, 1),
  ('cjimg-2607170630321612300-2', 'cj-2607170630321612300', 'https://cf.cjdropshipping.com/quick/product/bd50c95d-2246-42f1-998c-f992ab6921a5.jpg', 'Actual CJ supplier product photo 2; commercial-use rights not yet confirmed', 1, 0),
  ('cjimg-2607170630321612300-3', 'cj-2607170630321612300', 'https://cf.cjdropshipping.com/quick/product/82432e0e-68e9-44c9-a2a6-a79b20e1cafa.jpg', 'Actual CJ supplier product photo 3; commercial-use rights not yet confirmed', 2, 0),
  ('cjimg-2607170630321612300-4', 'cj-2607170630321612300', 'https://cf.cjdropshipping.com/quick/product/0b361cbd-8681-4697-b096-49512d86e0c2.jpg', 'Actual CJ supplier product photo 4; commercial-use rights not yet confirmed', 3, 0),
  ('cjimg-2607170630321612300-5', 'cj-2607170630321612300', 'https://cf.cjdropshipping.com/quick/product/0ad48d51-2bf4-4330-8339-295990e1b8f1.jpg', 'Actual CJ supplier product photo 5; commercial-use rights not yet confirmed', 4, 0);

-- The exact White-XS SKU/variant identified earlier is stored for mapping only.
-- It remains inactive and stock is deliberately NULL, so it cannot be purchased.
INSERT OR IGNORE INTO product_variants (
  id, product_id, size, color, sku, supplier_variant_id, active,
  cj_variant_id, cj_sku, available_stock, stock_checked_at
) VALUES (
  'cjvar-260717063021612900',
  'cj-2607170630321612300',
  'XS', 'White', 'CJLY299015901AZ', '260717063021612900', 0,
  '260717063021612900', 'CJLY299015901AZ', NULL, NULL
);
