import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, DressSize } from '../types/product';

export interface CartItem { productId: string; size: DressSize; quantity: number }
interface CartState {
  items: CartItem[];
  add: (product: Product, size: DressSize, quantity?: number) => void;
  remove: (productId: string, size: DressSize) => void;
  setQuantity: (productId: string, size: DressSize, quantity: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(persist((set) => ({
  items: [],
  add: (product, size, quantity = 1) => set((state) => {
    const found = state.items.find((item) => item.productId === product.id && item.size === size);
    return { items: found ? state.items.map((item) => item === found ? { ...item, quantity: item.quantity + quantity } : item) : [...state.items, { productId: product.id, size, quantity }] };
  }),
  remove: (productId, size) => set((state) => ({ items: state.items.filter((item) => item.productId !== productId || item.size !== size) })),
  setQuantity: (productId, size, quantity) => set((state) => ({ items: quantity <= 0 ? state.items.filter((item) => item.productId !== productId || item.size !== size) : state.items.map((item) => item.productId === productId && item.size === size ? { ...item, quantity: Math.min(10, Math.floor(quantity)) } : item) })),
  clear: () => set({ items: [] }),
}), { name: 'davinova-cart-v1' }));
