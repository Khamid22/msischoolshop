import type { Product, Banner, News, Order, PickupSlot } from './types';

// ============================================================
//  CONFIG — swap BASE_URL for your backend
// ============================================================

// const API_URL = '';  // e.g. 'https://api.msi-bot-shop.uz/v1'
const AUTH_KEY = 'msi_admin_auth';

// ============================================================
//  DEFAULT DATA (seed)
// ============================================================

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'tg-premium-6m', image: './images/telegram-premium.svg', price: 150, nameKey: 'products.prem6', descKey: 'products.prem6Desc', type: 'digital', name: 'Telegram Premium 6 мес.', description: 'Премиум-подписка на 6 месяцев.', rating: 4.8, ratingCount: 210 },
  { id: 'tg-premium-12m', image: './images/telegram-premium.svg', price: 250, nameKey: 'products.prem12', descKey: 'products.prem12Desc', type: 'digital', name: 'Telegram Premium 12 мес.', description: 'Премиум-подписка на год.', rating: 4.9, ratingCount: 178 },
  { id: 'tg-gift-25', image: './images/telegram-gift-stars.svg', price: 25, nameKey: 'products.gift25', descKey: 'products.gift25Desc', type: 'digital', name: 'Gift 25 MSI Coin', description: 'Подарок на 25 MSI Coin.', rating: 4.5, ratingCount: 64 },
  { id: 'tg-gift-50', image: './images/telegram-gift-stars.svg', price: 50, nameKey: 'products.gift50', descKey: 'products.gift50Desc', type: 'digital', name: 'Gift 50 MSI Coin', description: 'Подарок на 50 MSI Coin.', rating: 4.5, ratingCount: 92 },
  { id: 'tg-gift-150', image: './images/telegram-gift-stars.svg', price: 150, nameKey: 'products.gift150', descKey: 'products.gift150Desc', type: 'digital', name: 'Gift 150 MSI Coin', description: 'Премиум-подарок на 150 MSI Coin.', rating: 4.6, ratingCount: 77 },
  { id: 'student-sticker-pack', image: './images/student-stickers.jpg', price: 35, nameKey: 'products.stickerPack', descKey: 'products.stickerPackDesc', type: 'physical', name: 'MSI Sticker Pack', description: 'Six durable student-themed vinyl stickers.', rating: 4.9, ratingCount: 118, stock: 120 },
  { id: 'student-keychain', image: './images/student-keychain.jpg', price: 75, nameKey: 'products.keychain', descKey: 'products.keychainDesc', type: 'physical', name: 'MSI Acrylic Keychain', description: 'Clear acrylic keychain with a violet MSI design.', rating: 4.8, ratingCount: 91, stock: 80 },
  { id: 'student-phone-grip', image: './images/student-phone-grip.jpg', price: 110, nameKey: 'products.phoneGrip', descKey: 'products.phoneGripDesc', type: 'physical', name: 'MSI Phone Grip', description: 'Compact collapsible phone grip in matte charcoal.', rating: 4.7, ratingCount: 76, stock: 65 },
  { id: 'student-notebook-set', image: './images/student-notebook-set.jpg', price: 190, nameKey: 'products.notebookSet', descKey: 'products.notebookSetDesc', type: 'physical', name: 'MSI Notebook & Pen Set', description: 'A5 hardcover notebook with a matching black pen.', rating: 4.9, ratingCount: 104, stock: 55 },
  { id: 'tshirt-1', image: './images/tshirt-black.svg', price: 750, nameKey: 'products.tshirt1', descKey: 'products.tshirt1Desc', type: 'physical', name: 'T-Shirt Black Edition', description: 'Стильная футболка MSI Bot Shop.', rating: 4.7, ratingCount: 150 },
  { id: 'calc-2in1', image: './images/canculator.jpg', price: 720, nameKey: 'products.calc2in1', descKey: 'products.calc2in1Desc', type: 'physical', name: '2-in-1 Scientific Calculator with Writing Tablet', description: '2-in-1: научный калькулятор с LCD-планшетом для записей.', rating: 4.8, ratingCount: 96, stock: 20 },
  { id: 'cap-1', image: './images/cap-1.svg', price: 400, nameKey: 'products.cap1', descKey: 'products.cap1Desc', type: 'physical', name: 'Cap — Stealth', description: 'Кепка MSI Bot Shop, вариант 1.', rating: 4.3, ratingCount: 48 },
  { id: 'cap-2', image: './images/cap-2.svg', price: 400, nameKey: 'products.cap2', descKey: 'products.cap2Desc', type: 'physical', name: 'Cap — Shadow', description: 'Кепка MSI Bot Shop, вариант 2.', rating: 4.4, ratingCount: 52 },
  { id: 'cap-3', image: './images/cap-3.svg', price: 400, nameKey: 'products.cap3', descKey: 'products.cap3Desc', type: 'physical', name: 'Cap — Phantom', description: 'Кепка MSI Bot Shop, вариант 3.', rating: 4.5, ratingCount: 41 },
  { id: 'la2-bundle', image: './images/course.svg', price: 1200, nameKey: 'products.la2', descKey: 'products.la2Desc', type: 'digital', name: 'Course bundle · Linear Algebra II', description: 'Полный пакет Linear Algebra II: конспекты, задачи, записи лекций.', rating: 4.9, ratingCount: 86, course: { id: 'course-la2', title: 'Linear Algebra II', url: 'https://lms.msi.uz/courses/linear-algebra-2' } },
  { id: 'calc-notebook', image: './images/notebook.svg', price: 180, nameKey: 'products.notebook', descKey: 'products.notebookDesc', type: 'physical', name: 'Calculus notebook', description: 'Фирменный тетрадный блокнот по математике.', rating: 4.6, ratingCount: 132 },
  { id: 'msi-hoodie', image: './images/hoodie.svg', price: 900, nameKey: 'products.hoodie', descKey: 'products.hoodieDesc', type: 'physical', name: 'Hoodie — Midnight', description: 'Тёплый худи MSI Bot Shop.', rating: 4.7, ratingCount: 58 },
  { id: 'tg-premium-3m', image: './images/telegram-premium.svg', price: 80, nameKey: 'products.prem3', descKey: 'products.prem3Desc', type: 'digital', name: 'Telegram Premium 3 мес.', description: 'Премиум-подписка на 3 месяца.', rating: 4.7, ratingCount: 134 },
  { id: 'spotify-premium', image: './images/spotify.svg', price: 95, nameKey: 'products.spotify', descKey: 'products.spotifyDesc', type: 'digital', name: 'Spotify Premium 3 мес.', description: 'Премиум Spotify на 3 месяца.', rating: 4.6, ratingCount: 88 },
  { id: 'yt-premium', image: './images/youtube.svg', price: 95, nameKey: 'products.yt', descKey: 'products.ytDesc', type: 'digital', name: 'YouTube Premium 3 мес.', description: 'YouTube без рекламы на 3 месяца.', rating: 4.6, ratingCount: 97 },
  { id: 'msi-buds', image: './images/headphones.svg', price: 450, nameKey: 'products.buds', descKey: 'products.budsDesc', type: 'physical', name: 'MSI Buds', description: 'Беспроводные наушники MSI Buds с кейсом.', rating: 4.7, ratingCount: 41, stock: 15 },
  { id: 'msi-bottle', image: './images/bottle.svg', price: 350, nameKey: 'products.bottle', descKey: 'products.bottleDesc', type: 'physical', name: 'MSI Bottle', description: 'Стальная бутылка MSI, 600 мл.', rating: 4.5, ratingCount: 63, stock: 40 },
  { id: 'msi-tote', image: './images/tote.svg', price: 300, nameKey: 'products.tote', descKey: 'products.toteDesc', type: 'physical', name: 'MSI Tote Bag', description: 'Вместительный шопер MSI.', rating: 4.4, ratingCount: 38, stock: 50 },
  { id: 'msi-deskmat', image: './images/deskmat.svg', price: 280, nameKey: 'products.deskmat', descKey: 'products.deskmatDesc', type: 'physical', name: 'MSI Desk Mat', description: 'Большой коврик для стола и мыши.', rating: 4.6, ratingCount: 45, stock: 35 },
  { id: 'msi-mug', image: './images/mug.svg', price: 220, nameKey: 'products.mug', descKey: 'products.mugDesc', type: 'physical', name: 'MSI Mug', description: 'Керамическая кружка MSI, 350 мл.', rating: 4.5, ratingCount: 72, stock: 60 },
  { id: 'tshirt-white', image: './images/tshirt-white.svg', price: 700, nameKey: 'products.tshirtWhite', descKey: 'products.tshirtWhiteDesc', type: 'physical', name: 'T-Shirt White Edition', description: 'Светлая футболка MSI Bot Shop.', rating: 4.6, ratingCount: 84, stock: 25 },
  { id: 'cap-4', image: './images/cap-black.svg', price: 400, nameKey: 'products.cap4', descKey: 'products.cap4Desc', type: 'physical', name: 'Cap — Onyx', description: 'Чёрная кепка MSI Bot Shop.', rating: 4.5, ratingCount: 33, stock: 30 },
  { id: 'physics-bundle', image: './images/course.svg', price: 1100, nameKey: 'products.physics', descKey: 'products.physicsDesc', type: 'digital', name: 'Course bundle · Physics I', description: 'Полный пакет Physics I: конспекты, задачи, записи лекций.', rating: 4.8, ratingCount: 54, course: { id: 'course-physics', title: 'Physics I', url: 'https://lms.msi.uz/courses/physics-1' } },
  { id: 'chem-bundle', image: './images/course.svg', price: 1000, nameKey: 'products.chem', descKey: 'products.chemDesc', type: 'digital', name: 'Course bundle · Chemistry', description: 'Полный пакет Chemistry: конспекты, задачи, записи лекций.', rating: 4.7, ratingCount: 47, course: { id: 'course-chem', title: 'Chemistry', url: 'https://lms.msi.uz/courses/chemistry' } },
  { id: 'ielts-bundle', image: './images/course.svg', price: 950, nameKey: 'products.ielts', descKey: 'products.ieltsDesc', type: 'digital', name: 'Course bundle · IELTS Prep', description: 'Подготовка к IELTS: стратегии, тесты, speaking-практика.', rating: 4.9, ratingCount: 61, course: { id: 'course-ielts', title: 'IELTS Prep', url: 'https://lms.msi.uz/courses/ielts' } },
];

const DEFAULT_SLOTS: PickupSlot[] = [
  { id: 'slot-1', label: 'After Calculus II', when: 'Tue 14:30', location: 'Campus A · Room 112' },
  { id: 'slot-2', label: 'After Physics Lab', when: 'Wed 16:00', location: 'Campus A · Room 214' },
  { id: 'slot-3', label: 'Before Linear Algebra', when: 'Thu 09:00', location: 'Campus B · Atrium' },
  { id: 'slot-4', label: 'Friday after classes', when: 'Fri 13:00', location: 'Campus A · Lobby' },
];

const DEFAULT_BANNERS: Banner[] = [
  { id: 'banner-1', title: 'Telegram Premium', subtitle: 'Подписка на 6 и 12 месяцев', description: 'Получите все премиум-функции Telegram прямо сейчас', image: './images/telegram-premium.svg', accent: '#666666', icon: '💎', active: true, productIds: ['tg-premium-6m', 'tg-premium-12m'] },
  { id: 'banner-2', title: 'MSI Coin', subtitle: 'Подарочные MSI Coin', description: 'Отправляйте подарки друзьям и близким', image: './images/telegram-gift-stars.svg', accent: '#999999', icon: 'Ⓒ', active: true, productIds: ['tg-gift-25', 'tg-gift-50', 'tg-gift-150'] },
  { id: 'banner-3', title: 'Merch Collection', subtitle: 'Эксклюзивный мерч', description: 'Футболки и кепки MSI Bot Shop', image: './images/tshirt-black.svg', accent: '#333333', icon: '👕', active: true, productIds: ['tshirt-1', 'cap-1', 'cap-2', 'cap-3'] },
];

const DEFAULT_NEWS: News[] = [
  { id: 'news-1', title: 'Добро пожаловать в MSI Bot Shop!', description: 'Мы запустили наш магазин. Покупайте цифровые товары и мерч за MSI Coin прямо на сайте.', image: './images/telegram-gift-stars.svg', date: new Date().toISOString(), active: true },
  { id: 'news-2', title: 'Telegram Premium уже в продаже', description: 'Подписки Telegram Premium на 6 и 12 месяцев доступны для покупки. Активация происходит автоматически после оплаты.', image: './images/telegram-premium.svg', date: new Date().toISOString(), active: true },
  { id: 'news-3', title: 'Курс MSI Coin: 30 ◆ = 5 000 сум', description: '1 MSI Coin = 167 сум. Покупайте товары за MSI Coin — эквивалент в сумах показывается рядом с каждой ценой.', image: './images/telegram-gift-stars.svg', date: new Date().toISOString(), active: true },
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
  if (!lsGet('msi_news_seeded', false)) {
    lsSet('msi_news', DEFAULT_NEWS);
    lsSet('msi_news_seeded', true);
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
    if (s && s.title === 'Gift Stars') {
      s.title = def.title;
      s.subtitle = def.subtitle;
      s.icon = def.icon;
      changed = true;
    } else if (s && (s.icon === '●' || s.icon === '◆')) {
      s.icon = def.icon;
      changed = true;
    }
  }
  if (changed) lsSet('msi_banners', stored);

  const products = lsGet<Product[]>('msi_products', DEFAULT_PRODUCTS);
  let pChanged = false;
  for (const def of DEFAULT_PRODUCTS) {
    const p = products.find((x) => x.id === def.id);
    if (!p) {
      products.push({ ...def });
      pChanged = true;
      continue;
    }
    if (p.name && (p.name.startsWith('Gift ') && p.name.endsWith(' Stars'))) {
      p.name = def.name;
      p.description = def.description;
      pChanged = true;
    }
    if (p.rating === undefined && def.rating !== undefined) {
      p.rating = def.rating;
      p.ratingCount = def.ratingCount;
      pChanged = true;
    }
  }
  if (pChanged) lsSet('msi_products', products);

  const defaultOrder = new Map(DEFAULT_PRODUCTS.map((d, i) => [d.id, i]));
  const reordered = [...products].sort((a, b) => {
    const ia = defaultOrder.get(a.id) ?? DEFAULT_PRODUCTS.length;
    const ib = defaultOrder.get(b.id) ?? DEFAULT_PRODUCTS.length;
    return ia - ib;
  });
  const orderChanged = reordered.some((p, i) => p.id !== products[i]?.id);
  if (orderChanged) {
    products.splice(0, products.length, ...reordered);
    lsSet('msi_products', products);
  }

  const news = lsGet<News[]>('msi_news', DEFAULT_NEWS);
  if (news.some((n) => n.id === 'news-1') && !news.some((n) => n.id === 'news-3')) {
    const rateNews = DEFAULT_NEWS.find((n) => n.id === 'news-3');
    if (rateNews) {
      news.unshift(rateNews);
      lsSet('msi_news', news);
    }
  }

  ensureDemoData();
}

function ensureDemoData() {
  const users = lsGet<StoredUser[]>('msi_users', []);
  const DEMO_USER: StoredUser = {
    id: 'student-2023114',
    name: 'Aisha Karimova',
    email: 'aisha@msi.uz',
    phone: '+998 90 123 45 67',
    address: 'Campus A',
    balance: 2480,
    group: 'IT-203',
    studentId: '2023114',
    discount: 10,
    earned: 2120,
    password: 'demo',
  };
  if (!users.some((u) => u.email === DEMO_USER.email)) {
    users.push(DEMO_USER);
    lsSet('msi_users', users);
  }

  const orders = lsGet<Order[]>('msi_orders', []);
  const la2 = DEFAULT_PRODUCTS.find((p) => p.id === 'la2-bundle');
  const nb = DEFAULT_PRODUCTS.find((p) => p.id === 'calc-notebook');
  const demoOrders: Order[] = [
    {
      id: 'order-demo-1',
      items: la2 ? [{ product: la2, quantity: 1 }] : [],
      totalPrice: 1080,
      originalPrice: 1200,
      customerName: 'Aisha Karimova',
      customerPhone: '+998 90 123 45 67',
      deliveryAddress: 'Campus A · Room 112',
      deliveryMethod: 'pickup',
      userId: 'student-2023114',
      customerEmail: 'aisha@msi.uz',
      status: 'ready',
      pickupCode: 'K-4821',
      pickupSlot: 'After Calculus II · Tue 14:30',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: 'order-demo-2',
      items: nb ? [{ product: nb, quantity: 1 }] : [],
      totalPrice: 162,
      originalPrice: 180,
      customerName: 'Aisha Karimova',
      customerPhone: '+998 90 123 45 67',
      deliveryAddress: 'Campus A · Lobby',
      deliveryMethod: 'pickup',
      userId: 'student-2023114',
      customerEmail: 'aisha@msi.uz',
      status: 'collected',
      pickupCode: 'K-3307',
      pickupSlot: 'Friday after classes · Fri 13:00',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
  ];
  if (!lsGet('msi_demo_orders_seeded', false)) {
    orders.push(...demoOrders);
    lsSet('msi_orders', orders);
    lsSet('msi_demo_orders_seeded', true);
  }
}

interface StoredUser {
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
  password: string;
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
//  NEWS API
// ============================================================

export async function fetchNews(): Promise<News[]> {
  seed();
  return lsGet<News[]>('msi_news', DEFAULT_NEWS);
}

export async function createNews(data: Omit<News, 'id'>): Promise<News> {
  const news: News = {
    ...data,
    id: 'news-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
  };
  const list = lsGet<News[]>('msi_news', DEFAULT_NEWS);
  list.unshift(news);
  lsSet('msi_news', list);
  return news;
}

export async function updateNews(id: string, data: Partial<News>): Promise<News | null> {
  const list = lsGet<News[]>('msi_news', DEFAULT_NEWS);
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data };
  lsSet('msi_news', list);
  return list[idx];
}

export async function deleteNews(id: string): Promise<void> {
  const list = lsGet<News[]>('msi_news', DEFAULT_NEWS).filter((n) => n.id !== id);
  lsSet('msi_news', list);
}

// ============================================================
//  ORDERS API
// ============================================================

export async function fetchOrders(): Promise<Order[]> {
  return lsGet<Order[]>('msi_orders', []);
}

// ============================================================
//  PICKUP SLOTS API
// ============================================================

export async function fetchSlots(): Promise<PickupSlot[]> {
  return DEFAULT_SLOTS;
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
