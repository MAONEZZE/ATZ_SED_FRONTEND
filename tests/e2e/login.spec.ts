import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("login", () => {
  test("rota protegida redireciona para /login", async ({ page }) => {
    await page.goto("/events");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/dashboard redireciona para /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login com credenciais válidas acessa o dashboard", async ({ page }) => {
    test.skip(!email || !password, "E2E_USER_EMAIL/PASSWORD não configurados");

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email!);
    await page.getByLabel("Senha").fill(password!);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("credenciais inválidas mostram erro", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("naoexiste@example.com");
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.locator("[data-sonner-toast]")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
