import { defineConfig } from '@playwright/test';

const desktop = { viewport: { width: 1280, height: 720 } };
const portrait = { viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true };
const landscape = { viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true };
const chromium = {
  browserName: 'chromium' as const,
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
};
const webkit = { browserName: 'webkit' as const };

export default defineConfig({
  testDir: './tests',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4176', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium-escritorio', use: { ...chromium, ...desktop } },
    { name: 'chromium-movil', use: { ...chromium, ...portrait } },
    { name: 'chromium-horizontal', use: { ...chromium, ...landscape } },
    { name: 'webkit-escritorio', use: { ...webkit, ...desktop } },
    { name: 'webkit-movil', use: { ...webkit, ...portrait } },
    { name: 'webkit-horizontal', use: { ...webkit, ...landscape } },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176',
  },
});
