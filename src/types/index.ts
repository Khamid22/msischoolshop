export type Language = 'ru' | 'uz' | 'en';

export type Theme = 'light' | 'dark';

export interface Product {
  id: string;
  image: string;
  price: number;
  nameKey: string;
  descKey: string;
  name?: string;
  description?: string;
  type?: 'digital' | 'physical';
  carousel?: boolean;
  downloadUrl?: string;
  licenseKey?: string;
  weight?: number;
  stock?: number;
  discount?: number;
}

export interface FilterState {
  type: 'all' | 'digital' | 'physical';
  minPrice: number;
  maxPrice: number;
  search: string;
}

export interface Translations {
  ru: { [key: string]: string };
  uz: { [key: string]: string };
  en: { [key: string]: string };
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryMethod: DeliveryMethod;
  createdAt: string;
}

export type DeliveryMethod = 'courier' | 'pickup' | 'post';
