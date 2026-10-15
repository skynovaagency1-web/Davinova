import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CatalogProvider } from './data/CatalogProvider';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductPage = lazy(() => import('./pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const CartPage = lazy(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })));
const InfoPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.InfoPage })));
const NotFoundPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.NotFoundPage })));

function PageLoader() {
  return <div className="page-loader" role="status">Preparing your edit…</div>;
}

export default function App() {
  return (
    <CatalogProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="product/:slug" element={<ProductPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="about" element={<InfoPage />} />
              <Route path="shipping" element={<InfoPage />} />
              <Route path="returns" element={<InfoPage />} />
              <Route path="privacy" element={<InfoPage />} />
              <Route path="contact" element={<InfoPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </CatalogProvider>
  );
}
