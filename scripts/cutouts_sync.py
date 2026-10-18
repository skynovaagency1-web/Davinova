"""Re-apply hand edits after a cutouts run is rebased: a long run writes the manifest it loaded at the start,
so products hidden by eye (rejects.json) or recut by hand meanwhile would otherwise come back."""
import json
import os

OUT = 'public/cutouts'
path = os.path.join(OUT, 'manifest.json')
manifest = json.load(open(path))
rejects = set(json.load(open(os.path.join(OUT, 'rejects.json'))))
for pid, cut in manifest.items():
    if pid in rejects:
        manifest[pid] = None
    elif cut and not os.path.exists('public' + cut):
        # The other look (.webp or .float.webp) is the one on disk now.
        other = cut.replace('.float.webp', '.webp') if cut.endswith('.float.webp') else cut[:-len('.webp')] + '.float.webp'
        manifest[pid] = other if os.path.exists('public' + other) else None
open(path, 'w').write('{\n' + ',\n'.join(f'{json.dumps(k)}: {json.dumps(manifest[k])}' for k in sorted(manifest)) + '\n}\n')
