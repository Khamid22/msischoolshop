import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { CartItem, DeliveryMethod, Order, Product } from '../types';
import { createOrder } from '../api';
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
  }) => Promise<boolean>;
  closeSuccess: () => void;
  totalPrice: number;
  originalPrice: number;
  savings: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function createPurchaseRequestId(): string {
  return globalThis.crypto?.randomUUID?.() || `shop-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [currentItem, setCurrentItem] = useState<CartItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [purchaseRequestId, setPurchaseRequestId] = useState<string | null>(null);

  const closeCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
    setCurrentItem(null);
    setPurchaseRequestId(null);
  }, []);

  const buyNow = useCallback((product: Product) => {
    setCurrentItem({ product, quantity: 1 });
    setPurchaseRequestId(createPurchaseRequestId());
    setIsCheckoutOpen(true);
  }, []);

  const submitOrder = useCallback(async (data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryMethod: DeliveryMethod;
    pickupSlot?: string;
  }): Promise<boolean> => {
    if (!user || !currentItem) return false;
    const totalPrice = getUnitPrice(currentItem.product, user) * currentItem.quantity;
    if (user.balance < totalPrice) return false;

    try {
      const result = await createOrder({
        productId: currentItem.product.id,
        requestId: purchaseRequestId || createPurchaseRequestId(),
        quantity: currentItem.quantity,
        ...data,
      });
      setLastOrder(result.order);
      setCurrentItem(null);
      setPurchaseRequestId(null);
      setIsCheckoutOpen(false);
      localStorage.setItem('msi_current_user', JSON.stringify(result.user));
      window.dispatchEvent(new Event('msi:notifications'));
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [currentItem, purchaseRequestId, refreshUser, user]);

  const closeSuccess = useCallback(() => setLastOrder(null), []);

  const totalPrice = currentItem ? getUnitPrice(currentItem.product, user) * currentItem.quantity : 0;
  const originalPrice = currentItem ? getProductPrice(currentItem.product) * currentItem.quantity : 0;
  const savings = originalPrice - totalPrice;

  return (
    <CartContext.Provider value={{
      currentItem, isCheckoutOpen, lastOrder, buyNow, closeCheckout, submitOrder,
      closeSuccess, totalPrice, originalPrice, savings,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
