import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentState {
  ids: string[];
  seen: (productId: string) => void;
}

/** Products this shopper opened lately, newest first, kept in this browser only. */
export const useRecent = create<RecentState>()(persist((set) => ({
  ids: [],
  seen: (productId) => set((state) => ({ ids: [productId, ...state.ids.filter((id) => id !== productId)].slice(0, 16) })),
}), { name: 'davinova-recent-v1' }));
