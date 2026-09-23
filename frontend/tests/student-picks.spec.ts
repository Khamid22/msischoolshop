import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { Product } from '../src/types';

for (const width of [1440, 390]) {
  test(`purchases populate Student Picks for guests at ${width}px and refresh when returning home`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const login = await request.post('/api/admin/login', { data: { password: 'browser-test-password' } });
    const admin = { Authorization: `Bearer ${(await login.json()).token}` };
    const signIn = await request.post('/api/auth/login', { data: { studentId: '2023114', password: 'demo' } });
    const buyer = await signIn.json();
    const student = { Authorization: `Bearer ${buyer.token}` };
    expect((await request.post(`/api/admin/users/${buyer.user.id}/balance`, {
      headers: admin, data: { amount: 1000, requestId: randomUUID(), note: 'Browser test' },
    })).ok()).toBeTruthy();
    const prefix = `Picks ${randomUUID().slice(0, 8)}`;
    const products: Product[] = [];
    for (const name of ['single', 'popular', 'unsold']) {
      const response = await request.post('/api/products', { headers: admin, data: {
        name: `${prefix} ${name}`, price: 10, image: '/images/mug.svg', categoryId: 'digital',
        fulfillmentType: 'digital_delivery', carousel: name === 'unsold',
      } });
      expect(response.status()).toBe(201);
      products.push(await response.json());
    }
    async function purchase(index: number, quantity: number) {
      const response = await request.post('/api/orders', { headers: student, data: {
        productId: products[index].id, quantity, requestId: randomUUID(), customerName: 'Browser buyer',
      } });
      expect(response.status()).toBe(201);
    }
    await purchase(0, 1);
    await purchase(1, 3);
    await page.goto('/');
    const section = page.getByRole('region', { name: 'Выбор студентов' });
    const titles = section.getByRole('button').filter({ hasText: prefix });
    await expect(titles).toHaveText([products[1].name, products[0].name]);
    await expect(section.getByText(products[2].name)).toHaveCount(0);
    await section.getByRole('button', { name: products[1].name, exact: true }).click();
    await expect(page.getByRole('dialog', { name: products[1].name })).toBeVisible();
    await page.keyboard.press('Escape');
    await section.getByRole('button', { name: 'Все', exact: true }).click();
    await expect(page).toHaveURL(/view=catalog/);
    await expect(page.getByRole('button', { name: products[2].name, exact: true })).toBeVisible();
    await purchase(0, 4);
    await page.locator('.bottomnav').getByRole('button', { name: 'Магазин', exact: true }).click();
    await expect(titles).toHaveText([products[0].name, products[1].name]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `/private/tmp/msi-student-picks-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
    for (const product of products) {
      expect((await request.delete(`/api/products/${product.id}`, { headers: admin })).status()).toBe(204);
    }
  });
}

test('Student Picks shows loading and a translated empty state', async ({ page }) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/student-picks', async (route) => {
    await ready;
    await route.fulfill({ json: [] });
  });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Выбор студентов' });
  await expect(section.locator('.skeleton')).toHaveCount(8);
  release();
  await expect(section.getByText('Здесь появятся товары, которые чаще всего покупают студенты.')).toBeVisible();
  await expect(section.locator('.skeleton')).toHaveCount(0);
  await expect(section.getByRole('article')).toHaveCount(0);
  for (const [lang, text] of [
    ['en', 'Products students buy most often will appear here.'],
    ['uz', 'Bu yerda talabalar eng ko‘p xarid qiladigan mahsulotlar ko‘rsatiladi.'],
  ]) {
    await page.evaluate((value) => localStorage.setItem('lang', value), lang);
    await page.reload();
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  }
});

test('a failed request offers retry without claiming there are no purchases', async ({ page }) => {
  let failed = true;
  await page.route('**/api/student-picks', (route) => route.fulfill(failed
    ? { status: 503, json: { detail: 'Temporarily unavailable' } }
    : { json: [{ id: 'recovered', name: 'Recovered pick', nameKey: '', price: 10, image: '/images/mug.svg' }] }));
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Выбор студентов' });
  await expect(section.getByRole('alert')).toContainText('Не удалось загрузить выбор студентов.');
  await expect(section.getByText('Здесь появятся товары, которые чаще всего покупают студенты.')).toHaveCount(0);
  failed = false;
  await section.getByRole('button', { name: 'Попробовать снова' }).click();
  await expect(section.getByRole('button', { name: 'Recovered pick', exact: true })).toBeVisible();
  await expect(section.getByRole('alert')).toHaveCount(0);
});
