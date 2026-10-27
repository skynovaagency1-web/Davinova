"""Stand every watch upright: dial facing the shopper, strap running straight up and down (owner, 2026-10-27).

The strap is the long axis of a watch's cut-out, so the cut-out is turned until that axis is vertical. Only small
tilts are turned automatically (past 45° the turn could put 12 o'clock at the bottom); bigger turns are set by eye
in public/cutouts/rotate.json ({product id: degrees counter-clockwise}).
Run on its own to straighten the watch cut-outs already on disk: python scripts/watch_upright.py <id> [<id> ...]
"""
import json
import os
import re
import sys

import numpy as np
from PIL import Image

WATCH = re.compile(r'\bwrist ?watch|\bwatch(es)?\b', re.I)
ROTATE_PATH = 'public/cutouts/rotate.json'
MAX_AUTO = 45
MIN_TILT = 6


def is_watch(product) -> bool:
    return (product.get('storeSubcategory') or '').endswith('watches') or bool(WATCH.search(product.get('title', '')))


def tilt(cutout: Image.Image):
    """Degrees to turn counter-clockwise so the long axis stands vertical, or None when the shape has no clear long axis."""
    ys, xs = np.nonzero(np.array(cutout.getchannel('A')) > 128)
    if len(xs) < 1000:
        return None
    values, vectors = np.linalg.eigh(np.cov(np.vstack([xs - xs.mean(), ys - ys.mean()])))
    if values[1] < 1.4 ** 2 * values[0]:  # round, with no strap to go by
        return None
    vx, vy = vectors[:, 1]
    angle = np.degrees(np.arctan2(vx, vy))
    angle = (angle + 90) % 180 - 90
    return -float(angle)


def upright(cutout: Image.Image, pid: str, rotations=None) -> Image.Image:
    rotations = rotations if rotations is not None else (json.load(open(ROTATE_PATH)) if os.path.exists(ROTATE_PATH) else {})
    angle = rotations.get(pid)
    if angle is None:
        angle = tilt(cutout)
        if angle is None or abs(angle) < MIN_TILT or abs(angle) > MAX_AUTO:
            return cutout
    return cutout.rotate(angle, expand=True, resample=Image.BICUBIC)


def crop(cutout: Image.Image) -> Image.Image:
    box = cutout.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return cutout.crop(box) if box else cutout


if __name__ == '__main__':
    manifest = json.load(open('public/cutouts/manifest.json'))
    for pid in sys.argv[1:]:
        path = 'public' + manifest[pid]
        image = Image.open(path).convert('RGBA')
        turned = upright(image, pid)
        if turned is not image:
            crop(turned).save(path, 'WEBP', quality=86, method=6)
            print(pid, 'straightened')
