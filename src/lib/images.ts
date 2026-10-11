// FondMart listings link Alibaba CDN thumbnails such as `photo.jpg_300x300q90.webp`.
// Dropping the size suffix serves the full-size original, which stays sharp on large cards.
export function fullSizeImage(url: string | undefined) {
  if (!url) return url;
  return url.replace(/(\.(?:jpe?g|png))_\d+x\d+q\d+\.webp$/i, '$1');
}
