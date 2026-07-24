import type { Product, Banner } from './types';

// ============================================================
//  CONFIG — swap BASE_URL for your backend
// ============================================================

// const API_URL = '';  // e.g. 'https://api.msi-bot-shop.uz/v1'
const AUTH_KEY = 'msi_admin_auth';

// ============================================================
//  DEFAULT DATA (seed)
// ============================================================

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'tg-premium-6m', image: '/images/telegram-premium.svg', price: 150, nameKey: 'products.prem6', descKey: 'products.prem6Desc', type: 'digital', name: 'Telegram Premium 6 мес.', description: 'Премиум-подписка на 6 месяцев.' },
  { id: 'tg-premium-12m', image: '/images/telegram-premium.svg', price: 250, nameKey: 'products.prem12', descKey: 'products.prem12Desc', type: 'digital', name: 'Telegram Premium 12 мес.', description: 'Премиум-подписка на год.' },
  { id: 'tg-gift-25', image: '/images/telegram-gift-stars.svg', price: 25, nameKey: 'products.gift25', descKey: 'products.gift25Desc', type: 'digital', name: 'Gift 25 Stars', description: 'Подарок на 25 звёзд.' },
  { id: 'tg-gift-50', image: '/images/telegram-gift-stars.svg', price: 50, nameKey: 'products.gift50', descKey: 'products.gift50Desc', type: 'digital', name: 'Gift 50 Stars', description: 'Подарок на 50 звёзд.' },
  { id: 'tg-gift-150', image: '/images/telegram-gift-stars.svg', price: 150, nameKey: 'products.gift150', descKey: 'products.gift150Desc', type: 'digital', name: 'Gift 150 Stars', description: 'Премиум-подарок на 150 звёзд.' },
  { id: 'tshirt-1', image: '/images/tshirt-black.svg', price: 750, nameKey: 'products.tshirt1', descKey: 'products.tshirt1Desc', type: 'physical', name: 'T-Shirt Black Edition', description: 'Стильная футболка MSI Bot Shop.' },
  { id: 'cap-1', image: '/images/cap-1.svg', price: 400, nameKey: 'products.cap1', descKey: 'products.cap1Desc', type: 'physical', name: 'Cap — Stealth', description: 'Кепка MSI Bot Shop, вариант 1.' },
  { id: 'cap-2', image: '/images/cap-2.svg', price: 400, nameKey: 'products.cap2', descKey: 'products.cap2Desc', type: 'physical', name: 'Cap — Shadow', description: 'Кепка MSI Bot Shop, вариант 2.' },
  { id: 'cap-3', image: '/images/cap-3.svg', price: 400, nameKey: 'products.cap3', descKey: 'products.cap3Desc', type: 'physical', name: 'Cap — Phantom', description: 'Кепка MSI Bot Shop, вариант 3.' },
];

const DEFAULT_BANNERS: Banner[] = [
  { id: 'banner-1', title: 'Telegram Premium', subtitle: 'Подписка на 6 и 12 месяцев', description: 'Получите все премиум-функции Telegram прямо сейчас', image: '/images/telegram-premium.svg', accent: '#666666', icon: '💎', active: true, productIds: ['tg-premium-6m', 'tg-premium-12m'] },
  { id: 'banner-2', title: 'Gift Stars', subtitle: 'Подарочные звёзды', description: 'Отправляйте подарки друзьям и близким', image: '/images/telegram-gift-stars.svg', accent: '#999999', icon: '⭐', active: true, productIds: ['tg-gift-25', 'tg-gift-50', 'tg-gift-150'] },
  { id: 'banner-3', title: 'Merch Collection', subtitle: 'Эксклюзивный мерч', description: 'Футболки и кепки MSI Bot Shop', image: '/images/tshirt-black.svg', accent: '#333333', icon: '👕', active: true, productIds: ['tshirt-1', 'cap-1', 'cap-2', 'cap-3'] },
];

// ============================================================
//  HELPERS (localStorage — replace with fetch when backend ready)
// ============================================================

function lsGet<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') || fallback; }
  catch { return fallback; }
}

function lsSet(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seed() {
  if (!lsGet('msi_products_seeded', false)) {
    lsSet('msi_products', DEFAULT_PRODUCTS);
    lsSet('msi_products_seeded', true);
  }
  if (!lsGet('msi_banners_seeded', false)) {
    lsSet('msi_banners', DEFAULT_BANNERS);
    lsSet('msi_banners_seeded', true);
  }

  const stored = lsGet<Banner[]>('msi_banners', DEFAULT_BANNERS);
  const defaults = DEFAULT_BANNERS;
  let changed = false;
  for (const def of defaults) {
    const s = stored.find((b) => b.id === def.id);
    if (s && (!s.productIds || s.productIds.length === 0) && def.productIds && def.productIds.length > 0) {
      s.productIds = def.productIds;
      changed = true;
    }
  }
  if (changed) lsSet('msi_banners', stored);
}

// ============================================================
//  PRODUCTS API
// ============================================================

export async function fetchProducts(): Promise<Product[]> {
  // TODO: return fetch(`${API_URL}/products`).then(r => r.json())
  seed();
  return lsGet<Product[]>('msi_products', DEFAULT_PRODUCTS);
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<Product> {
  // TODO: return fetch(`${API_URL}/products`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json())
  const product: Product = {
    ...data,
    id: 'product-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
  };
  const list = lsGet<Product[]>('msi_products', DEFAULT_PRODUCTS);
  list.push(product);
  lsSet('msi_products', list);
  return product;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product | null> {
  // TODO: return fetch(`${API_URL}/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then(r => r.json())
  const list = lsGet<Product[]>('msi_products', DEFAULT_PRODUCTS);
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data };
  lsSet('msi_products', list);
  return list[idx];
}

export async function deleteProduct(id: string): Promise<void> {
  // TODO: fetch(`${API_URL}/products/${id}`, { method: 'DELETE' })
  const list = lsGet<Product[]>('msi_products', DEFAULT_PRODUCTS).filter((p) => p.id !== id);
  lsSet('msi_products', list);
}

// ============================================================
//  BANNERS API
// ============================================================

export async function fetchBanners(): Promise<Banner[]> {
  seed();
  return lsGet<Banner[]>('msi_banners', DEFAULT_BANNERS);
}

export async function createBanner(data: Omit<Banner, 'id'>): Promise<Banner> {
  const banner: Banner = {
    ...data,
    id: 'banner-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
  };
  const list = lsGet<Banner[]>('msi_banners', DEFAULT_BANNERS);
  list.push(banner);
  lsSet('msi_banners', list);
  return banner;
}

export async function updateBanner(id: string, data: Partial<Banner>): Promise<Banner | null> {
  const list = lsGet<Banner[]>('msi_banners', DEFAULT_BANNERS);
  const idx = list.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data };
  lsSet('msi_banners', list);
  return list[idx];
}

export async function deleteBanner(id: string): Promise<void> {
  const list = lsGet<Banner[]>('msi_banners', DEFAULT_BANNERS).filter((b) => b.id !== id);
  lsSet('msi_banners', list);
}

// ============================================================
//  AUTH API
// ============================================================

export async function login(password: string): Promise<boolean> {
  // TODO: return fetch(`${API_URL}/auth/login`, { method: 'POST', body: JSON.stringify({ password }) }).then(r => r.ok)
  if (password === '123456789') {
    lsSet(AUTH_KEY, true);
    return true;
  }
  return false;
}

export async function logout(): Promise<void> {
  // TODO: fetch(`${API_URL}/auth/logout`, { method: 'POST' })
  localStorage.removeItem(AUTH_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  // TODO: return fetch(`${API_URL}/auth/me`).then(r => r.ok)
  return lsGet(AUTH_KEY, false) as boolean;
}
