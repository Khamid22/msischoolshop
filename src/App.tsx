import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LangProvider } from './contexts/LangContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import Banner from './components/Banner';
import BannerProductsModal from './components/BannerProductsModal';
import ProductFilters from './components/ProductFilters';
import ProductGrid from './components/ProductGrid';
import ProductDetail from './components/ProductDetail';
import CartDrawer from './components/CartDrawer';
import CheckoutDrawer from './components/CheckoutDrawer';
import OrderSuccess from './components/OrderSuccess';
import AuthModal from './components/AuthModal';
import ProfileDrawer from './components/ProfileDrawer';
import { fetchProducts } from './api';
import type { Product, FilterState, Banner as BannerType } from './types';
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

  const filteredCount = products.filter((product) => {
    if (filters.type !== 'all' && product.type !== filters.type) return false;
    const price = product.discount && product.discount > 0
      ? Math.round(product.price * (1 - product.discount / 100))
      : product.price;
    if (filters.minPrice > 0 && price < filters.minPrice) return false;
    if (filters.maxPrice > 0 && price > filters.maxPrice) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const name = (product.name || '').toLowerCase();
      const desc = (product.description || '').toLowerCase();
      if (!name.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  }).length;

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
        <CartProvider>
          <AuthProvider>
            <Header />
            <Banner onBannerClick={setSelectedBanner} />
            <ProductFilters
              filters={filters}
              onChange={setFilters}
              productCount={filteredCount}
            />
            <ProductGrid
              products={products}
              filters={filters}
              loading={loading}
              onOpenProduct={setSelectedProduct}
            />
            <ProductDetail
              product={selectedProduct}
              allProducts={products}
              onClose={() => setSelectedProduct(null)}
              onOpenProduct={setSelectedProduct}
            />
            <CartDrawer />
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
          </AuthProvider>
        </CartProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
