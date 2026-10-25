-- Welcome offer shown in the signup popup: 10% off, any order.
INSERT OR IGNORE INTO discount_codes (id, code, discount_type, discount_value, minimum_subtotal_cents, active)
VALUES ('welcome10', 'WELCOME10', 'percent', 10, 0, 1);
