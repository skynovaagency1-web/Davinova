"""Numbered contact sheets of loose photo URLs (scripts/review-urls.json: [[label, url], ...]), e.g. CJ products not imported yet."""
import io, json, os, urllib.request
from PIL import Image, ImageDraw

T, COLS, ROWS = 240, 6, 5
headers = {'User-Agent': 'Mozilla/5.0'}
items = json.load(open('scripts/review-urls.json'))
os.makedirs('review', exist_ok=True)
for page in range(0, len(items), COLS * ROWS):
    chunk = items[page:page + COLS * ROWS]
    sheet = Image.new('RGB', (COLS * T, ((len(chunk) + COLS - 1) // COLS) * (T + 20)), (235, 225, 210))
    draw = ImageDraw.Draw(sheet)
    for index, (label, url) in enumerate(chunk):
        x, y = (index % COLS) * T, (index // COLS) * (T + 20)
        try:
            image = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30).read())).convert('RGB')
            image.thumbnail((T - 8, T - 8))
            sheet.paste(image, (x + 4, y + 4))
        except Exception as error:
            print(label, error)
        draw.text((x + 6, y + T + 2), label, fill=(0, 0, 0))
    sheet.save(f'review/urls-{page // (COLS * ROWS)}.jpg', quality=82)
