"""Cut the background out of every product photo (and the hero photo) so they can pop out of their cards.

Runs in GitHub Actions (the runner can reach the supplier image CDN). Reads the live catalogue, writes
public/cutouts/<product id>.webp and public/cutouts/manifest.json, and the hero model to public/images/.
Already-cut products are skipped, so re-runs only process new products.
"""
import io
import json
import os
import sys
import urllib.request

from PIL import Image
from rembg import new_session, remove

CATALOG_URL = os.environ.get('CATALOG_URL', 'https://feature-3d-fashion-storefron.davinova.pages.dev/api/catalog')
HERO_URL = 'https://images.unsplash.com/photo-1568251188392-ae32f898cb3b?auto=format&fit=crop&w=1400&q=85'
OUT = 'public/cutouts'
MAX_HEIGHT = 900


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (davinova cutout bot)'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def cut(session, data: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(data)).convert('RGB')
    result = remove(image, session=session)
    box = result.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if box:
        result = result.crop(box)
    if result.height > MAX_HEIGHT:
        result = result.resize((round(result.width * MAX_HEIGHT / result.height), MAX_HEIGHT), Image.LANCZOS)
    return result


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    products = json.loads(fetch(CATALOG_URL))['products']
    session = new_session(os.environ.get('REMBG_MODEL', 'isnet-general-use'))

    if not os.path.exists('public/images/hero-model.webp'):
        try:
            cut(new_session('birefnet-portrait'), fetch(HERO_URL)).save('public/images/hero-model.webp', 'WEBP', quality=88, method=6)
            print('hero done')
        except Exception as error:  # keep going: the site falls back to the framed photo
            print('hero failed', error)

    done = failed = 0
    for product in products:
        pid, images = product['id'], product.get('images') or []
        if pid in manifest or not images:
            continue
        try:
            result = cut(session, fetch(images[0]['url']))
            # Reject results where almost nothing survived (model failed on the photo).
            if result.getchannel('A').getbbox() is None or result.width * result.height < 40_000:
                raise ValueError('cutout too small')
            name = f"{pid}.webp"
            result.save(os.path.join(OUT, name), 'WEBP', quality=86, method=6)
            manifest[pid] = f"/cutouts/{name}"
            done += 1
        except Exception as error:
            failed += 1
            print('failed', pid, error)
    json.dump(manifest, open(manifest_path, 'w'), indent=0, sort_keys=True)
    print(f'cut {done}, failed {failed}, total {len(manifest)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
