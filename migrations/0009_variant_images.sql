-- Supplier photo for each variant, so the product page can show the chosen colour.
ALTER TABLE product_variants ADD COLUMN image_url TEXT;
