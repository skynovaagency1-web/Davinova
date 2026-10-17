// Keep the catalog's original thumbnail URL intact. Some supplier CDNs return 404
// when the generated "full-size" URL is inferred by removing image transformation suffixes.
export function fullSizeImage(url: string | undefined) {
  return url;
}
