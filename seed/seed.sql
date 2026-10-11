INSERT OR IGNORE INTO size_charts (id, name, unit, measurements_json, instructions) VALUES
('size-chart-standard','Davinova standard dress sizing','cm','{"XS":{"bust":80,"waist":62,"hip":88},"S":{"bust":84,"waist":66,"hip":92},"M":{"bust":88,"waist":70,"hip":96},"L":{"bust":94,"waist":76,"hip":102},"XL":{"bust":100,"waist":82,"hip":108},"2XL":{"bust":108,"waist":90,"hip":116},"3XL":{"bust":116,"waist":98,"hip":124},"4XL":{"bust":124,"waist":106,"hip":132}}','Measure bust, waist and hips without pulling the tape tight. [EDIT ME: verify supplier measurements before publishing.]');

INSERT OR IGNORE INTO products (id,slug,title,description,supplier,price_cents,compare_at_cents,cost_cents,currency,occasion,color,length,sleeve,neckline,tags_json,active,featured,popularity) VALUES
('dress-001','rosewater-satin-midi','Rosewater Satin Midi','A fluid satin midi for weddings and candlelit celebrations. [EDIT ME: confirm fabric and care.](placeholder)','cj',8900,11900,3500,'USD','wedding-guest','Blush','Midi','Sleeveless','Cowl neck','["satin","wedding-guest","midi"]',1,1,95),
('dress-002','champagne-one-shoulder','Champagne One-Shoulder','A modern one-shoulder silhouette with an elegant drape. [EDIT ME: verify details.]','cj',9900,12900,3900,'USD','evening','Champagne','Maxi','One shoulder','Asymmetric','["formal","evening","maxi"]',1,1,88),
('dress-003','midnight-floral-wrap','Midnight Floral Wrap','A flattering wrap shape for garden receptions and late-summer events. [EDIT ME: verify print.]','fondmart',7600,9900,2900,'USD','cocktail','Navy','Midi','Short sleeve','V-neck','["floral","wrap","cocktail"]',1,1,76),
('dress-004','black-tie-column','Black Tie Column Dress','A clean, floor-skimming column for formal evenings. [EDIT ME: verify material.]','cj',12900,15900,5200,'USD','evening','Black','Maxi','Sleeveless','Square neck','["formal","black-tie","maxi"]',1,1,71),
('dress-005','sage-pleated-midi','Sage Pleated Midi','Soft pleats and a muted sage tone for daytime celebrations. [EDIT ME: verify.]','fondmart',8200,10500,3200,'USD','wedding-guest','Sage','Midi','Cap sleeve','V-neck','["pleated","daytime","midi"]',1,0,62),
('dress-006','berry-velvet-evening','Berry Velvet Evening Dress','A rich berry tone with a graceful evening silhouette. [EDIT ME: confirm seasonality.]','cj',11500,14500,4600,'USD','evening','Berry','Maxi','Long sleeve','V-neck','["velvet","evening","long-sleeve"]',1,0,54),
('dress-007','powder-blue-chiffon','Powder Blue Chiffon Dress','Light chiffon layers for spring ceremonies and garden parties. [EDIT ME: verify.]','fondmart',7900,9900,3000,'USD','bridesmaid','Powder blue','Maxi','Flutter sleeve','Sweetheart','["chiffon","bridesmaid","spring"]',1,0,49),
('dress-008','terracotta-sculpted-midi','Terracotta Sculpted Midi','A warm terracotta dress with a considered, sculpted shape. [EDIT ME: verify.]','cj',9400,11900,3700,'USD','cocktail','Terracotta','Midi','Short sleeve','Square neck','["cocktail","autumn","midi"]',1,0,43);

INSERT OR IGNORE INTO product_images (id,product_id,url,alt,position,is_primary) VALUES
('img-001','dress-001','/images/placeholder-dress.svg','Rosewater Satin Midi placeholder image',0,1),
('img-002','dress-002','/images/placeholder-dress.svg','Champagne One-Shoulder placeholder image',0,1),
('img-003','dress-003','/images/placeholder-dress.svg','Midnight Floral Wrap placeholder image',0,1),
('img-004','dress-004','/images/placeholder-dress.svg','Black Tie Column Dress placeholder image',0,1),
('img-005','dress-005','/images/placeholder-dress.svg','Sage Pleated Midi placeholder image',0,1),
('img-006','dress-006','/images/placeholder-dress.svg','Berry Velvet Evening Dress placeholder image',0,1),
('img-007','dress-007','/images/placeholder-dress.svg','Powder Blue Chiffon Dress placeholder image',0,1),
('img-008','dress-008','/images/placeholder-dress.svg','Terracotta Sculpted Midi placeholder image',0,1);

INSERT OR IGNORE INTO product_variants (id,product_id,size,color,sku,supplier_variant_id,active) VALUES
('v-001-xs','dress-001','XS','Blush','DAVI-001-XS',NULL,1),('v-001-s','dress-001','S','Blush','DAVI-001-S',NULL,1),('v-001-m','dress-001','M','Blush','DAVI-001-M',NULL,1),('v-001-l','dress-001','L','Blush','DAVI-001-L',NULL,1),('v-001-xl','dress-001','XL','Blush','DAVI-001-XL',NULL,1),('v-001-2xl','dress-001','2XL','Blush','DAVI-001-2XL',NULL,1),('v-001-3xl','dress-001','3XL','Blush','DAVI-001-3XL',NULL,1),('v-001-4xl','dress-001','4XL','Blush','DAVI-001-4XL',NULL,1);

INSERT OR IGNORE INTO settings (key,value_json) VALUES
('auto_approve','false'),('default_markup','2.5'),('shipping_rates','{"standard":0,"express":1800}'),('owner_email','"owner@example.com"'),('dry_run','true');
