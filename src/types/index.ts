export type Language = 'ru' | 'uz' | 'en';

export type View = 'home' | 'catalog' | 'orders' | 'profile' | 'news';

export type OrderStatus = 'paid' | 'packed' | 'ready' | 'collected';

export type NotificationType = 'welcome' | 'spend' | 'topup';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  amount: number;
  note?: string;
  createdAt: string;
  read: boolean;
}

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
  rating?: number;
  ratingCount?: number;
  course?: { id: string; title: string; url: string };
}

export interface PickupSlot {
  id: string;
  label: string;
  when: string;
  location: string;
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
  avatar?: string;
  balance: number;
  group?: string;
  studentId?: string;
  discount?: number;
  earned?: number;
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
  userId?: string;
  customerEmail?: string;
  status?: OrderStatus;
  pickupCode?: string;
  pickupSlot?: string;
  originalPrice?: number;
}

export type DeliveryMethod = 'courier' | 'pickup' | 'post';

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  accent: string;
  icon: string;
  active: boolean;
  productIds?: string[];
}

export interface News {
  id: string;
  title: string;
  description: string;
  image?: string;
  date: string;
  active: boolean;
}
