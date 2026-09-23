import { test, expect } from '@playwright/test';
import { createHmac, randomUUID } from 'node:crypto';

const image = { name: 'test.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="purple"/></svg>') };

test.beforeEach(async ({ page }) => {
  await page.goto('/admin-login.html');
  await page.getByLabel('Пароль администратора').fill('browser-test-password');
  await page.getByRole('button', { name: 'Войти →' }).click();
  await expect(page.getByRole('heading', { name: 'Каталог товаров', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Добавить товар' })).toBeVisible();
});

test('simple named variants persist and appear with their prices in the storefront', async ({ page, request }) => {
  const title = `Robux options ${Date.now()}`;
  await page.getByRole('button', { name: 'Добавить товар' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Название', { exact: true }).fill(title);
  await editor.getByRole('combobox', { name: 'Категория', exact: true }).selectOption('digital');
  await editor.locator('input[type=file]').setInputFiles(image);
  for (const [index, label, price] of [[0, '270 Robux', '540'], [1, '500 Robux', '880']] as const) {
    await editor.getByRole('button', { name: 'Добавить вариант' }).click();
    const row = editor.locator('.variant-row').nth(index);
    await row.getByLabel('Название варианта').fill(label);
    await row.getByLabel('Цена, коины').fill(price);
    await expect(row.locator('input')).toHaveCount(2);
  }
  await expect(editor.getByLabel('Название выбора')).toHaveCount(0);
  await expect(editor.getByLabel('Цена, коины')).toHaveCount(2);
  await page.screenshot({ path: '/private/tmp/msi-shop-variants-admin.png' });
  await editor.getByRole('button', { name: 'Сохранить товар' }).click();
  await expect(editor).toBeHidden();
  await page.getByLabel('Поиск по названию').fill(title);
  const catalogRow = page.getByRole('row').filter({ hasText: title });
  await expect(catalogRow).toContainText('Вариантов: 2');
  await expect(catalogRow).toContainText('540');
  await catalogRow.getByRole('button', { name: 'Редактировать' }).click();
  await editor.locator('.variant-row').first().getByLabel('Название варианта').fill('300 Robux');
  await editor.locator('.variant-row').first().getByLabel('Цена, коины').fill('560');
  await editor.getByRole('button', { name: 'Добавить вариант' }).click();
  await editor.locator('.variant-row').last().getByLabel('Название варианта').fill('Temporary');
  await editor.getByRole('button', { name: 'Удалить вариант Temporary' }).click();
  await editor.getByRole('button', { name: 'Сохранить товар' }).click();
  await expect(editor).toBeHidden();
  await page.reload();
  await page.getByLabel('Поиск по названию').fill(title);
  await expect(catalogRow).toContainText('560');
  await catalogRow.getByRole('button', { name: 'Редактировать' }).click();
  await expect(editor.getByLabel('Название варианта').first()).toHaveValue('300 Robux');
  await expect(editor.getByLabel('Цена, коины').first()).toHaveValue('560');
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.locator('.variant-editor').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/private/tmp/msi-shop-variants-admin-mobile.png' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Каталог', exact: true }).click();
  await page.getByRole('button', { name: title, exact: true }).click();
  const detail = page.getByRole('dialog');
  await expect(detail.getByRole('button', { name: /300 Robux/ })).toContainText('560');
  const large = detail.getByRole('button', { name: /500 Robux/ });
  await large.click();
  await expect(large).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.detail__purchase-price')).toContainText('880');
  await page.screenshot({ path: '/private/tmp/msi-shop-variants-store.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const session = await (await request.post('/api/auth/login', { data: { studentId: '2023114', password: 'demo' } })).json();
  await page.evaluate((value) => {
    localStorage.setItem('msi_user_token', value.token);
    localStorage.setItem('msi_current_user', JSON.stringify(value.user));
  }, session);
  await page.reload();
  await page.getByRole('button', { name: 'Каталог', exact: true }).click();
  await page.getByRole('button', { name: title, exact: true }).click();
  await page.getByRole('button', { name: /500 Robux/ }).click();
  await page.getByRole('button', { name: 'Купить', exact: true }).click();
  await expect(page.locator('.checkout-drawer')).toContainText('500 Robux');
  await expect(page.locator('.checkout-drawer')).toContainText('792');
});

test('product create, filters, edit zero discount, persistence and deletion', async ({ page }) => {
  const title = `Browser product ${Date.now()}`;
  await page.getByRole('button', { name: 'Добавить товар' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название', { exact: true }).fill(title);
  await dialog.getByLabel('Цена, коины').fill('100');
  await dialog.getByRole('combobox', { name: 'После покупки', exact: true }).selectOption('physical_pickup');
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
  await page.getByRole('button', { name: 'Ночной режим' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Ночной режим' }).click();
  for (const title of ['Аналитика продаж', 'История заказов', 'Пользователи и MSI Coin', 'Баннеры на главной', 'Новости', 'Каталог товаров']) {
    await page.locator(`.admin-nav button[title="${title}"]`).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.screenshot({ path: '/tmp/shop-redesign-mobile-final.png' });
  expect(errors).toEqual([]);
});

test('LMS SSO iframe opens the current admin instead of an old unversioned document', async ({ page }) => {
  await page.evaluate(() => sessionStorage.clear());
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    aud: 'msi-shop-admin', iss: 'msi-lms', role: 'customer_support', sub: '41',
    iat: now, exp: now + 45, nonce: randomUUID(),
  })).toString('base64url');
  const signature = createHmac('sha256', 'browser-test-sso-secret-at-least-32-characters').update(payload).digest('base64url');
  const launch = `http://localhost:5179/admin-sso.html?embedded=1#assertion=${payload}.${signature}`;
  // Reproduce a browser retaining the document behind the old stable redirect.
  await page.route((url) => url.pathname === '/admin.html' && url.search === '?embedded=1',
    (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Old cached admin</h1>' }));
  let previousVersion = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto(`/tests/admin-frame.html?launch=${encodeURIComponent(launch)}`);
    const frame = page.frameLocator('iframe');
    await expect(frame.getByRole('heading', { name: 'Каталог товаров', exact: true })).toBeVisible();
    await expect(frame.locator('.admin-nav button')).toHaveCount(6);
    await expect(frame.locator('.products-table tbody tr').first()).toBeVisible();
    const url = new URL(page.frames().find((item) => item.url().includes('/admin.html'))!.url());
    expect(url.searchParams.get('embedded')).toBe('1');
    expect(url.searchParams.get('v')).toBeTruthy();
    expect(url.searchParams.get('v')).not.toBe(previousVersion);
    expect(url.hash).toBe('');
    previousVersion = url.searchParams.get('v')!;
  }
});

test('current admin keeps Robux orders actionable until the student supplies a Player ID', async ({ page }) => {
  let playerId: string | null = null;
  await page.route('**/api/admin/bootstrap', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.orders = [{
      id: 'robux-ui-regression', userId: 'test-buyer', customerName: 'Robux test buyer',
      customerPhone: '', totalPrice: 880, createdAt: '2026-09-18T12:49:00Z', status: 'paid',
      fulfillmentType: 'digital_delivery', informationRequired: !playerId,
      nextStatus: playerId ? 'sent' : undefined,
      deliveryRequirements: [{ itemIndex: 0, kind: 'roblox_player_id', playerId, editable: true,
        form: { instructions: '', links: [], fields: [{ id: 'playerId', label: 'Roblox Player ID', type: 'player_id', required: true, help: '' }] },
        answers: playerId ? { playerId } : {}, missingRequiredFields: playerId ? [] : ['playerId'],
        submittedAt: playerId ? '2026-09-23T12:00:00Z' : null }],
      items: [{ product: { id: 'product-4e53e3f6ed90', name: 'Robux', type: 'digital', price: 540 },
        variant: { id: 'robux-500', label: '500 Robux', price: 880 }, quantity: 1 }],
    }];
    await route.fulfill({ response, json: data });
  });
  await page.goto('/admin.html?tab=orders');
  await expect(page.getByRole('heading', { name: 'История заказов', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Разделы магазина' }).getByRole('button')).toHaveCount(6);
  await page.getByRole('combobox', { name: 'Статус', exact: true }).selectOption('action');
  const row = page.getByRole('row').filter({ hasText: 'Robux test buyer' });
  await expect(row).toContainText('500 Robux');
  await expect(row).toContainText('Нужны данные');
  await expect(row).toContainText('Ожидаем данные');
  await expect(row.getByRole('button', { name: 'Отправить', exact: true })).toHaveCount(0);
  await expect(row).not.toContainText('Завершён');
  playerId = '123456789';
  await page.reload();
  await expect(row).toContainText('Roblox Player ID: 123456789');
  await expect(row.getByRole('button', { name: 'Отправить', exact: true })).toBeVisible();
  await page.route('**/api/orders/robux-ui-regression/status', (route) => route.fulfill({ status: 409, json: { detail: 'Order changed; refresh' } }));
  await row.getByRole('button', { name: 'Отправить', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Order changed; refresh');
  await expect(row).toContainText('123456789');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(row).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/private/tmp/msi-shop-restored-robux-mobile.png' });
});
