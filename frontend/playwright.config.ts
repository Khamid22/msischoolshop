import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const database = join(mkdtempSync(join(tmpdir(), 'shop-browser-')), 'test.db');
export default defineConfig({
  testDir: './tests', testMatch: ['admin.spec.ts', 'student-picks.spec.ts'], workers: 1,
  use: { baseURL: 'http://127.0.0.1:5179', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
  webServer: [
    { command: '../.venv/bin/uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 8771', url: 'http://127.0.0.1:8771/api/health', reuseExistingServer: !process.env.CI,
      env: { DATABASE_URL: `sqlite:///${database}`, SEED_DEMO_DATA: 'true', ADMIN_PASSWORD: 'browser-test-password', SECRET_KEY: 'browser-test-secret', SHOP_ADMIN_SSO_SECRET: 'browser-test-sso-secret-at-least-32-characters' } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5179 --strictPort', url: 'http://127.0.0.1:5179', reuseExistingServer: !process.env.CI,
      env: { VITE_API_PROXY_TARGET: 'http://127.0.0.1:8771' } },
  ],
});
