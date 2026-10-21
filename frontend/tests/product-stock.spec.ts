import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getProductStock, getVariantStock } from '../src/utils/productStock';
import { filterProducts } from '../src/utils/productFilters';
import type { Product } from '../src/types';

test('stock totals count shared inventory once and exclude hidden variants', () => {
  const product: Product = { id: 'stock', image: '', price: 1, nameKey: '', descKey: '', stock: 5,
    variants: [
      { id: 'a', label: 'A', price: 1, active: true, stock: null },
      { id: 'b', label: 'B', price: 1, active: true },
      { id: 'c', label: 'C', price: 1, active: true, stock: 2 },
      { id: 'd', label: 'D', price: 1, active: false, stock: 100 },
    ] };
  expect(getProductStock(product)).toBe(7);
  expect(getVariantStock(product, product.variants![0])).toBe(5);
  expect(getProductStock({ ...product, stock: null })).toBeNull();
  expect(getProductStock({ ...product, variants: product.variants!.map((item) => ({ ...item, active: false })) })).toBe(0);
  expect(getProductStock({ ...product, stock: 0, variants: [] })).toBe(0);
  expect(getProductStock({ ...product, stock: null, variants: [] })).toBeNull();
  expect(filterProducts([
    { ...product, id: 'sold-out', type: 'digital', stock: 0, variants: [] },
    { ...product, id: 'variant-stock', type: 'physical', stock: 0 },
    { ...product, id: 'unlimited', type: 'digital', stock: null, variants: [] },
  ], { type: 'all', inStock: true, search: '', minPrice: 0, maxPrice: 0 }).map((item) => item.id))
    .toEqual(['variant-stock', 'unlimited']);
});

for (const width of [390, 1280, 1440]) {
  test(`admin quantity saves, failures keep drafts, and students see purchase stock at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const login = await (await request.post('/api/admin/login', { data: { password: 'browser-test-password' } })).json();
    const admin = { Authorization: `Bearer ${login.token}` };
    const title = `Availability ${randomUUID().slice(0, 8)}`;
    const product = await (await request.post('/api/products', { headers: admin, data: {
      name: title, price: 1, stock: null, categoryId: 'digital', image: '/images/mug.svg',
      fulfillmentType: width === 1280 ? 'physical_pickup' : 'digital_delivery',
    } })).json();
    await page.goto('/admin-login.html');
    await page.getByLabel('Пароль администратора').fill('browser-test-password');
    await page.getByRole('button', { name: 'Войти →' }).click();
    await page.getByLabel('Поиск по названию').fill(title);
    const row = page.getByRole('row').filter({ hasText: title });
    await row.getByRole('button', { name: 'Редактировать' }).click();
    const editor = page.getByRole('dialog');
    const quantity = editor.getByRole('spinbutton', { name: /Количество в наличии/ });
    await expect(quantity).toHaveValue('');
    await quantity.fill('3');
    await page.route(`**/api/products/${product.id}`, (route) => route.fulfill({ status: 503, json: { detail: 'Stock save failed' } }));
    await editor.getByRole('button', { name: 'Сохранить товар' }).click();
    await expect(editor.getByRole('alert')).toContainText('Stock save failed');
    await expect(quantity).toHaveValue('3');
    await page.screenshot({ path: `/tmp/msi-shop-stock-qa/admin-error-${width}.png` });
    await page.unroute(`**/api/products/${product.id}`);
    await editor.getByRole('button', { name: 'Сохранить товар' }).click();
    await expect(editor).toBeHidden();
    await expect(row).toContainText('В наличии: 3 шт.');
    await page.reload();
    await page.getByLabel('Поиск по названию').fill(title);
    await row.getByRole('button', { name: 'Редактировать' }).click();
    await expect(quantity).toHaveValue('3');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/msi-shop-stock-qa/admin-${width}.png` });
    const student = await (await request.post('/api/auth/login', { data: { studentId: '2023114', password: 'demo' } })).json();
    await page.evaluate((auth) => {
      localStorage.setItem('msi_user_token', auth.token);
      localStorage.setItem('msi_current_user', JSON.stringify(auth.user));
    }, student);
    await page.goto('/?view=catalog');
    const card = page.locator('.product-card').filter({ has: page.getByRole('button', { name: title, exact: true }) });
    await expect(card).toContainText('В наличии: 3');
    await card.getByRole('button', { name: title, exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('В наличии: 3');
    await page.screenshot({ path: `/tmp/msi-shop-stock-qa/student-${width}.png` });
    await page.getByRole('button', { name: 'Купить', exact: true }).click();
    await page.locator('.checkout-form__submit').click();
    await expect(page.locator('.success-modal')).toBeVisible();
    await page.locator('.success-modal').getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(card).toContainText('В наличии: 2');
    expect((await (await request.get(`/api/products/${product.id}`)).json()).stock).toBe(2);
    await card.getByRole('button', { name: title, exact: true }).click();
    await page.getByRole('button', { name: 'Купить', exact: true }).click();
    await request.patch(`/api/products/${product.id}`, { headers: admin, data: { stock: 0 } });
    await page.locator('.checkout-form__submit').click();
    await expect(page.locator('.checkout-form__insufficient')).toHaveText('Нет в наличии');
    await page.locator('.checkout-drawer').getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(card).toContainText('Нет в наличии');
    await card.getByRole('button', { name: title, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Нет в наличии', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/msi-shop-stock-qa/sold-out-${width}.png` });
    expect(errors).toEqual([]);
  });
}

test('digital variant quantities persist, total correctly, and drive selection and stock filters', async ({ page, request }) => {
  const login = await (await request.post('/api/admin/login', { data: { password: 'browser-test-password' } })).json();
  const admin = { Authorization: `Bearer ${login.token}` };
  const title = `Variant stock ${randomUUID().slice(0, 8)}`;
  const product = await (await request.post('/api/products', { headers: admin, data: {
    name: title, price: 1, stock: null, image: '/images/mug.svg', categoryId: 'digital', fulfillmentType: 'digital_delivery',
    variants: [{ id: 'small', label: 'Small', price: 1, stock: 0 }, { id: 'large', label: 'Large', price: 2, stock: 4 }],
  } })).json();
  await page.goto('/admin-login.html');
  await page.getByLabel('Пароль администратора').fill('browser-test-password');
  await page.getByRole('button', { name: 'Войти →' }).click();
  await page.getByLabel('Поиск по названию').fill(title);
  await page.getByRole('row').filter({ hasText: title }).getByRole('button', { name: 'Редактировать' }).click();
  await page.getByText('Количество по вариантам', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Количество Large', exact: true }).fill('5');
  await page.getByRole('button', { name: 'Сохранить товар' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const persisted = await (await request.get(`/api/products/${product.id}`)).json();
  expect(persisted.variants.map((item: { stock: number }) => item.stock)).toEqual([0, 5]);
  await page.goto('/?view=catalog');
  const card = page.locator('.product-card').filter({ has: page.getByRole('button', { name: title, exact: true }) });
  await expect(card).toContainText('В наличии: 5');
  await card.getByRole('button', { name: title, exact: true }).click();
  await expect(page.getByRole('button', { name: /Small.*Нет в наличии/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Large.*В наличии: 5/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Купить', exact: true })).toBeEnabled();
  await page.screenshot({ path: '/tmp/msi-shop-stock-qa/variants.png' });
});
