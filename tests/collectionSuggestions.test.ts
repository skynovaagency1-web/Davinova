import { describe, expect, it } from 'vitest';
import { suggestCollectionCategory } from '../src/lib/collectionSuggestions';

describe('suggestCollectionCategory', () => {
  it('suggests Wedding Guest from clear wedding guest metadata', () => {
    expect(suggestCollectionCategory('Elegant maxi wedding guest dress')).toBe('wedding-guest');
    expect(suggestCollectionCategory('Lace dress', 'Bridesmaid')).toBe('wedding-guest');
  });

  it('suggests Cocktail & Party from party-specific clues', () => {
    expect(suggestCollectionCategory('Sequin cocktail dress')).toBe('cocktail-party');
    expect(suggestCollectionCategory('Satin midi dress', 'Partywear')).toBe('cocktail-party');
  });

  it('suggests Maxi & Holiday from getaway or length clues', () => {
    expect(suggestCollectionCategory('Women’s maxi dress')).toBe('maxi-holiday');
    expect(suggestCollectionCategory('Flowy summer dress', 'Beach collection')).toBe('maxi-holiday');
  });

  it('leaves ambiguous listings for a person to categorize', () => {
    expect(suggestCollectionCategory('Elegant satin evening gown')).toBeUndefined();
    expect(suggestCollectionCategory('Elegant vintage tassel dress', 'Women’s Dresses')).toBeUndefined();
  });

  it('uses a clear wedding guest clue before a length clue', () => {
    expect(suggestCollectionCategory('Maxi wedding guest dress')).toBe('wedding-guest');
  });
});
