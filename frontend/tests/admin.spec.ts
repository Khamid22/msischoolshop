import { test, expect } from '@playwright/test';

const image = { name: 'test.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="purple"/></svg>') };

test.beforeEach(async ({ page }) => {
  await page.goto('/admin-login.html');
  await page.getByLabel('Пароль администратора').fill('browser-test-password');
  await page.getByRole('button', { name: 'Войти →' }).click();
  await expect(page.getByRole('heading', { name: 'Каталог товаров', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Добавить товар' })).toBeVisible();
});

test('product create, filters, edit zero discount, persistence and deletion', async ({ page }) => {
  const title = `Browser product ${Date.now()}`;
  await page.getByRole('button', { name: 'Добавить товар' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название', { exact: true }).fill(title);
  await dialog.getByLabel('Цена, коины').fill('100');
  await dialog.getByLabel('После покупки').selectOption('physical_pickup');
  await dialog.getByLabel('Остаток', { exact: false }).fill('4');
  await dialog.getByLabel('Скидка, %').fill('25');
  await dialog.locator('input[type=file]').setInputFiles(image);
  await expect(dialog.getByAltText('Предпросмотр товара')).toBeVisible();
  await dialog.getByRole('button', { name: 'Сохранить товар' }).click();
  await expect(dialog).toBeHidden();
  await page.getByLabel('Поиск по названию').fill(title);
  let row = page.getByRole('row').filter({ hasText: title });
  await expect(row).toContainText('75');
  await row.getByRole('button', { name: 'Редактировать' }).click();
  await dialog.getByLabel('Скидка, %').fill('0');
  await dialog.getByRole('button', { name: 'Сохранить товар' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('Поиск по названию')).toHaveValue(title);
  await page.reload();
  await page.getByLabel('Поиск по названию').fill(title);
  row = page.getByRole('row').filter({ hasText: title });
  await expect(row).toContainText('100');
  await expect(row.locator('del')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Тип', exact: true }).selectOption('digital');
  await expect(page.getByText('Товары не найдены')).toBeVisible();
  await page.getByRole('combobox', { name: 'Тип', exact: true }).selectOption('physical');
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: `Удалить ${title}`, exact: true }).click();
  await expect(page.getByText('Товары не найдены')).toBeVisible();
});

test('content publication and category editors persist through API', async ({ page }) => {
  for (const kind of ['banner', 'news'] as const) {
    const title = `Browser ${kind} ${Date.now()}`;
    await page.locator('.admin-nav').getByRole('button', { name: kind === 'banner' ? /Баннеры/ : /Новости/ }).click();
    await page.getByRole('button', { name: kind === 'banner' ? 'Добавить баннер' : 'Добавить новость', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Заголовок', { exact: true }).fill(title);
    await dialog.getByLabel('Описание', { exact: true }).fill('Saved through the API');
    await dialog.locator('input[type=file]').setInputFiles(image);
    await expect(dialog.getByAltText('Предпросмотр')).toBeVisible();
    await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(dialog).toBeHidden();
    const row = page.getByRole('row').filter({ hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Опубликовано' }).click();
    await expect(row.getByRole('button', { name: 'Скрыто' })).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: `Удалить ${title}` }).click();
    await expect(row).toHaveCount(0);
  }
  await page.locator('.admin-nav').getByRole('button', { name: /Каталог товаров/ }).click();
  await page.getByRole('button', { name: 'Категории', exact: true }).click();
  await page.getByRole('button', { name: 'Добавить категорию' }).click();
  await page.getByLabel('Название на русском').fill('Browser category');
  await page.getByLabel('На узбекском').fill('Browser category uz');
  await page.getByLabel('На английском').fill('Browser category en');
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('row').filter({ hasText: 'Browser category' }).last()).toBeVisible();
});

test('balance success and rejected withdrawal, analytics CSV, order errors', async ({ page, request }) => {
  const login = await request.post('/api/auth/login', { data: { studentId: '2023114', password: 'demo' } });
  const session = await login.json();
  const purchase = await request.post('/api/orders', { headers: { Authorization: `Bearer ${session.token}` }, data: { productId: 'student-sticker-pack', quantity: 1, customerName: 'Browser student', deliveryMethod: 'pickup', requestId: `browser-order-${Date.now()}` } });
  expect(purchase.ok()).toBeTruthy();
  await page.locator('.admin-nav').getByRole('button', { name: /Пользователи/ }).click();
  await page.getByRole('button', { name: 'Изменить баланс' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Количество MSI Coin').fill('25');
  await dialog.getByLabel('Причина').fill('Browser test');
  await dialog.getByRole('button', { name: 'Применить' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.history-list').getByText('+25').first()).toBeVisible();
  await page.getByRole('button', { name: 'Изменить баланс' }).first().click();
  await dialog.getByRole('button', { name: 'Списать', exact: true }).click();
  await dialog.getByLabel('Количество MSI Coin').fill('999999');
  await dialog.getByLabel('Причина').fill('Overdraw test');
  await dialog.getByRole('button', { name: 'Применить' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Insufficient balance');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.locator('.admin-nav').getByRole('button', { name: /Аналитика/ }).click();
  await page.getByRole('button', { name: '7 дней', exact: true }).click();
  await expect(page.locator('.stats-grid')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Экспорт CSV/ }).click();
  expect((await download).suggestedFilename()).toBe('shop-analytics.csv');
  await page.locator('.admin-nav').getByRole('button', { name: /История заказов/ }).click();
  await page.route('**/api/orders/*/status', (route) => route.fulfill({ status: 409, json: { detail: 'Test conflict: refresh order' } }));
  await page.locator('.orders-table tbody button').first().click();
  await expect(page.getByRole('alert')).toContainText('Test conflict');
  await page.unroute('**/api/orders/*/status');
  await page.locator('.orders-table tbody button').first().click();
  await expect(page.locator('.orders-table tbody').getByText('Собран', { exact: true }).first()).toBeVisible();
});

test('mobile six sections, filter disclosure, dialog keyboard and theme', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Фильтры +' })).toBeVisible();
  await page.getByRole('button', { name: 'Фильтры +' }).click();
  await expect(page.getByLabel('Мин. цена')).toBeVisible();
  await page.getByRole('button', { name: 'Фильтры −' }).click();
  await page.getByRole('button', { name: 'Добавить товар' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Сменить тему' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Сменить тему' }).click();
  for (const title of ['Аналитика продаж', 'История заказов', 'Пользователи и MSI Coin', 'Баннеры на главной', 'Новости', 'Каталог товаров']) {
    await page.locator(`.admin-nav button[title="${title}"]`).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.screenshot({ path: '/tmp/shop-redesign-mobile-final.png' });
  expect(errors).toEqual([]);
});
