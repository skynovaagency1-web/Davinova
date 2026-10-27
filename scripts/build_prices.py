"""Price new imports from a CJ check and fast-line report, by the owner's rules, into scripts/price-apply.json.

Rules (owner, 2026-10-24/25): landed = dearest in-stock CJ variant + US shipping (fast line when CJ quotes one);
price = landed x2.5 under $10, x2 for $10-20, x1.6 above, ending .99; then the category minimum (watches $64.99,
bags and shoes $44.99, dresses and suits $48.99, jewelry $28.99, everything else $24.99). Items that land on a
minimum are spread by CJ cost rank up to +45% (endings .49/.99) so the shop doesn't look like a template.
Only in-stock variants are switched on. Usage: python scripts/build_prices.py reports/cj-check-x.json reports/cj-fast-x.json
"""
import json
import math
import re
import sys

SIZE = re.compile(r'^(XXS|XS|S|M|L|XL|XXL|XXXL|[2-6]XL|\d{2}(\.5)?|EU ?\d{2}|US ?\d{1,2}(\.5)?|One ?size|Free ?size)$', re.I)
BAG_OR_SHOE = re.compile(r'bag|backpack|briefcase|wallet|luggage|shoe|boot|sandal|slipper|flats|pumps|loafer|sneaker')


def minimum(row) -> float:
    sub, collection = row.get('sub') or '', row.get('collection') or ''
    if sub.endswith('watches'):
        return 64.99
    if collection == 'jewelry-and-watches':
        return 28.99
    if collection in ('womens-bags', 'womens-shoes') or BAG_OR_SHOE.search(sub):
        return 44.99
    if re.search(r'dress(?!-shirt|-shoe)|suits|tuxedo', sub):
        return 48.99
    return 24.99


def end99(value: float) -> float:
    return math.ceil(value) - 0.01


def label(options: str):
    """'Black-42' -> ('Black / 42', 'Black'); 'Gold' -> ('Gold / One size', 'Gold')."""
    text = re.sub(r'\s+', ' ', options or '').strip()
    for sep in (' / ', '-', ' '):
        if sep in text:
            colour, size = text.rsplit(sep, 1)
            if SIZE.match(size.strip()) and colour.strip():
                return f'{colour.strip()} / {size.strip()}'[:40], colour.strip()[:40]
    return f'{text or "Standard"} / One size'[:40], (text or 'Standard')[:40]


def main() -> int:
    check, fast = json.load(open(sys.argv[1]))['results'], json.load(open(sys.argv[2]))['results']
    quotes = {row['siteId']: row['countries'].get('US') or {} for row in fast}
    priced, variants, skipped = [], [], []
    for row in check:
        stocked = [v for v in row.get('variants') or [] if v.get('costUsd') and (v.get('stock') or 0) > 0]
        quote = quotes.get(row['siteId'], {})
        ship = (quote.get('fast') or quote.get('cheapest') or row.get('shipping') or {}).get('priceUsd')
        if not row.get('ok') or not stocked or ship is None:
            skipped.append(row['siteId'])
            continue
        # One price for every size and colour, so price off the dearest variant switched on (never sell one at a loss).
        cost = max(v['costUsd'] for v in stocked)
        landed = cost + ship
        markup = 2.5 if landed < 10 else 2 if landed <= 20 else 1.6
        price = max(end99(landed * markup), minimum(row))
        priced.append({'id': row['siteId'], 'price': price, 'landed': landed, 'cost': cost, 'min': minimum(row)})
        seen = set()
        for v in stocked:
            text, colour = label(v['options'])
            if text in seen:
                text, colour = (v['options'] or text)[:40], colour
            seen.add(text)
            variants.append([v['id'], text, colour, int(v['stock'])])
    # Spread the ones sitting on a minimum by CJ cost rank, up to +45%.
    for floor in {p['min'] for p in priced}:
        group = sorted([p for p in priced if p['price'] == p['min'] == floor], key=lambda p: p['cost'])
        for rank, p in enumerate(group):
            lift = floor * (1 + 0.45 * rank / max(1, len(group) - 1))
            whole = math.floor(lift)
            p['price'] = whole + (0.49 if lift - whole <= 0.49 else 0.99)
    out = {'run': 0, 'products': [[p['id'], round(p['price'] * 100), round(p['landed'] * 100)] for p in priced], 'variants': variants, 'titles': []}
    try:
        out['run'] = json.load(open('scripts/price-apply.json')).get('run', 0) + 1
    except FileNotFoundError:
        pass
    json.dump(out, open('scripts/price-apply.json', 'w'))
    print(f'priced {len(priced)}, variants {len(variants)}, skipped {len(skipped)} (no stock or shipping): {skipped}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
