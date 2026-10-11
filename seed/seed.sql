-- Initial public-catalogue import from FondMart, captured 11 October 2026.
-- Wholesale prices are stored in cost_cents; customer prices are drafts using ~2.5x markup.
-- Confirm current supplier prices, exact variants, licensing for product images, shipping costs,
-- taxes, payment fees, and margins before launch. The public listings did not expose verified sizes,
-- so this seed deliberately does not fabricate product_variants.

UPDATE products SET active = 0
WHERE id IN ('dress-001','dress-002','dress-003','dress-004','dress-005','dress-006','dress-007','dress-008');

INSERT OR IGNORE INTO size_charts (id, name, unit, measurements_json, instructions) VALUES
('size-chart-standard','Davinova standard dress sizing','cm','{}','Awaiting verified FondMart size charts; do not use unverified measurements.');

INSERT OR IGNORE INTO products
(id,slug,title,description,supplier,supplier_product_id,supplier_product_url,price_cents,compare_at_cents,cost_cents,currency,occasion,color,length,sleeve,neckline,tags_json,active,featured,popularity)
VALUES
('fdm-f00361671','halter-split-occasion-dress','Halter Split Occasion Dress','A V-neck halter dress with an open back and split detail.','fondmart','F00361671','https://fondmart.com/product/summer-women-clothing-sexy-v-neck-f00361671.html',3193,NULL,1277,'USD','evening','Pink','Not specified','Halter','V-neck','["halter","backless","split","evening"]',1,1,8),
('fdm-f00361699','one-shoulder-ruffled-mesh-dress','One-Shoulder Ruffled Mesh Dress','A one-shoulder dress with cutout details and ruffled mesh.','fondmart','F00361699','https://fondmart.com/product/autumn-winter-hollow-out-cutout-out-f00361699.html',4333,NULL,1733,'USD','cocktail','Light green','Not specified','One shoulder','Asymmetric','["one-shoulder","ruffled","mesh","cocktail"]',1,1,7),
('fdm-f00361436','sleeveless-tied-party-dress','Sleeveless Tied Party Dress','A sleeveless party dress with stitched detailing and a tied finish.','fondmart','F00361436','https://fondmart.com/product/spring-summer-sleeveless-stitching-tied-dress-f00361436.html',4268,NULL,1707,'USD','cocktail','Wine red','Not specified','Sleeveless','Not specified','["sleeveless","tied","party"]',1,1,6),
('fdm-f00361663','shiny-backless-sheath-dress','Shiny Backless Sheath Dress','A sheath shape with a shiny finish, swing collar and open back.','fondmart','F00361663','https://fondmart.com/product/summer-women-sexy-big-backless-dress-f00361663.html',3088,NULL,1235,'USD','cocktail','Brown','Not specified','Not specified','Swing collar','["sheath","backless","shiny","cocktail"]',1,1,5),
('fdm-f00356114','printed-halter-lace-up-dress','Printed Halter Lace-Up Dress','A printed halterneck dress with lace-up detailing.','fondmart','F00356114','https://fondmart.com/product/women-clothing-spring-summer-slim-dress-f00356114.html',5103,NULL,2041,'USD','wedding-guest','Multi-colour','Not specified','Halter','Halterneck','["printed","halter","lace-up"]',1,0,4),
('fdm-f00361706','rhinestone-split-formal-dress','Rhinestone Split Formal Dress','A sleeveless formal dress with rhinestone detailing and a split.','fondmart','F00361706','https://fondmart.com/product/rhinestone-sleeveless-split-formal-dress-women-f00361706.html',6975,NULL,2790,'USD','evening','Apricot','Not specified','Sleeveless','Not specified','["rhinestone","formal","split"]',1,0,3),
('fdm-f00361731','pleated-mesh-fishtail-dress','Pleated Mesh Fishtail Dress','A bandeau-style dress with pleated mesh and a fishtail silhouette.','fondmart','F00361731','https://fondmart.com/product/fashionable-elegant-bandeau-sling-backless-waist-f00361731.html',4388,NULL,1755,'USD','evening','Burgundy','Not specified','Strapless','Bandeau','["pleated","mesh","fishtail","evening"]',1,0,2),
('fdm-f00361802','velvet-lace-hem-mini-dress','Velvet Lace-Hem Mini Dress','A velvet mini dress with a turtleneck and lace hem.','fondmart','F00361802','https://fondmart.com/product/autumn-winter-velvet-turtleneck-lace-hem-f00361802.html',2683,NULL,1073,'USD','cocktail','Navy blue','Mini','Not specified','Turtleneck','["velvet","mini","lace hem"]',1,0,1);

INSERT OR IGNORE INTO product_images (id,product_id,url,alt,position,is_primary) VALUES
('img-fdm-f00361671','fdm-f00361671','https://cbu01.alicdn.com/img/ibank/O1CN014BbzSo1fg5HEShArA_%21%212222539864035-0-cib.jpg_300x300q90.webp','FondMart listing image: Summer Women Clothing Sexy V neck Halter Backless Split Dress',0,1),
('img-fdm-f00361699','fdm-f00361699','https://cbu01.alicdn.com/img/ibank/O1CN01Q6WDL52HoHiJzNPmy_%21%213417629197-0-cib.jpg_300x300q90.webp','FondMart listing image: Autumn Winter Hollow Out Cutout One Shoulder Ruffled Mesh Dress',0,1),
('img-fdm-f00361436','fdm-f00361436','https://cbu01.alicdn.com/img/ibank/O1CN01NDwxny1c2I0tafbyt_%21%212208129443542-0-cib.jpg_300x300q90.webp','FondMart listing image: Spring Summer Sleeveless Stitching Tied Dress Casual Party Women Dress',0,1),
('img-fdm-f00361663','fdm-f00361663','https://cbu01.alicdn.com/img/ibank/O1CN01wYgco91lQPPuo4LX7_%21%212222368114813-0-cib.jpg_300x300q90.webp','FondMart listing image: Summer Women Sexy Big Backless Dress Shiny Surface Sexy Swing Collar Sheath Dress',0,1),
('img-fdm-f00356114','fdm-f00356114','https://cbu01.alicdn.com/img/ibank/O1CN01VLKqwR2C1DErjS2vL_%21%213953378413-0-cib.jpg_300x300q90.webp','FondMart listing image: Women Clothing Spring Summer Slim Dress Halterneck Printed Lace up',0,1),
('img-fdm-f00361706','fdm-f00361706','https://cbu01.alicdn.com/img/ibank/O1CN01wGrQfx2C1DFaWREIV_%21%213953378413-0-cib.jpg_300x300q90.webp','FondMart listing image: Rhinestone Sleeveless Split Formal Dress Women Dress',0,1),
('img-fdm-f00361731','fdm-f00361731','https://cbu01.alicdn.com/img/ibank/O1CN01jljdRJ22o5MBiffuZ_%21%212206542577166-0-cib.jpg_300x300q90.webp','FondMart listing image: Fashionable Elegant Bandeau Sling Backless Waist Trimming Pleated Mesh Fishtail Dress',0,1),
('img-fdm-f00361802','fdm-f00361802','https://cbu01.alicdn.com/img/ibank/O1CN01xPmhPv2BaBqRqNCjL_%21%212201249628354-0-cib.jpg_300x300q90.webp','FondMart listing image: Autumn Winter Velvet Turtleneck Lace Hem Slim Mini Dress',0,1);

-- Supplier variant IDs and sizes are intentionally absent until verified in FondMart.
INSERT OR IGNORE INTO settings (key,value_json) VALUES
('auto_approve','false'),('default_markup','2.5'),('shipping_rates','{"standard":0,"express":1800}'),('owner_email','"owner@example.com"'),('dry_run','true');
