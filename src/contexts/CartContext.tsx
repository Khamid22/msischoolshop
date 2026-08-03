import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Product, CartItem, Order, DeliveryMethod } from '../types';
import { useAuth } from './AuthContext';
import { getProductPrice, getUnitPrice } from '../utils/currency';

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  isCheckoutOpen: boolean;
  lastOrder: Order | null;
  open: () => void;
  close: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  submitOrder: (data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryMethod: DeliveryMethod;
    pickupSlot?: string;
  }) => boolean;
  closeSuccess: () => void;
  totalItems: number;
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
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const open = () => { setIsCheckoutOpen(false); setIsOpen(true); };
  const close = () => setIsOpen(false);
  const openCheckout = () => { setIsOpen(false); setIsCheckoutOpen(true); };
  const closeCheckout = () => setIsCheckoutOpen(false);

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

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

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + getUnitPrice(i.product, user) * i.quantity, 0);
  const originalPrice = items.reduce((sum, i) => sum + getProductPrice(i.product) * i.quantity, 0);
  const savings = originalPrice - totalPrice;

  return (
    <CartContext.Provider
      value={{
        items, isOpen, isCheckoutOpen, lastOrder,
        open, close, openCheckout, closeCheckout,
        addItem, removeItem, updateQuantity, clearCart,
        submitOrder, closeSuccess,
        totalItems, totalPrice, originalPrice, savings,
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
