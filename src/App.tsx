import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LangProvider } from './contexts/LangContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ShopPage from './components/ShopPage';
import CatalogPage from './components/CatalogPage';
import OrdersPage from './components/OrdersPage';
import ProfilePage from './components/ProfilePage';
import NewsPage from './components/NewsPage';
import SearchPage from './components/SearchPage';
import ProductDetail from './components/ProductDetail';
import FavoritesDrawer from './components/FavoritesDrawer';
import CheckoutDrawer from './components/CheckoutDrawer';
import OrderSuccess from './components/OrderSuccess';
import AuthModal from './components/AuthModal';
import BannerProductsModal from './components/BannerProductsModal';
import FiltersSheet from './components/FiltersSheet';
import ShopIntro from './components/ShopIntro';
import { useAuth } from './contexts/AuthContext';
import { fetchProducts } from './api';
import type { Product, FilterState, Banner as BannerType, View } from './types';
import './styles/global.scss';

const DEFAULT_FILTERS: FilterState = {
  type: 'all',
  minPrice: 0,
  maxPrice: 0,
  search: '',
};

function GuestIntro() {
  const { user } = useAuth();
  if (user) return null;
  return <ShopIntro />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<BannerType | null>(null);
  const [view, setView] = useState<View>('home');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const changeView = useCallback((next: View) => {
    setView(next);
    setSearchOpen(false);
  }, []);

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
                <div className="app">
                  <Header view={view} />
                  <main className="app-view" key={view + (searchOpen ? '-search' : '')}>
                    {searchOpen ? (
                      <SearchPage
                        products={products}
                        onBack={() => setSearchOpen(false)}
                        onOpenProduct={(p) => {
                          setSearchOpen(false);
                          setSelectedProduct(p);
                        }}
                      />
                    ) : view === 'home' ? (
                      <ShopPage
                        products={products}
                        loading={loading}
                        onOpenProduct={setSelectedProduct}
                      />
                    ) : view === 'catalog' ? (
                      <CatalogPage
                        products={products}
                        filters={filters}
                        onFiltersChange={setFilters}
                        loading={loading}
                        onOpenProduct={setSelectedProduct}
                        onOpenSearch={() => setSearchOpen(true)}
                        onOpenFilters={() => setFiltersOpen(true)}
                      />
                    ) : view === 'orders' ? (
                      <OrdersPage />
                    ) : view === 'profile' ? (
                      <ProfilePage onNavigate={(v) => changeView(v)} />
                    ) : (
                      <NewsPage />
                    )}
                  </main>
                  <BottomNav view={view} onViewChange={changeView} />
                </div>

                <ProductDetail
                  product={selectedProduct}
                  allProducts={products}
                  onClose={() => setSelectedProduct(null)}
                  onOpenProduct={setSelectedProduct}
                />
                <FavoritesDrawer />
                <CheckoutDrawer />
                <OrderSuccess />
                <AuthModal />
                <GuestIntro />
                <BannerProductsModal
                  banner={selectedBanner}
                  allProducts={products}
                  onClose={() => setSelectedBanner(null)}
                  onOpenProduct={(p) => { setSelectedBanner(null); setSelectedProduct(p); }}
                />
                <FiltersSheet
                  open={filtersOpen}
                  filters={filters}
                  onApply={setFilters}
                  onClose={() => setFiltersOpen(false)}
                />
              </CartProvider>
            </FavoritesProvider>
          </NotificationsProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
