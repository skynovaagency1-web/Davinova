"""Pick a flawless photo for every product, cut its background out, and hide products that have none.

Runs in GitHub Actions (the runner can reach the supplier image CDN). Reads the live catalogue and, for each
product, tries its photos in order until one passes the photo check below. Writes public/cutouts/<id>.webp,
public/cutouts/manifest.json (id → cutout, or null when no photo passed; the shop only shows products with a
cutout) and public/cutouts/report.json (which photo was used, or why each one failed).

The photo check rejects: cut-off heads or faces, headless or half-body shots, cut-off hems, collages and
colour grids, extra people (except couple and parent-child sets), and faded cutouts. Jewelry and watches
skip the face rules but must still be one whole, uncropped object. Clothing with no good model photo is shown
as a floating garment instead (public/cutouts/<id>.float.webp): a clothing model erases the head, skin and props.
"""
import io
import json
import os
import re
import sys
import time
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
GATE_VERSION = 3  # bump to re-check every product after changing the rules
FLOAT_FROM = 2  # results from before floating clothes existed: passes stay, failed clothing gets a floating try
FLOAT_TRIES = 3
LIMIT = int(os.environ.get('LIMIT', '300'))  # products checked per run
# Stop in time to commit: the job is killed at 180 minutes and everything unsaved is lost.
TIME_BUDGET = int(os.environ.get('TIME_BUDGET_MIN', '140')) * 60
MAX_TRIES = 8
OBJECT_PRODUCT = re.compile(r'\bwrist ?watch|\bwatch(es)?\b|jewel|necklace|earring|bracelet|bangle|pendant|\brings?\b|tiara|crown|hairpin|hair clip|hair comb|headpiece|brooch|anklet', re.I)
GROUP_PRODUCT = 'couple-parent-child-clothing'
JEWELRY_COLLECTION = 'jewelry-and-watches'
# Ties, shoes, belts, hats and bags are shown on their own, like jewelry.
# Beauty products (bottles, jars, tools, hair) are objects too: never cut them with the clothing model.
BEAUTY_COLLECTIONS = {'nail-art-and-tools', 'food-and-health', 'hair-and-accessories', 'skin-care', 'hair-weaves', 'makeup', 'beauty-tools'}
OBJECT_COLLECTIONS = {JEWELRY_COLLECTION, 'mens-accessories', 'womens-bags', 'womens-shoes', *BEAUTY_COLLECTIONS}


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


def ghost(image: Image.Image, cutout: Image.Image, session):
    """Keep only the clothes: erase the model's head, skin, hair, bags and shoes. Returns (garment, problem)."""
    clothes = np.array(remove(image, session=session, cc='attire', only_mask=True))
    mask = (np.minimum(clothes, np.array(cutout.getchannel('A'))) > 128).astype(np.uint8)
    size = max(3, int(0.012 * max(mask.shape))) | 1
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((size, size), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if count < 2:
        return None, 'no clothes found'
    areas = stats[1:, cv2.CC_STAT_AREA]
    mask = np.isin(labels, [i + 1 for i, area in enumerate(areas) if area > 0.4 * areas.max()]).astype(np.uint8)
    # A hand or bag held over the clothes leaves a hole; a garment with a big hole isn't shown.
    filled = mask.copy()
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(filled, contours, -1, 1, cv2.FILLED)
    if (filled.sum() - mask.sum()) > 0.03 * filled.sum():
        return None, 'clothes covered by a hand or bag'
    rows, cols = np.where(mask)
    if rows.min() <= 1 or cols.min() <= 1 or cols.max() >= mask.shape[1] - 2:
        return None, 'clothes cut off at the edge'
    garment = cutout.copy()
    garment.putalpha(Image.fromarray(cv2.GaussianBlur(mask * 255, (0, 0), 1.2)))
    return garment, None


def finish(cutout: Image.Image) -> Image.Image:
    box = cutout.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if box:
        cutout = cutout.crop(box)
    if cutout.height > MAX_HEIGHT:
        cutout = cutout.resize((round(cutout.width * MAX_HEIGHT / cutout.height), MAX_HEIGHT), Image.LANCZOS)
    return cutout


def kind_of(product) -> str:
    if product.get('storeCollection') in OBJECT_COLLECTIONS or OBJECT_PRODUCT.search(product.get('title', '')):
        return 'object'
    return 'group' if product.get('storeCollection') == GROUP_PRODUCT else 'person'


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    manifest_path, report_path = os.path.join(OUT, 'manifest.json'), os.path.join(OUT, 'report.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    report = json.load(open(report_path)) if os.path.exists(report_path) else {}
    # Photos the owner's reviewer turned down by eye (back views, props, crowds) stay hidden whatever the check says.
    rejects = set(json.load(open(os.path.join(OUT, 'rejects.json')))) if os.path.exists(os.path.join(OUT, 'rejects.json')) else set()
    # Photos picked by eye for products whose automatic pick was a text-heavy ad ({id: photo number}).
    picks = json.load(open(os.path.join(OUT, 'picks.json'))) if os.path.exists(os.path.join(OUT, 'picks.json')) else {}
    started = time.time()
    products = json.loads(fetch(CATALOG_URL))['products']
    # Beauty first: the owner is waiting on those re-cuts.
    products.sort(key=lambda product: product.get('storeCollection') not in BEAUTY_COLLECTIONS)
    session = new_session(os.environ.get('REMBG_MODEL', 'isnet-general-use'))
    detector = cv2.FaceDetectorYN.create(FACE_MODEL, '', (320, 320), 0.6)
    cloth_session = None
    fallback_session = None
    # Objects get the sharper BiRefNet model, so caps, pumps and clear plastic parts stay attached.
    object_session = new_session('birefnet-general-lite')

    if not os.path.exists('public/images/hero-model.webp'):
        try:
            finish(remove(Image.open(io.BytesIO(fetch(HERO_URL))).convert('RGB'), session=new_session('birefnet-portrait'))).save('public/images/hero-model.webp', 'WEBP', quality=88, method=6)
        except Exception as error:  # keep going: the site falls back to the framed photo
            print('hero failed', error)

    passed = rejected = done = 0
    for product in products:
        pid, images = product['id'], product.get('images') or []
        if pid in rejects:
            manifest[pid] = None
            continue
        kind, reasons, chosen, floating = kind_of(product), [], None, False
        old = report.get(pid, {})
        # An object cut with the clothing model (beauty before 2026-10-24) lost parts of itself: cut it again.
        recut = kind == 'object' and (old.get('floating') or (product.get('storeCollection') in BEAUTY_COLLECTIONS and old.get('photo') is None and old.get('fix') != 1))
        pick = picks.get(pid)
        repick = pick is not None and old.get('pick') != pick and pick < len(images)
        if not recut and not repick and (old.get('v') == GATE_VERSION or (old.get('v') == FLOAT_FROM and (old.get('photo') is not None or kind != 'person'))):
            continue
        if done >= LIMIT or time.time() - started > TIME_BUDGET:
            done = max(done, LIMIT)
            continue
        done += 1
        # Clothing photos already checked under the previous rules failed on the model; only the floating cut is new.
        model_photos = [] if repick or (kind == 'person' and old.get('v') == FLOAT_FROM) else images[:MAX_TRIES]
        # Photos the owner's reviewer turned down by eye are never picked again ('skip' in the report).
        skip = set(old.get('skip', []))
        for index, photo in enumerate(model_photos):
            if photo['url'] in skip:
                reasons.append(f'{index}: turned down by eye')
                continue
            try:
                image = Image.open(io.BytesIO(fetch(photo['url']))).convert('RGB')
                faces = [] if kind == 'object' else find_faces(detector, image)
                # Skip the slow background removal when the faces alone already rule the photo out.
                if kind == 'person' and len(faces) != 1:
                    reasons.append(f'{index}: ' + ('no face (headless or cropped)' if not faces else 'several people'))
                    continue
                cutout = remove(image, session=object_session if kind == 'object' else session)
                problem = photo_problem(image, cutout, faces, kind)
                if problem:
                    reasons.append(f'{index}: {problem}')
                    continue
                chosen = index
                finish(cutout).save(os.path.join(OUT, f'{pid}.webp'), 'WEBP', quality=86, method=6)
                break
            except Exception as error:
                reasons.append(f'{index}: failed {error}')
        if repick:
            try:
                image = Image.open(io.BytesIO(fetch(images[pick]['url']))).convert('RGB')
                finish(remove(image, session=object_session if kind == 'object' else session)).save(os.path.join(OUT, f'{pid}.webp'), 'WEBP', quality=86, method=6)
                chosen = pick
            except Exception as error:
                reasons.append(f'{pick}: failed {error}')
        if chosen is None and not repick and kind == 'object' and product.get('storeCollection') in BEAUTY_COLLECTIONS:
            # Owner (2026-10-24): fix broken beauty cut-outs, never hide them. Try every photo with the second
            # remover too, then keep the cleanest cut even if it touches the frame (bottles are often shot edge to edge).
            fallback_session = fallback_session or new_session('isnet-general-use')
            best = None
            for index, photo in enumerate(images[:MAX_TRIES]):
                if photo['url'] in skip:
                    continue
                try:
                    image = Image.open(io.BytesIO(fetch(photo['url']))).convert('RGB')
                    for sess in (object_session, fallback_session):
                        cutout = remove(image, session=sess)
                        problem = photo_problem(image, cutout, [], kind)
                        if problem is None:
                            best = (0, index, cutout)
                            break
                        if problem in ('cut off at the edge', 'cut off at the bottom', 'product too small'):
                            area = int((np.array(cutout.getchannel('A')) > 128).sum())
                            if best is None or (best[0] and area > best[0]):
                                best = (area, index, cutout)
                    if best and best[0] == 0:
                        break
                except Exception as error:
                    reasons.append(f'{index}: failed {error}')
            if best:
                chosen = best[1]
                finish(best[2]).save(os.path.join(OUT, f'{pid}.webp'), 'WEBP', quality=86, method=6)
        if chosen is None and not repick and kind == 'person':
            # No photo works on the model: show the clothes floating on their own instead.
            cloth_session = cloth_session or new_session('u2net_cloth_seg')
            for index, photo in enumerate(images[:FLOAT_TRIES]):
                if photo['url'] in skip:
                    continue
                try:
                    image = Image.open(io.BytesIO(fetch(photo['url']))).convert('RGB')
                    garment, problem = ghost(image, remove(image, session=session), cloth_session)
                    problem = problem or photo_problem(image, garment, [], 'object')
                    if problem:
                        reasons.append(f'floating {index}: {problem}')
                        continue
                    chosen, floating = index, True
                    finish(garment).save(os.path.join(OUT, f'{pid}.float.webp'), 'WEBP', quality=86, method=6)
                    break
                except Exception as error:
                    reasons.append(f'floating {index}: failed {error}')
        for name in (f'{pid}.webp', f'{pid}.float.webp'):
            kept = chosen is not None and name == (f'{pid}.float.webp' if floating else f'{pid}.webp')
            if not kept and os.path.exists(os.path.join(OUT, name)):
                os.remove(os.path.join(OUT, name))
        if chosen is None:
            manifest[pid] = None
            rejected += 1
        else:
            manifest[pid] = f'/cutouts/{pid}.float.webp' if floating else f'/cutouts/{pid}.webp'
            passed += 1
        report[pid] = {'fix': 1, 'v': GATE_VERSION, 'skip': sorted(skip), 'photo': chosen, 'floating': floating, 'url': images[chosen]['url'] if chosen is not None else None, 'rejected': reasons, **({'pick': pick} if repick and chosen is not None else {})}
        print(pid, 'floating' if floating else 'photo', chosen, reasons)

    json.dump(manifest, open(manifest_path, 'w'), indent=0, sort_keys=True)
    json.dump(report, open(report_path, 'w'), indent=1, sort_keys=True)
    print(f'passed {passed}, hidden {rejected}, total {len(manifest)}, limit reached: {done >= LIMIT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
