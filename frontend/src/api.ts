import type {
  AdminBootstrap,
  AppNotification,
  Banner,
  CatalogCategory,
  News,
  Order,
  OrderStatus,
  PickupSlot,
  Product,
  User,
} from './types';


const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const USER_TOKEN_KEY = 'msi_user_token';
const ADMIN_TOKEN_KEY = 'msi_admin_token';

interface AuthResult {
  token: string;
  user: User;
}

export interface CreateOrderInput {
  productId: string;
  variantId?: string;
  requestId?: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryMethod: 'courier' | 'pickup' | 'post' | 'digital';
  pickupSlot?: string;
}

export interface CreateOrderResult {
  order: Order;
  user: User;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getStoredToken(key: string): string | null {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

export function getUserToken(): string | null {
  return getStoredToken(USER_TOKEN_KEY);
}

export function saveUserSession(result: AuthResult): User {
  localStorage.setItem(USER_TOKEN_KEY, result.token);
  localStorage.setItem('msi_current_user', JSON.stringify(result.user));
  return result.user;
}

export function clearUserSession(): void {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem('msi_current_user');
}

function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json() as { detail?: string; message?: string; error?: string };
      message = body.detail || body.message || body.error || message;
    } catch { /* use the status message */ }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function json(method: string, data?: unknown): RequestInit {
  return { method, body: data === undefined ? undefined : JSON.stringify(data) };
}

export function fetchProducts(): Promise<Product[]> {
  return request('/products');
}

export function fetchCategories(): Promise<CatalogCategory[]> {
  return request('/categories');
}

export function createCategory(data: Omit<CatalogCategory, 'position' | 'id'> & { id?: string }): Promise<CatalogCategory> {
  return request('/categories', json('POST', data), getAdminToken());
}

export function updateCategory(id: string, data: Partial<CatalogCategory>): Promise<CatalogCategory> {
  return request(`/categories/${encodeURIComponent(id)}`, json('PATCH', data), getAdminToken());
}

export function createProduct(data: Omit<Product, 'id'>): Promise<Product> {
  return request('/products', json('POST', data), getAdminToken());
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product | null> {
  try {
    return await request(`/products/${encodeURIComponent(id)}`, json('PATCH', data), getAdminToken());
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function deleteProduct(id: string): Promise<void> {
  return request(`/products/${encodeURIComponent(id)}`, json('DELETE'), getAdminToken());
}

export function fetchBanners(): Promise<Banner[]> {
  return request('/banners');
}

export function createBanner(data: Omit<Banner, 'id'>): Promise<Banner> {
  return request('/banners', json('POST', data), getAdminToken());
}

export async function updateBanner(id: string, data: Partial<Banner>): Promise<Banner | null> {
  try {
    return await request(`/banners/${encodeURIComponent(id)}`, json('PATCH', data), getAdminToken());
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function deleteBanner(id: string): Promise<void> {
  return request(`/banners/${encodeURIComponent(id)}`, json('DELETE'), getAdminToken());
}

export function fetchNews(): Promise<News[]> {
  return request('/news');
}

export function createNews(data: Omit<News, 'id'>): Promise<News> {
  return request('/news', json('POST', data), getAdminToken());
}

export async function updateNews(id: string, data: Partial<News>): Promise<News | null> {
  try {
    return await request(`/news/${encodeURIComponent(id)}`, json('PATCH', data), getAdminToken());
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function deleteNews(id: string): Promise<void> {
  return request(`/news/${encodeURIComponent(id)}`, json('DELETE'), getAdminToken());
}

export function fetchOrders(): Promise<Order[]> {
  return request('/orders', {}, getUserToken());
}

export function createOrder(data: CreateOrderInput): Promise<CreateOrderResult> {
  return request('/orders', json('POST', data), getUserToken());
}

export function fetchSlots(): Promise<PickupSlot[]> {
  return request('/pickup-slots');
}

export async function authenticateTelegram(initData: string): Promise<User | null> {
  try {
    return saveUserSession(await request<AuthResult>('/auth/telegram', json('POST', { initData })));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) return null;
    throw error;
  }
}

export async function loginStudent(studentId: string, password: string): Promise<User> {
  return saveUserSession(await request<AuthResult>('/auth/login', json('POST', { studentId, password })));
}

export function fetchCurrentUser(): Promise<User> {
  return request('/auth/me', {}, getUserToken());
}

export function updateCurrentUser(data: Pick<Partial<User>, 'name' | 'phone' | 'address' | 'avatar'>): Promise<User> {
  return request('/auth/me', json('PATCH', data), getUserToken());
}

export async function logoutUser(): Promise<void> {
  try {
    await request('/auth/logout', json('POST'), getUserToken());
  } finally {
    clearUserSession();
  }
}

export function fetchNotifications(): Promise<AppNotification[]> {
  return request('/auth/notifications', {}, getUserToken());
}

export function markNotificationsRead(): Promise<void> {
  return request('/auth/notifications/read-all', json('POST'), getUserToken());
}

// Existing admin API exports are preserved for callers that use src/api.ts.
export async function login(password: string): Promise<boolean> {
  try {
    const result = await request<{ token: string }>('/admin/login', json('POST', { password }));
    sessionStorage.setItem(ADMIN_TOKEN_KEY, result.token);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    throw error;
  }
}

export async function logout(): Promise<void> {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  try {
    await request('/admin/me', {}, token);
    return true;
  } catch {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    return false;
  }
}

export function fetchAdminBootstrap(): Promise<AdminBootstrap> {
  return request('/admin/bootstrap', {}, getAdminToken());
}

export function updateAdminOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return request(`/orders/${encodeURIComponent(id)}/status`, json('PATCH', { status }), getAdminToken());
}

export function changeAdminUserBalance(
  id: string,
  amount: number,
  note: string,
): Promise<{ user: User; amount: number }> {
  return request(
    `/admin/users/${encodeURIComponent(id)}/balance`,
    json('POST', { amount, note }),
    getAdminToken(),
  );
}
