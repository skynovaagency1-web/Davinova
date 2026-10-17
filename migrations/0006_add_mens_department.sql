-- Adds Men's formalwear as a product line alongside the existing women's
-- occasionwear catalogue. Department is an orthogonal dimension to occasion/
-- collection_category (a men's suit and a women's dress can both be a
-- "wedding guest" occasion item); it exists mainly so the storefront and CJ
-- importer can keep the two product lines' catalogues and size vocabularies
-- (DressSize vs MensSize, see src/types/product.ts) from colliding.
ALTER TABLE products ADD COLUMN department TEXT NOT NULL DEFAULT 'women' CHECK (department IN ('women','men'));
CREATE INDEX IF NOT EXISTS idx_products_department ON products(department);
