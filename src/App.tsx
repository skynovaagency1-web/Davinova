import { lazy, Suspense, useEffect } from 'react';
import { BASENAME } from './lib/i18n';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { WomenLayout } from './site/women/WomenLayout';
import { MenLayout } from './site/men/MenLayout';
import { useAccount } from './store/account';
const ApprovalPage = lazy(() => import('./pages/ApprovalPage').then((m) => ({ default: m.ApprovalPage })));
const WomenHome = lazy(() => import('./site/women/WomenHome').then((m) => ({ default: m.WomenHome })));
const WomenShop = lazy(() => import('./site/women/WomenShop').then((m) => ({ default: m.WomenShop })));
const WatchesPage = lazy(() => import('./site/women/WatchesPage').then((m) => ({ default: m.WatchesPage })));
const MenHome = lazy(() => import('./site/men/MenHome').then((m) => ({ default: m.MenHome })));
const MenShop = lazy(() => import('./site/men/MenShop').then((m) => ({ default: m.MenShop })));
const ProductView = lazy(() => import('./site/shared/ProductView').then((m) => ({ default: m.ProductView })));
const BagView = lazy(() => import('./site/shared/BagView').then((m) => ({ default: m.BagView })));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const CategoriesPage = lazy(() => import('./site/women/WomenIndexPages').then((m) => ({ default: m.CategoriesPage })));
const FitsPage = lazy(() => import('./site/women/WomenIndexPages').then((m) => ({ default: m.FitsPage })));
const FitCategoriesPage = lazy(() => import('./site/women/WomenIndexPages').then((m) => ({ default: m.FitCategoriesPage })));
const GroupPage = lazy(() => import('./site/women/WomenIndexPages').then((m) => ({ default: m.GroupPage })));
const CustomPage = lazy(() => import('./site/women/CustomPage').then((m) => ({ default: m.CustomPage })));
const DesignMaker = lazy(() => import('./site/shared/DesignMaker').then((m) => ({ default: m.DesignMaker })));
const BeautyPage = lazy(() => import('./site/women/BeautyPage').then((m) => ({ default: m.BeautyPage })));
const JewelryPage = lazy(() => import('./site/shared/JewelryPage').then((m) => ({ default: m.JewelryPage })));
const WishlistPage = lazy(() => import('./site/shared/ExtraPages').then((m) => ({ default: m.WishlistPage })));
const AccountPage = lazy(() => import('./site/shared/AccountPage').then((m) => ({ default: m.AccountPage })));
const GiftCardPage = lazy(() => import('./site/shared/ExtraPages').then((m) => ({ default: m.GiftCardPage })));
const ReferralPage = lazy(() => import('./site/shared/ExtraPages').then((m) => ({ default: m.ReferralPage })));
const AboutPage = lazy(() => import('./site/shared/AboutPage').then((m) => ({ default: m.AboutPage })));
const HelpPage = lazy(() => import('./site/shared/HelpPages').then((m) => ({ default: m.HelpPage })));
const MenCategoriesPage = lazy(() => import('./site/men/MenCategoriesPage').then((m) => ({ default: m.MenCategoriesPage })));
const NotFoundPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.NotFoundPage })));
const OrdersAdminPage = lazy(() => import('./pages/OrdersAdminPage').then((m) => ({ default: m.OrdersAdminPage })));
const WinnersAdminPage = lazy(() => import('./pages/WinnersAdminPage').then((m) => ({ default: m.WinnersAdminPage })));
const CJCatalogAdminPage = lazy(() => import('./pages/CJCatalogAdminPage').then((m) => ({ default: m.CJCatalogAdminPage })));

function PageLoader() { return <div className="page-loader" role="status">Loading…</div>; }

// men.<domain> opens the men's storefront directly, like a separate site.
const menHost = typeof window !== 'undefined' && window.location.hostname.startsWith('men.');

export default function App() {
  useEffect(() => { void useAccount.getState().load(); }, []);
  return <BrowserRouter basename={BASENAME}><Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/admin/cj-catalog" element={<CJCatalogAdminPage />} />
      <Route path="/admin/orders" element={<OrdersAdminPage />} />
      <Route path="/admin/winners" element={<WinnersAdminPage />} />
      <Route path="/men" element={<MenLayout />}>
        <Route index element={<MenHome />} />
        <Route path="shop" element={<MenShop />} />
        <Route path="product/:slug" element={<ProductView variant="men" />} />
        <Route path="bag" element={<BagView variant="men" />} />
        <Route path="about" element={<AboutPage dept="men" />} />
        <Route path="categories" element={<MenCategoriesPage />} />
        <Route path="custom" element={<CustomPage dept="men" />} />
        <Route path="custom/design" element={<DesignMaker dept="men" />} />
        <Route path="track" element={<HelpPage dept="men" slug="track" />} />
        <Route path="shipping" element={<HelpPage dept="men" slug="shipping" />} />
        <Route path="returns" element={<HelpPage dept="men" slug="returns" />} />
        <Route path="size-guide" element={<HelpPage dept="men" slug="size-guide" />} />
        <Route path="faq" element={<HelpPage dept="men" slug="faq" />} />
        <Route path="contact" element={<HelpPage dept="men" slug="contact" />} />
        <Route path="privacy" element={<HelpPage dept="men" slug="privacy" />} />
        <Route path="terms" element={<HelpPage dept="men" slug="terms" />} />
        <Route path="jewelry" element={<JewelryPage dept="men" />} />
        <Route path="jewelry/:type" element={<JewelryPage dept="men" />} />
        <Route path="wishlist" element={<WishlistPage dept="men" />} />
        <Route path="account" element={<AccountPage dept="men" />} />
        <Route path="gift-cards" element={<GiftCardPage dept="men" />} />
        <Route path="refer" element={<ReferralPage dept="men" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<WomenLayout />}>
        <Route index element={menHost ? <Navigate to="/men" replace /> : <WomenHome />} />
        <Route path="shop" element={<WomenShop />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="fits" element={<FitsPage />} />
        <Route path="slim" element={<FitCategoriesPage fit="standard" />} />
        <Route path="plus-size" element={<FitCategoriesPage fit="curvy" />} />
        <Route path="accessories" element={<GroupPage slug="accessories" />} />
        <Route path="couple" element={<GroupPage slug="couple-parent-child-clothing" />} />
        <Route path="watches" element={<WatchesPage />} />
        <Route path="beauty" element={<BeautyPage />} />
        <Route path="custom" element={<CustomPage dept="women" />} />
        <Route path="custom/design" element={<DesignMaker dept="women" />} />
        <Route path="jewelry" element={<JewelryPage dept="women" />} />
        <Route path="jewelry/:type" element={<JewelryPage dept="women" />} />
        <Route path="wishlist" element={<WishlistPage dept="women" />} />
        <Route path="account" element={<AccountPage dept="women" />} />
        <Route path="gift-cards" element={<GiftCardPage dept="women" />} />
        <Route path="refer" element={<ReferralPage dept="women" />} />
        <Route path="product/:slug" element={<ProductView variant="women" />} />
        <Route path="bag" element={<BagView variant="women" />} />
        <Route path="cart" element={<BagView variant="women" />} />
        <Route path="order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="about" element={<AboutPage dept="women" />} />
        <Route path="track" element={<HelpPage dept="women" slug="track" />} />
        <Route path="shipping" element={<HelpPage dept="women" slug="shipping" />} />
        <Route path="returns" element={<HelpPage dept="women" slug="returns" />} />
        <Route path="size-guide" element={<HelpPage dept="women" slug="size-guide" />} />
        <Route path="faq" element={<HelpPage dept="women" slug="faq" />} />
        <Route path="contact" element={<HelpPage dept="women" slug="contact" />} />
        <Route path="privacy" element={<HelpPage dept="women" slug="privacy" />} />
        <Route path="terms" element={<HelpPage dept="women" slug="terms" />} />
        <Route path="approve-cj" element={<ApprovalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </Suspense></BrowserRouter>;
}
