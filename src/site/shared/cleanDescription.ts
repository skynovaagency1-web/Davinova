/** Remove embedded supplier image tags, including an unfinished trailing tag. */
export function cleanDescription(raw: string): string {
  return raw.replace(/<img\b[^>]*(?:>|$)/gi, '').trim();
}
