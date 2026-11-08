// Owner's on-model photos made in ChatGPT for CJ suits that only had mannequin shots (2026-11-08, batch 1).
// public/images/men-models/<id>.webp is shown first on the product page; the background-free cut is in public/cutouts.
// Every photo was checked by eye against the CJ garment before going in.
export const MODEL_PHOTOS: ReadonlySet<string> = new Set([
  'cj-1376730184245448704',
  'cj-1403525996090626048',
  'cj-1795331123610918912',
  'cj-1795000334524358656',
  'cj-2406280528441618200',
  'cj-2504210155411604400',
  'cj-2406140236131600400',
  'cj-2501150756191615500',
  'cj-1778320215491751936',
  'cj-2507310640101627800',
  'cj-1405822637829132288',
  'cj-2509260822551625300',
]);

/** The owner's on-model photo for a product, or undefined. Pass the site origin for absolute links (feeds, SEO). */
export const modelPhoto = (id: string, origin = '') => (MODEL_PHOTOS.has(id) ? `${origin}/images/men-models/${id}.webp` : undefined);
