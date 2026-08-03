import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LangProvider } from './contexts/LangContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import ShopPage from './components/ShopPage';
import CatalogPage from './components/CatalogPage';
import NewsPage from './components/NewsPage';
import ProductDetail from './components/ProductDetail';
import CartDrawer from './components/CartDrawer';
import FavoritesDrawer from './components/FavoritesDrawer';
import CheckoutDrawer from './components/CheckoutDrawer';
import OrderSuccess from './components/OrderSuccess';
import AuthModal from './components/AuthModal';
import ProfileDrawer from './components/ProfileDrawer';
import BannerProductsModal from './components/BannerProductsModal';
import { fetchProducts } from './api';
import type { Product, FilterState, Banner as BannerType, View } from './types';
import './styles/global.scss';

const DEFAULT_FILTERS: FilterState = {
  type: 'all',
  minPrice: 0,
  maxPrice: 0,
  search: '',
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<BannerType | null>(null);
  const [view, setView] = useState<View>('shop');

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    if (showSplash) return;
    fetchProducts().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, [showSplash]);

  if (showSplash) {
    return (
      <ThemeProvider>
        <SplashScreen onFinish={handleSplashFinish} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <NotificationsProvider>
            <FavoritesProvider>
              <CartProvider>
                <Header view={view} onViewChange={setView} />
              <div className="app-view" key={view}>
                {view === 'shop' && (
                  <ShopPage
                    products={products}
                    loading={loading}
                    onOpenProduct={setSelectedProduct}
                    onBannerClick={setSelectedBanner}
                    onOpenCatalog={() => setView('catalog')}
                  />
                )}
                {view === 'catalog' && (
                  <CatalogPage
                    products={products}
                    filters={filters}
                    onFiltersChange={setFilters}
                    loading={loading}
                    onOpenProduct={setSelectedProduct}
                  />
                )}
                {view === 'news' && <NewsPage />}
              </div>
              <ProductDetail
                product={selectedProduct}
                allProducts={products}
                onClose={() => setSelectedProduct(null)}
                onOpenProduct={setSelectedProduct}
              />
              <CartDrawer />
              <FavoritesDrawer />
              <CheckoutDrawer />
              <OrderSuccess />
              <AuthModal />
              <ProfileDrawer />
              <BannerProductsModal
                banner={selectedBanner}
                allProducts={products}
                onClose={() => setSelectedBanner(null)}
                onOpenProduct={(p) => { setSelectedBanner(null); setSelectedProduct(p); }}
              />
            </CartProvider>
          </FavoritesProvider>
        </NotificationsProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
