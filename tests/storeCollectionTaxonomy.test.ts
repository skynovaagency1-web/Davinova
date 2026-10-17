import { describe, expect, it } from 'vitest';
import {
  assignmentFromStoreTags,
  publicProductTags,
  storeCollectionGroups,
  suggestStoreCollection,
  writeStoreCollectionTags,
} from '../src/lib/storeCollectionTaxonomy';

describe('Davinova store collection taxonomy', () => {
  it('contains the supplied clothing collections and subcategories', () => {
    expect(storeCollectionGroups.map((group) => group.label)).toEqual([
      'Accessories',
      'Couple & Parent-Child Clothing',
      'Women’s Jackets',
      'Women’s Sweatshirts & Hoodies',
      'Women’s Sweaters',
      'Women’s Denim',
      'Tops & Sets',
      'Bottoms',
      'Outerwear & Jackets',
      'Weddings & Events',
    ]);
    expect(storeCollectionGroups.reduce((count, group) => count + group.subcategories.length, 0)).toBe(80);
  });

  it('sorts denim jackets into the denim collection and correct subcategory', () => {
    expect(suggestStoreCollection('Women’s Denim Jacket')).toMatchObject({
      collection: 'womens-denim',
      subcategory: 'womens-denim-jackets',
      subcategoryLabel: 'Women’s Denim Jackets',
    });
  });

  it('sorts zip-up hoodies into their supplied collection and subcategory', () => {
    expect(suggestStoreCollection('Women’s Zip-Up Hoodie')).toMatchObject({
      collection: 'womens-sweatshirts-hoodies',
      subcategory: 'womens-zip-up-hoodies',
      subcategoryLabel: 'Women’s Zip-Up Hoodies',
    });
  });

  it('sorts cocktail dresses under Weddings & Events', () => {
    expect(suggestStoreCollection('Elegant Satin Cocktail Dress')).toMatchObject({
      collection: 'weddings-and-events',
      subcategory: 'cocktail-dresses',
    });
  });

  it('keeps matching family clothes in Couple & Parent-Child Clothing', () => {
    expect(suggestStoreCollection('Matching Parent-Child Sweatshirts')).toMatchObject({
      collection: 'couple-parent-child-clothing',
      subcategory: 'couple-and-parent-child-sweatshirts',
    });
  });

  it('does not mistake a wrap dress or cap-sleeve dress for an accessory', () => {
    expect(suggestStoreCollection('Elegant Wrap Dress')?.collection).toBe('tops-and-sets');
    expect(suggestStoreCollection('Cap Sleeve Evening Dress')?.collection).toBe('weddings-and-events');
  });

  it('leaves unclear listings for manual review instead of guessing', () => {
    expect(suggestStoreCollection('Elegant Satin Gown')).toBeUndefined();
    expect(suggestStoreCollection('Wedding Guest Dress')).toBeUndefined();
  });

  it('stores category metadata in hidden tags without exposing those tags publicly', () => {
    const tags = writeStoreCollectionTags(['plus-size'], {
      collection: 'weddings-and-events',
      collectionLabel: 'Weddings & Events',
      subcategory: 'cocktail-dresses',
      subcategoryLabel: 'Cocktail Dresses',
    });
    expect(assignmentFromStoreTags(tags)).toMatchObject({
      collection: 'weddings-and-events',
      subcategory: 'cocktail-dresses',
      subcategoryLabel: 'Cocktail Dresses',
    });
    expect(publicProductTags(tags)).toEqual(['plus-size']);
  });
});
