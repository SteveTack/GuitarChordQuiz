import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 1, use: { baseURL:'http://127.0.0.1:5181', viewport:{width:1360,height:1050} },
  webServer: { command:'npm run dev -- --port 5181 --strictPort', url:'http://127.0.0.1:5181', reuseExistingServer:!process.env.CI },
});
