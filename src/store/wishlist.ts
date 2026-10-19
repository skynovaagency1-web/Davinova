import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  ids: string[];
  toggle: (productId: string) => void;
  clear: () => void;
  replace: (ids: string[]) => void;
}

/** Saved products, kept in this browser and synced to the customer's account when signed in. Shared by both shops. */
export const useWishlist = create<WishlistState>()(persist((set) => ({
  ids: [],
  toggle: (productId) => set((state) => ({ ids: state.ids.includes(productId) ? state.ids.filter((id) => id !== productId) : [productId, ...state.ids] })),
  clear: () => set({ ids: [] }),
  replace: (ids) => set({ ids }),
}), { name: 'davinova-wishlist-v1' }));
