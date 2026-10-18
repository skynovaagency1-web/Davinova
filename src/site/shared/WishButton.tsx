import { Heart } from 'lucide-react';
import { useWishlist } from '../../store/wishlist';

/** Heart that saves a product to the wishlist; sits on cards and the product page. */
export function WishButton({ productId, title, className = 'wish' }: { productId: string; title: string; className?: string }) {
  const saved = useWishlist((state) => state.ids.includes(productId));
  const toggle = useWishlist((state) => state.toggle);
  return <button type="button" className={`${className}${saved ? ' is-saved' : ''}`} aria-pressed={saved}
    aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`}
    onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggle(productId); }}>
    <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
  </button>;
}
