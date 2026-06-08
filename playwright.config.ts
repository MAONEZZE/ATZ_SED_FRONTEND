import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra app real (next dev/start) + backend NestJS + Supabase.
 * Requer .env.local válido e backend rodando em NEXT_PUBLIC_API_URL.
 * Vars de teste: E2E_USER_EMAIL / E2E_USER_PASSWORD (conta confirmada)
 * e E2E_PUBLIC_SLUG (evento publicado).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev -- -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
