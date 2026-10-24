"""Contact sheets for picking product photos by eye (see .github/workflows/photo-review.yml)."""
import io, json, os, urllib.request
from PIL import Image, ImageDraw

T = 260
CATALOG_URL = os.environ.get('CATALOG_URL', 'https://feature-3d-fashion-storefron.davinova.pages.dev/api/catalog?all=1')
headers = {'User-Agent': 'Mozilla/5.0'}
products = {p['id']: p for p in json.loads(urllib.request.urlopen(urllib.request.Request(CATALOG_URL, headers=headers), timeout=60).read())['products']}
os.makedirs('review', exist_ok=True)
for pid in json.load(open('scripts/review-photos.json')):
    urls = [image['url'] for image in (products.get(pid) or {}).get('images') or []]
    sheet = Image.new('RGB', (4 * T, 2 * (T + 20)), (235, 225, 210))
    draw = ImageDraw.Draw(sheet)
    for index, url in enumerate(urls[:8]):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30).read()
            image = Image.open(io.BytesIO(data)).convert('RGB')
            image.thumbnail((T - 8, T - 8))
        except Exception as error:
            print(pid, index, error)
            continue
        x, y = (index % 4) * T, (index // 4) * (T + 20)
        sheet.paste(image, (x + 4, y + 4))
        draw.text((x + 6, y + T + 2), str(index), fill=(0, 0, 0))
    sheet.save(f'review/{pid}.jpg', quality=80)
