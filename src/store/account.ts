import { create } from 'zustand';
import { useWishlist } from './wishlist';

export interface AccountOrder {
  orderNumber: string; placedAt: string; totalCents: number; currency: string; step: number; label: string;
  trackingNumber: string | null; trackingUrl: string | null;
  items: { title: string; size: string; color: string; quantity: number }[];
}
export interface Account {
  email: string; name: string; address: Record<string, string>; sizes: Record<string, string>; wishlist: string[]; orders: AccountOrder[];
}

interface AccountState {
  account: Account | null;
  ready: boolean;
  load: () => Promise<void>;
  signedIn: (account: Account) => void;
  save: (patch: Partial<Pick<Account, 'name' | 'address' | 'sizes' | 'wishlist'>>) => Promise<void>;
  signOut: () => Promise<void>;
}

async function call(path: string, init?: RequestInit): Promise<{ account?: Account | null; error?: string }> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...init?.headers } });
  const data = await response.json().catch(() => ({})) as { account?: Account | null; error?: string };
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

let synced = '';

/** Merges this browser's wishlist into the account once after sign-in, so nothing saved before is lost. */
async function mergeWishlist(account: Account) {
  const local = useWishlist.getState().ids;
  const merged = [...new Set([...local, ...account.wishlist])];
  synced = JSON.stringify(merged);
  useWishlist.getState().replace(merged);
  if (merged.length !== account.wishlist.length) await useAccount.getState().save({ wishlist: merged }).catch(() => undefined);
}

/** Signed-in customer (email code sign-in). The session lives in an HttpOnly cookie. */
export const useAccount = create<AccountState>()((set) => ({
  account: null,
  ready: false,
  load: async () => {
    try {
      const data = await call('/api/account');
      set({ account: data.account ?? null, ready: true });
      if (data.account) await mergeWishlist(data.account);
    } catch { set({ ready: true }); }
  },
  signedIn: (account) => { set({ account, ready: true }); void mergeWishlist(account); },
  save: async (patch) => {
    const data = await call('/api/account', { method: 'PUT', body: JSON.stringify(patch) });
    if (data.account) set({ account: data.account });
  },
  signOut: async () => {
    await call('/api/account/logout', { method: 'POST' }).catch(() => undefined);
    synced = '';
    set({ account: null });
    useWishlist.getState().clear();
  },
}));

let timer: ReturnType<typeof setTimeout> | undefined;
/** Keeps the account's wishlist in step with hearts tapped anywhere on the site. */
useWishlist.subscribe((state) => {
  if (!useAccount.getState().account) return;
  const next = JSON.stringify(state.ids);
  if (next === synced) return;
  clearTimeout(timer);
  timer = setTimeout(() => { synced = next; void useAccount.getState().save({ wishlist: state.ids }).catch(() => { synced = ''; }); }, 600);
});
