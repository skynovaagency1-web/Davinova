import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { products as demoProducts } from './products';
import { fetchWooCommerceProducts, isWooCommerceConfigured } from '../lib/woocommerce';
import type { Product } from '../types/product';

interface CatalogContextValue {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  isWooCommerce: boolean;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const isWooCommerce = isWooCommerceConfigured();
  const [state, setState] = useState<CatalogContextValue>(() => ({
    products: !isWooCommerce && import.meta.env.DEV ? demoProducts : [],
    isLoading: isWooCommerce,
    error: !isWooCommerce && !import.meta.env.DEV
      ? 'The Davinova product catalogue is not connected yet.'
      : null,
    isWooCommerce,
  }));

  useEffect(() => {
    if (!isWooCommerce) {
      setState({
        products: import.meta.env.DEV ? demoProducts : [],
        isLoading: false,
        error: import.meta.env.DEV ? null : 'The Davinova product catalogue is not connected yet.',
        isWooCommerce: false,
      });
      return;
    }

    const controller = new AbortController();
    setState({ products: [], isLoading: true, error: null, isWooCommerce: true });
    fetchWooCommerceProducts(controller.signal)
      .then((products) => setState({
        products,
        isLoading: false,
        error: products.length ? null : 'No published, in-stock products were returned by WooCommerce.',
        isWooCommerce: true,
      }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          products: [],
          isLoading: false,
          error: error instanceof Error ? error.message : 'Could not load the WooCommerce catalogue.',
          isWooCommerce: true,
        });
      });

    return () => controller.abort();
  }, [isWooCommerce]);

  return <CatalogContext.Provider value={state}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used inside CatalogProvider.');
  return context;
}
