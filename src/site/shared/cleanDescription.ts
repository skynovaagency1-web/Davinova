import { cleanSupplierText } from '../../lib/productText';

/** Remove embedded supplier image tags and supplier boilerplate (see src/lib/productText.ts). */
export function cleanDescription(raw: string): string {
  return cleanSupplierText(raw);
}
