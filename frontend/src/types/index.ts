export type Language = 'ru' | 'uz' | 'en';

export type View = 'home' | 'catalog' | 'orders' | 'profile' | 'news';

export type OrderStatus =
  | 'paid'
  | 'packed'
  | 'ready'
  | 'collected'
  | 'activating'
  | 'connected'
  | 'sent'
  | 'received';

export type FulfillmentType = 'physical_pickup' | 'digital_activation' | 'digital_delivery';

export type NotificationType = 'welcome' | 'spend' | 'topup' | 'information_required';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  amount: number;
  note?: string;
  createdAt: string;
  read: boolean;
  orderId?: string;
}

export type Theme = 'light' | 'dark';

export type ProductCollection = string;

export interface CatalogCategory {
  id: string;
  nameRu: string;
  nameUz: string;
  nameEn: string;
  active: boolean;
  position: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  price: number;
  stock?: number;
  active: boolean;
}

export interface Product {
  id: string;
  image: string;
  images?: string[];
  price: number;
  categoryId?: string;
  nameKey: string;
  descKey: string;
  name?: string;
  description?: string;
  type?: 'digital' | 'physical';
  fulfillmentType?: FulfillmentType;
  deliveryRequirement?: 'roblox_player_id';
  active?: boolean;
  carousel?: boolean;
  downloadUrl?: string;
  licenseKey?: string;
  weight?: number;
  stock?: number | null;
  variantLabel?: string;
  variants?: ProductVariant[];
  discount?: number;
  rating?: number | null;
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
  collection?: ProductCollection;
  inStock?: boolean;
  courseLinked?: boolean;
  sort?: 'popular' | 'newest' | 'price';
}

export interface Translations {
  ru: { [key: string]: string };
  uz: { [key: string]: string };
  en: { [key: string]: string };
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
}

export interface User {
  id: string;
  telegramId?: string;
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
  activeCourses?: number;
}

export interface OrderDeliveryRequirement {
  itemIndex: number;
  kind: 'roblox_player_id';
  playerId: string | null;
  submittedAt: string | null;
  editable: boolean;
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
  fulfillmentType?: FulfillmentType;
  statusFlow?: OrderStatus[];
  nextStatus?: OrderStatus;
  pickupCode?: string;
  pickupSlot?: string;
  originalPrice?: number;
  informationRequired?: boolean;
  deliveryRequirements?: OrderDeliveryRequirement[];
}

export type DeliveryMethod = 'courier' | 'pickup' | 'post' | 'digital';

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

export interface GrantLog {
  id: string;
  admin: string;
  userName: string;
  userEmail?: string;
  amount: number;
  type?: 'grant' | 'withdraw' | 'writeoff';
  createdAt: string;
}

export interface AdminBootstrap {
  products: Product[];
  categories: CatalogCategory[];
  banners: Banner[];
  news: News[];
  orders: Order[];
  users: User[];
  notifications: AppNotification[];
  grants: GrantLog[];
}

export interface SalesAnalytics {
  totalCoins: number;
  orderCount: number;
  averageOrder: number;
  unitsSold: number;
  products: Array<{ label: string; amount: number }>;
  periods: Array<{ label: string; amount: number }>;
}
