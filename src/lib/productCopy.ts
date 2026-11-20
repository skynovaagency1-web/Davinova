/**
 * Hand-written names and descriptions for products, in English and French, replacing CJ's keyword titles and
 * supplier notes. English is used everywhere the product shows (shop, product page, SEO tags, Merchant feed, Stripe);
 * the French goes to /fr pages (product page text via the fr dictionary, and the page's search title).
 * Written from the supplier data and checked against the photos. Add the best sellers first.
 */
export interface ProductCopy { title: string; description: string }

export const PRODUCT_COPY: Record<string, { en: ProductCopy; fr: ProductCopy }> = {
  'cj-2501080258281617800': {
    en: {
      title: 'Off-Shoulder Mermaid Evening Gown',
      description: 'A floor-length mermaid gown with a sweetheart neckline, beaded off-the-shoulder straps and a sheer V insert at the bust. It follows the body through the hips, then opens into a soft flared hem, made for black-tie weddings, galas and evening receptions. Colours: navy blue, black or wine red. Sizes US 2 to US 16, and plus sizes US 14W to US 26W. Fabric: polyester. Between two sizes? Choose the larger one, and check the size guide for exact measurements.',
    },
    fr: {
      title: 'Robe de soirée sirène épaules dénudées',
      description: 'Une robe longue coupe sirène, décolleté cœur, bretelles perlées portées sur les épaules et empiècement en V transparent au buste. Elle épouse la silhouette jusqu’aux hanches puis s’évase en un bas fluide : parfaite pour un mariage habillé, un gala ou une réception du soir. Coloris : bleu marine, noir ou bordeaux. Tailles US 2 à US 16 (34 à 48 environ) et grandes tailles US 14W à US 26W. Matière : polyester. Entre deux tailles ? Prenez la plus grande et consultez le guide des tailles pour les mesures exactes.',
    },
  },
  'cj-1633743129520123904': {
    en: {
      title: 'Velvet Puff-Sleeve Evening Gown',
      description: 'Deep velvet, a square neckline edged with sparkling crystals, long puff sleeves and a full skirt that sweeps the floor. A winter wedding, a Christmas gala or a night at the opera: this is the dress people remember. Colours: wine red or black, with a wine red version in sheer sleeves. Sizes XS to 3XL. Long length about 145 cm (57 in) including the skirt’s volume. Runs small: we suggest one size up, and the size guide has exact measurements.',
    },
    fr: {
      title: 'Robe de soirée en velours à manches bouffantes',
      description: 'Un velours profond, un décolleté carré bordé de cristaux scintillants, de longues manches bouffantes et une jupe ample qui effleure le sol. Mariage d’hiver, gala de Noël ou soirée à l’opéra : c’est la robe dont on se souvient. Coloris : bordeaux ou noir, et une version bordeaux à manches en tulle. Tailles XS à 3XL. Longueur environ 145 cm. Taille petit : nous conseillons de prendre une taille au-dessus, et le guide des tailles donne les mesures exactes.',
    },
  },
  'cj-1700045773867593728': {
    en: {
      title: 'Off-Shoulder Satin Midi Party Dress',
      description: 'Smooth satin, an off-the-shoulder neckline and a full midi skirt that swings when you walk. The lace-up corset back lets you adjust the waist for a close fit. Ideal as a wedding guest, cocktail or bridesmaid dress, with 18 colours to match any theme, from ice blue and lavender to emerald, wine red and navy. Sizes S to XXL. Fabric: polyester satin. Between two sizes? Choose the larger one, and check the size guide for exact measurements.',
    },
    fr: {
      title: 'Robe de soirée midi en satin épaules dénudées',
      description: 'Un satin lisse, un décolleté épaules dénudées et une jupe midi ample qui ondule à chaque pas. Le dos corset lacé permet d’ajuster la taille pour un tombé parfait. Idéale pour un mariage, un cocktail ou en robe de demoiselle d’honneur, avec 18 coloris pour suivre tous les thèmes, du bleu glacier au lavande, du vert émeraude au bordeaux et au marine. Tailles S à XXL. Matière : satin de polyester. Entre deux tailles ? Prenez la plus grande et consultez le guide des tailles pour les mesures exactes.',
    },
  },
};

export type CopyLang = 'en' | 'fr' | 'es';

/** The written copy for a product, in English or French (Spanish falls back to English). */
export function productCopy(id: string, lang: CopyLang = 'en'): ProductCopy | undefined {
  const entry = PRODUCT_COPY[id];
  if (!entry) return undefined;
  return lang === 'fr' ? entry.fr : entry.en;
}

/** English → French pairs for the /fr page translator, so names and descriptions switch with the page language. */
export function frenchProductText(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { en, fr } of Object.values(PRODUCT_COPY)) {
    out[en.title] = fr.title;
    out[en.description] = fr.description;
  }
  return out;
}
