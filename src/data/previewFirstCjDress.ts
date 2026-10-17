import type { Product } from '../types/product';

/**
 * Preview-only sample for the first real CJ item requested by the owner.
 * This keeps the deployed Pages preview reviewable while the production D1
 * migration is pending. Never use it on davinova.com as a database substitute.
 */
export const previewFirstCjDress: Product = {
  id: 'cj-2607170630321612300',
  slug: 'white-lace-boho-tassel-maxi-dress',
  title: 'White Lace Boho Tassel Maxi Dress',
  description: 'A vintage-inspired white lace dress with a V-neckline, three-quarter sleeves and tassel detailing. This is the actual CJ catalogue item; stock, the precise size mapping, total landed cost, delivery and commercial image rights are still being verified.',
  priceCents: 0,
  supplier: 'cj',
  supplierVerified: false,
  sourceSupplier: 'cj',
  sourceSupplierProductId: '2607170630321612300',
  sourceSupplierUrl: 'https://www.cjdropshipping.com/product/elegant-vintage-womens-boho-tassel-dress-white-lace-v-neck-fringe-sleeve-autumn-fashion-party-dress-wedding-guest-maxi-dresses-p-2607170630321612300.html',
  cjProductId: '2607170630321612300',
  collectionCategory: 'wedding-guest',
  occasion: 'wedding-guest',
  department: 'women',
  color: 'White',
  length: 'Maxi',
  sleeve: 'Three-quarter sleeve',
  neckline: 'V-neck',
  tags: ['lace', 'boho', 'tassel', 'wedding guest', 'maxi'],
  sizes: [],
  images: [
    {
      url: 'https://cf.cjdropshipping.com/quick/product/65395296-6be3-4937-bce4-1792f605ac0e.jpg',
      alt: 'Actual CJ supplier image for the White Lace Boho Tassel Maxi Dress; commercial-use rights not yet confirmed',
    },
    {
      url: 'https://cf.cjdropshipping.com/quick/product/bd50c95d-2246-42f1-998c-f992ab6921a5.jpg',
      alt: 'Actual CJ supplier product photo 2; commercial-use rights not yet confirmed',
    },
    {
      url: 'https://cf.cjdropshipping.com/quick/product/82432e0e-68e9-44c9-a2a6-a79b20e1cafa.jpg',
      alt: 'Actual CJ supplier product photo 3; commercial-use rights not yet confirmed',
    },
    {
      url: 'https://cf.cjdropshipping.com/quick/product/0b361cbd-8681-4697-b096-49512d86e0c2.jpg',
      alt: 'Actual CJ supplier product photo 4; commercial-use rights not yet confirmed',
    },
    {
      url: 'https://cf.cjdropshipping.com/quick/product/0ad48d51-2bf4-4330-8339-295990e1b8f1.jpg',
      alt: 'Actual CJ supplier product photo 5; commercial-use rights not yet confirmed',
    },
  ],
  featured: true,
  browseOnly: true,
};
