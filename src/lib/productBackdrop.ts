/**
 * Soft, colour-led product backdrops for Davinova's floating garment presentation.
 * Keep backgrounds light enough that dress details remain clear.
 */
export function productBackdropFor(color?: string, title?: string): string {
  const value = (String(color ?? '') + ' ' + String(title ?? '')).toLowerCase();

  if (/\b(emerald|sage|green|mint|teal|olive)\b/.test(value)) {
    return 'radial-gradient(ellipse at 52% 35%, #f4f8ef 0%, #e3eddd 44%, #b8c9ae 100%)';
  }
  if (/\b(rose|pink|blush|fuchsia|magenta)\b/.test(value)) {
    return 'radial-gradient(ellipse at 52% 35%, #fff5f1 0%, #f2dedb 48%, #d8b9b7 100%)';
  }
  if (/\b(powder blue|sky blue|blue|navy|azure|cobalt)\b/.test(value)) {
    return 'radial-gradient(ellipse at 52% 35%, #f2f7fa 0%, #e0eaf0 48%, #b8cad8 100%)';
  }
  if (/\b(purple|lilac|lavender|plum)\b/.test(value)) {
    return 'radial-gradient(ellipse at 52% 35%, #f8f4fa 0%, #e8dfee 48%, #c8b8d0 100%)';
  }
  if (/\b(burgundy|wine|berry|red|maroon)\b/.test(value)) {
    return 'radial-gradient(ellipse at 52% 35%, #f9efed 0%, #ead7d4 48%, #caa7a7 100%)';
  }
  if (/\b(black|charcoal|grey|gray|silver)\b/.test(value)) {
    return 'radial-gradient(ellipse at 52% 35%, #f5f2ef 0%, #e5dfda 48%, #c4bbb5 100%)';
  }
  if (/\b(brown|camel|tan|chocolate|rust|terracotta|orange|apricot)\b/.test(value)) {
    return 'radial-gradient(ellipse at 52% 35%, #fbf3e9 0%, #eadbca 48%, #c9ad91 100%)';
  }
  if (/\b(white|ivory|cream|champagne|beige|lace)\b/.test(value)) {
    return 'radial-gradient(ellipse at 52% 35%, #fffaf2 0%, #f1e4d3 48%, #d9c4ad 100%)';
  }
  return 'radial-gradient(ellipse at 52% 35%, #faf5f0 0%, #eee3d9 48%, #d5c0b2 100%)';
}
