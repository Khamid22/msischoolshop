import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Product, CartItem, Order, DeliveryMethod } from '../types';
import { useAuth } from './AuthContext';
import { getProductPrice, getUnitPrice } from '../utils/currency';

interface CartContextType {
  items: CartItem[];
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
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const closeCheckout = () => setIsCheckoutOpen(false);

  const buyNow = useCallback((product: Product) => {
    setItems([{ product, quantity: 1 }]);
    setIsCheckoutOpen(true);
  }, []);

  const submitOrder = useCallback((data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryMethod: DeliveryMethod;
    pickupSlot?: string;
  }) => {
    if (!user) return false;
    const totalPrice = items.reduce((sum, i) => sum + getUnitPrice(i.product, user) * i.quantity, 0);
    if (user.balance < totalPrice) return false;

    const order: Order = {
      id: crypto.randomUUID(),
      items: [...items],
      totalPrice,
      originalPrice: items.reduce((sum, i) => sum + getProductPrice(i.product) * i.quantity, 0),
      ...data,
      userId: user.id,
      customerEmail: user.email,
      createdAt: new Date().toISOString(),
      status: 'paid',
      pickupCode: 'K-' + Math.floor(1000 + Math.random() * 9000),
      pickupSlot: data.pickupSlot,
    };

    if (!spendStars(totalPrice, items.map((i) => (i.product.name || i.product.nameKey)).join(', '))) return false;

    saveOrder(order);
    console.log('📦 Order submitted:', order);

    // TODO: send to Telegram webhook / API
    // fetch('YOUR_WEBHOOK_URL', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(order),
    // });

    setLastOrder(order);
    setItems([]);
    setIsCheckoutOpen(false);
    return true;
  }, [items, user, spendStars]);

  const closeSuccess = useCallback(() => {
    setLastOrder(null);
  }, []);

  const totalPrice = items.reduce((sum, i) => sum + getUnitPrice(i.product, user) * i.quantity, 0);
  const originalPrice = items.reduce((sum, i) => sum + getProductPrice(i.product) * i.quantity, 0);
  const savings = originalPrice - totalPrice;

  return (
    <CartContext.Provider
      value={{
        items, isCheckoutOpen, lastOrder,
        buyNow, closeCheckout,
        submitOrder, closeSuccess,
        totalPrice, originalPrice, savings,
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
