import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Product, CartItem, Order, DeliveryMethod } from '../types';
import { useAuth } from './AuthContext';
import { getProductPrice, getUnitPrice } from '../utils/currency';

interface CartContextType {
  currentItem: CartItem | null;
  isCheckoutOpen: boolean;
  lastOrder: Order | null;
  buyNow: (product: Product) => void;
  closeCheckout: () => void;
  submitOrder: (data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryMethod: DeliveryMethod;
    pickupSlot?: string;
  }) => boolean;
  closeSuccess: () => void;
  totalPrice: number;
  originalPrice: number;
  savings: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function saveOrder(order: Order) {
  try {
    const existing: Order[] = JSON.parse(localStorage.getItem('msi_orders') || '[]');
    existing.push(order);
    localStorage.setItem('msi_orders', JSON.stringify(existing));
  } catch { /* ignore */ }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, spendStars } = useAuth();
  const [currentItem, setCurrentItem] = useState<CartItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const closeCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
    setCurrentItem(null);
  }, []);

  const buyNow = useCallback((product: Product) => {
    setCurrentItem({ product, quantity: 1 });
    setIsCheckoutOpen(true);
  }, []);

  const submitOrder = useCallback((data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryMethod: DeliveryMethod;
    pickupSlot?: string;
  }) => {
    if (!user || !currentItem) return false;
    const totalPrice = getUnitPrice(currentItem.product, user);
    if (user.balance < totalPrice) return false;

    const order: Order = {
      id: crypto.randomUUID(),
      items: [currentItem],
      totalPrice,
      originalPrice: getProductPrice(currentItem.product),
      ...data,
      userId: user.id,
      customerEmail: user.email,
      createdAt: new Date().toISOString(),
      status: 'paid',
      pickupCode: 'K-' + Math.floor(1000 + Math.random() * 9000),
      pickupSlot: data.pickupSlot,
    };

    if (!spendStars(totalPrice, currentItem.product.name || currentItem.product.nameKey)) return false;

    saveOrder(order);
    setLastOrder(order);
    setCurrentItem(null);
    setIsCheckoutOpen(false);
    return true;
  }, [currentItem, user, spendStars]);

  const closeSuccess = useCallback(() => setLastOrder(null), []);

  const totalPrice = currentItem ? getUnitPrice(currentItem.product, user) : 0;
  const originalPrice = currentItem ? getProductPrice(currentItem.product) : 0;
  const savings = originalPrice - totalPrice;

  return (
    <CartContext.Provider
      value={{
        currentItem,
        isCheckoutOpen,
        lastOrder,
        buyNow,
        closeCheckout,
        submitOrder,
        closeSuccess,
        totalPrice,
        originalPrice,
        savings,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
