import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { WomenLayout } from './site/women/WomenLayout';
import { MenLayout } from './site/men/MenLayout';
import { ApprovalPage } from './pages/ApprovalPage';
const WomenHome = lazy(() => import('./site/women/WomenHome').then((m) => ({ default: m.WomenHome })));
const WomenShop = lazy(() => import('./site/women/WomenShop').then((m) => ({ default: m.WomenShop })));
const WatchesPage = lazy(() => import('./site/women/WatchesPage').then((m) => ({ default: m.WatchesPage })));
const MenHome = lazy(() => import('./site/men/MenHome').then((m) => ({ default: m.MenHome })));
const MenShop = lazy(() => import('./site/men/MenShop').then((m) => ({ default: m.MenShop })));
const ProductView = lazy(() => import('./site/shared/ProductView').then((m) => ({ default: m.ProductView })));
const BagView = lazy(() => import('./site/shared/BagView').then((m) => ({ default: m.BagView })));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const InfoPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.InfoPage })));
const NotFoundPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.NotFoundPage })));
const CJCatalogAdminPage = lazy(() => import('./pages/CJCatalogAdminPage').then((m) => ({ default: m.CJCatalogAdminPage })));

function PageLoader() { return <div className="page-loader" role="status">Loading…</div>; }

// men.<domain> opens the men's storefront directly, like a separate site.
const menHost = typeof window !== 'undefined' && window.location.hostname.startsWith('men.');

export default function App() {
  return <BrowserRouter><Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/admin/cj-catalog" element={<CJCatalogAdminPage />} />
      <Route path="/men" element={<MenLayout />}>
        <Route index element={<MenHome />} />
        <Route path="shop" element={<MenShop />} />
        <Route path="product/:slug" element={<ProductView variant="men" />} />
        <Route path="bag" element={<BagView variant="men" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<WomenLayout />}>
        <Route index element={menHost ? <Navigate to="/men" replace /> : <WomenHome />} />
        <Route path="shop" element={<WomenShop />} />
        <Route path="watches" element={<WatchesPage />} />
        <Route path="product/:slug" element={<ProductView variant="women" />} />
        <Route path="bag" element={<BagView variant="women" />} />
        <Route path="cart" element={<BagView variant="women" />} />
        <Route path="order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="about" element={<InfoPage />} />
        <Route path="shipping" element={<InfoPage />} />
        <Route path="returns" element={<InfoPage />} />
        <Route path="privacy" element={<InfoPage />} />
        <Route path="contact" element={<InfoPage />} />
        <Route path="approve-cj" element={<ApprovalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </Suspense></BrowserRouter>;
}
