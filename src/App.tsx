import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LangProvider } from './contexts/LangContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import ProductGrid from './components/ProductGrid';
import CartDrawer from './components/CartDrawer';
import CheckoutDrawer from './components/CheckoutDrawer';
import OrderSuccess from './components/OrderSuccess';
import AuthModal from './components/AuthModal';
import ProfileDrawer from './components/ProfileDrawer';
import { fetchProducts } from './api';
import type { Product } from './types';
import './styles/global.scss';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);

  return (
    <ThemeProvider>
      <LangProvider>
        <CartProvider>
          <AuthProvider>
            <Header />
            <ProductGrid products={products} />
            <CartDrawer />
            <CheckoutDrawer />
            <OrderSuccess />
            <AuthModal />
            <ProfileDrawer />
          </AuthProvider>
        </CartProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
