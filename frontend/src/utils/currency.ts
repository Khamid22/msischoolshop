import type { Product, User } from '../types';

export const COIN_TO_SUM = 5000 / 30;

export const COIN = 'M';

export function formatCoins(value: number): string {
  const n = Number(value) || 0;
  return n.toLocaleString('ru-RU');
}

export function coinsToSum(coins: number): string {
  const value = (Number(coins) || 0) * COIN_TO_SUM;
  return Math.round(value).toLocaleString('ru-RU') + ' сум';
}

export function getProductPrice(product: Product, variantPrice?: number): number {
  const basePrice = variantPrice ?? product.price;
  if (product.discount && product.discount > 0) {
    return Math.round(basePrice * (1 - product.discount / 100));
  }
  return basePrice;
}

export function getStudentPrice(price: number, user: User | null): number {
  const discount = user?.discount && user.discount > 0 ? user.discount : 0;
  if (discount <= 0) return price;
  return Math.round(price * (1 - discount / 100));
}

export function getUnitPrice(product: Product, user: User | null, variantPrice?: number): number {
  return getStudentPrice(getProductPrice(product, variantPrice), user);
}
