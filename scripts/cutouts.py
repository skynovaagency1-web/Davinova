"""Pick a flawless photo for every product, cut its background out, and hide products that have none.

Runs in GitHub Actions (the runner can reach the supplier image CDN). Reads the live catalogue and, for each
product, tries its photos in order until one passes the photo check below. Writes public/cutouts/<id>.webp,
public/cutouts/manifest.json (id → cutout, or null when no photo passed; the shop only shows products with a
cutout) and public/cutouts/report.json (which photo was used, or why each one failed).

The photo check rejects: cut-off heads or faces, headless or half-body shots, cut-off hems, collages and
colour grids, extra people (except couple and parent-child sets), and faded cutouts. Jewelry and watches
skip the face rules but must still be one whole, uncropped object.
"""
import io
import json
import os
import re
import sys
import urllib.request

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

CATALOG_URL = os.environ.get('CATALOG_URL', 'https://feature-3d-fashion-storefron.davinova.pages.dev/api/catalog?all=1')
HERO_URL = 'https://images.unsplash.com/photo-1568251188392-ae32f898cb3b?auto=format&fit=crop&w=1400&q=85'
FACE_MODEL = os.path.join(os.path.dirname(__file__), 'models', 'face_detection_yunet_2023mar.onnx')
OUT = 'public/cutouts'
MAX_HEIGHT = 900
GATE_VERSION = 2  # bump to re-check every product after changing the rules
MAX_TRIES = 8
OBJECT_PRODUCT = re.compile(r'\bwrist ?watch|\bwatch(es)?\b|jewel|necklace|earring|bracelet|bangle|pendant|\brings?\b|tiara|crown|hairpin|hair clip|hair comb|headpiece|brooch|anklet', re.I)
GROUP_PRODUCT = 'couple-parent-child-clothing'


def is_ghostly(image):
    """True when the model left mostly see-through pixels (a faded, half-erased product)."""
    alpha = image.getchannel('A').histogram()
    total = image.width * image.height
    solid = sum(alpha[204:]) / total
    semi = sum(alpha[26:204]) / total
    return solid < 0.08 or semi > solid * 0.6


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (davinova cutout bot)'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def find_faces(detector, image: Image.Image):
    """Faces as (x, y, w, h) in image pixels. The photo is padded so a face touching the edge is still found."""
    scale = min(1.0, 1024 / max(image.size))
    small = image.resize((round(image.width * scale), round(image.height * scale))) if scale < 1 else image
    pad = 32
    canvas = cv2.copyMakeBorder(cv2.cvtColor(np.array(small), cv2.COLOR_RGB2BGR), pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    detector.setInputSize((canvas.shape[1], canvas.shape[0]))
    _, found = detector.detect(canvas)
    if found is None:
        return []
    return [((r[0] - pad) / scale, (r[1] - pad) / scale, r[2] / scale, r[3] / scale) for r in found if r[14] >= 0.75]


def people(alpha: np.ndarray) -> int:
    """Separate figures in the cutout: a collage or colour grid shows up as several large islands."""
    count, _, stats, _ = cv2.connectedComponentsWithStats((alpha > 128).astype(np.uint8), connectivity=8)
    areas = sorted(stats[1:, cv2.CC_STAT_AREA], reverse=True)
    return sum(1 for area in areas if area > 0.08 * areas[0]) if areas else 0


def photo_problem(image: Image.Image, cutout: Image.Image, faces, kind: str):
    """Why this photo is not good enough, or None when it is."""
    width, height = image.size
    alpha = np.array(cutout.getchannel('A'))
    rows, cols = np.where(alpha > 128)
    if not len(rows):
        return 'nothing left after removing the background'
    top, bottom, left, right = rows.min(), rows.max(), cols.min(), cols.max()
    if (bottom - top) * (right - left) < 40_000:
        return 'product too small'
    if is_ghostly(cutout.crop((left, top, right + 1, bottom + 1))):
        return 'faded cutout'
    allowed = 4 if kind == 'group' else 1
    if people(alpha) > allowed:
        return 'collage or several figures'
    # The bottom edge: feet may touch it, but a wide band there means the hem was cut off.
    if bottom >= height - 2 and (alpha[height - 1] > 128).sum() > 0.3 * (right - left + 1):
        return 'cut off at the bottom'

    if kind == 'object':
        touching = sum([top <= 1, bottom >= height - 2, left <= 1, right >= width - 2])
        return 'cut off at the edge' if touching >= 2 else None

    if not faces:
        return 'no face (headless or cropped)'
    if len(faces) > allowed:
        return 'several people'
    for x, y, w, h in faces:
        if y < 0.01 * height or x < 1 or x + w > width - 1:
            return 'head cut off by the frame'
    x, y, w, h = max(faces, key=lambda face: face[3])
    ratio = h / max(1, bottom - y)
    if ratio > 0.17:
        return 'half-body shot'
    if ratio < 0.03:
        return 'no real face'
    return None


def finish(cutout: Image.Image) -> Image.Image:
    box = cutout.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if box:
        cutout = cutout.crop(box)
    if cutout.height > MAX_HEIGHT:
        cutout = cutout.resize((round(cutout.width * MAX_HEIGHT / cutout.height), MAX_HEIGHT), Image.LANCZOS)
    return cutout


def kind_of(product) -> str:
    if OBJECT_PRODUCT.search(product.get('title', '')):
        return 'object'
    return 'group' if product.get('storeCollection') == GROUP_PRODUCT else 'person'


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    manifest_path, report_path = os.path.join(OUT, 'manifest.json'), os.path.join(OUT, 'report.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    report = json.load(open(report_path)) if os.path.exists(report_path) else {}
    # Photos the owner's reviewer turned down by eye (back views, props, crowds) stay hidden whatever the check says.
    rejects = set(json.load(open(os.path.join(OUT, 'rejects.json')))) if os.path.exists(os.path.join(OUT, 'rejects.json')) else set()
    products = json.loads(fetch(CATALOG_URL))['products']
    session = new_session(os.environ.get('REMBG_MODEL', 'isnet-general-use'))
    detector = cv2.FaceDetectorYN.create(FACE_MODEL, '', (320, 320), 0.6)

    if not os.path.exists('public/images/hero-model.webp'):
        try:
            finish(remove(Image.open(io.BytesIO(fetch(HERO_URL))).convert('RGB'), session=new_session('birefnet-portrait'))).save('public/images/hero-model.webp', 'WEBP', quality=88, method=6)
        except Exception as error:  # keep going: the site falls back to the framed photo
            print('hero failed', error)

    passed = rejected = 0
    for product in products:
        pid, images = product['id'], product.get('images') or []
        if pid in rejects:
            manifest[pid] = None
            continue
        if report.get(pid, {}).get('v') == GATE_VERSION:
            continue
        kind, reasons, chosen = kind_of(product), [], None
        for index, photo in enumerate(images[:MAX_TRIES]):
            try:
                image = Image.open(io.BytesIO(fetch(photo['url']))).convert('RGB')
                faces = [] if kind == 'object' else find_faces(detector, image)
                # Skip the slow background removal when the faces alone already rule the photo out.
                if kind == 'person' and len(faces) != 1:
                    reasons.append(f'{index}: ' + ('no face (headless or cropped)' if not faces else 'several people'))
                    continue
                cutout = remove(image, session=session)
                problem = photo_problem(image, cutout, faces, kind)
                if problem:
                    reasons.append(f'{index}: {problem}')
                    continue
                chosen = index
                finish(cutout).save(os.path.join(OUT, f'{pid}.webp'), 'WEBP', quality=86, method=6)
                break
            except Exception as error:
                reasons.append(f'{index}: failed {error}')
        if chosen is None:
            manifest[pid] = None
            if os.path.exists(os.path.join(OUT, f'{pid}.webp')):
                os.remove(os.path.join(OUT, f'{pid}.webp'))
            rejected += 1
        else:
            manifest[pid] = f'/cutouts/{pid}.webp'
            passed += 1
        report[pid] = {'v': GATE_VERSION, 'photo': chosen, 'url': images[chosen]['url'] if chosen is not None else None, 'rejected': reasons}
        print(pid, 'photo', chosen, reasons)

    json.dump(manifest, open(manifest_path, 'w'), indent=0, sort_keys=True)
    json.dump(report, open(report_path, 'w'), indent=1, sort_keys=True)
    print(f'passed {passed}, hidden {rejected}, total {len(manifest)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
