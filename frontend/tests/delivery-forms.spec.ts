import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const profileUrl = 'https://www.roblox.com/share?code=cf4cd3ed2f25f445838ed6867ba5cc3b&type=Profile&source=ProfileShare&stamp=1790162565396';
const image = { name: 'product.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="purple"/></svg>') };

for (const width of [1440, 390]) {
  test(`staff configure instructions and buyers submit delivery data at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/admin-login.html');
    await page.getByLabel('Пароль администратора').fill('browser-test-password');
    await page.getByRole('button', { name: 'Войти →' }).click();
    await page.getByRole('button', { name: 'Добавить товар' }).click();
    const editor = page.getByRole('dialog');
    const name = `Digital delivery ${randomUUID().slice(0, 8)}`;
    await editor.getByLabel('Название', { exact: true }).fill(name);
    await editor.getByRole('combobox', { name: 'Категория', exact: true }).selectOption('digital');
    await editor.getByRole('combobox', { name: 'После покупки', exact: true }).selectOption('digital_delivery');
    await editor.getByLabel('Цена, коины', { exact: true }).fill('25');
    await editor.locator('input[type=file]').setInputFiles(image);
    await editor.getByLabel('Настроить действия после покупки').check();
    await editor.getByLabel('Инструкция для ученика').fill('Отправьте заявку в друзья и укажите данные аккаунта.');
    for (const [index, label, url] of [[0, 'Наш профиль Roblox', profileUrl], [1, 'Инструкция', 'https://example.test/guide']] as const) {
      await editor.getByRole('button', { name: 'Добавить ссылку', exact: true }).click();
      await editor.getByLabel('Текст кнопки', { exact: true }).nth(index).fill(label);
      await editor.getByLabel('Адрес ссылки', { exact: true }).nth(index).fill(url);
    }
    for (const [index, label, type] of [[0, 'Ник в игре', 'text'], [1, 'Player ID', 'player_id'], [2, 'Я отправил заявку в друзья', 'checkbox']] as const) {
      await editor.getByRole('button', { name: 'Добавить поле', exact: true }).click();
      await editor.getByLabel('Название поля', { exact: true }).nth(index).fill(label);
      await editor.getByRole('combobox', { name: 'Тип ответа', exact: true }).nth(index).selectOption(type);
      await expect(editor.getByLabel('Обязательное поле', { exact: true }).nth(index)).toBeChecked();
    }
    await expect(editor.getByRole('option', { name: /дата/i })).toHaveCount(0);
    await page.route('**/api/products', (route) => route.request().method() === 'POST'
      ? route.fulfill({ status: 503, json: { detail: 'Temporary save failure' } }) : route.continue());
    await editor.getByRole('button', { name: 'Сохранить товар' }).click();
    await expect(editor.getByText('Temporary save failure')).toBeVisible();
    await expect(editor.getByLabel('Адрес ссылки').first()).toHaveValue(profileUrl);
    await expect(editor.getByLabel('Название поля').first()).toHaveValue('Ник в игре');
    await page.unroute('**/api/products');
    const [created] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/products') && response.request().method() === 'POST'),
      editor.getByRole('button', { name: 'Сохранить товар' }).click(),
    ]);
    expect(created.status()).toBe(201);
    const product = await created.json();
    await expect(editor).toBeHidden();
    await page.getByLabel('Поиск по названию').fill(name);
    await page.getByRole('row').filter({ hasText: name }).getByRole('button', { name: 'Редактировать' }).click();
    await expect(editor.getByLabel('Адрес ссылки').first()).toHaveValue(profileUrl);
    await expect(editor.getByLabel('Название поля')).toHaveCount(3);
    await editor.getByLabel('Инструкция для ученика').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/private/tmp/msi-delivery-editor-${width}.png`, animations: 'disabled' });
    await editor.getByRole('button', { name: 'Закрыть', exact: true }).click();

    const login = await request.post('/api/auth/login', { data: { studentId: '2023114', password: 'demo' } });
    const buyer = await login.json();
    await page.evaluate((auth) => {
      localStorage.setItem('msi_user_token', auth.token);
      localStorage.setItem('msi_current_user', JSON.stringify(auth.user));
    }, buyer);
    await page.goto('/?view=catalog');
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByRole('dialog', { name, exact: true }).getByRole('button', { name: 'Купить', exact: true }).click();
    const checkout = page.getByRole('dialog', { name: 'Оформление заказа' });
    await expect(checkout).toContainText('После оплаты откройте инструкции');
    const [paid] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST'),
      checkout.getByRole('button', { name: /^Оплатить MSI Coin/ }).click(),
    ]);
    const result = await paid.json();
    expect(paid.status()).toBe(201);
    const success = page.getByRole('dialog', { name: 'Спасибо за заказ!' });
    await expect(success.getByRole('link', { name: 'Наш профиль Roblox' })).toHaveAttribute('href', profileUrl);
    await expect(success.getByRole('link', { name: 'Инструкция', exact: false })).toHaveAttribute('rel', 'noopener noreferrer');
    await success.getByLabel('Ник в игре').fill('Test Player');
    await success.getByLabel('Player ID').fill('123456789');
    await success.getByRole('button', { name: 'Сохранить данные', exact: true }).click();
    await expect(success.getByLabel('Я отправил заявку в друзья')).not.toBeChecked();
    await expect(success.getByText('Данные сохранены.', { exact: false })).toHaveCount(0);
    await success.getByLabel('Я отправил заявку в друзья').check();
    await page.route('**/api/orders/*/delivery-details', (route) => route.fulfill({ status: 503, json: { detail: 'Retry later' } }));
    await success.getByRole('button', { name: 'Сохранить данные', exact: true }).click();
    await expect(success.getByRole('alert')).toContainText('Не удалось сохранить данные');
    await expect(success.getByLabel('Ник в игре')).toHaveValue('Test Player');
    await expect(success.getByLabel('Я отправил заявку в друзья')).toBeChecked();
    await page.unroute('**/api/orders/*/delivery-details');
    await success.getByRole('button', { name: 'Сохранить данные', exact: true }).click();
    await expect(success.getByRole('status')).toContainText('Данные сохранены.');
    const me = await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${buyer.token}` } });
    expect((await me.json()).balance).toBe(result.user.balance);
    await success.getByRole('button', { name: 'Посмотреть заказ', exact: true }).click();
    await expect(page.getByLabel('Ник в игре')).toHaveValue('Test Player');
    await expect(page.getByRole('button', { name: 'Обновить данные', exact: true })).toBeDisabled();
    await page.screenshot({ path: `/private/tmp/msi-delivery-order-${width}.png`, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.goto('/admin.html?tab=orders');
    const row = page.getByRole('row').filter({ hasText: result.order.id.slice(0, 12) });
    await expect(row).toContainText('Ник в игре: Test Player');
    await expect(row).toContainText('Я отправил заявку в друзья: Да');
    await row.getByRole('button', { name: 'Отправить', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Подтвердить получение' })).toBeVisible();
    await page.goto(`/?view=orders&order=${result.order.id}`);
    await expect(page.getByRole('link', { name: 'Наш профиль Roblox' })).toBeVisible();
    await expect(page.getByLabel('Ник в игре')).toHaveCount(0);
    expect(errors).toEqual([]);
    const token = await page.evaluate(() => sessionStorage.getItem('msi_admin_token'));
    expect((await request.delete(`/api/products/${product.id}`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(204);
  });
}
