import { expect, test } from "@playwright/test";

const slug = process.env.E2E_PUBLIC_SLUG;

test.describe("inscrição pública", () => {
  test("slug inexistente mostra 404 amigável", async ({ page }) => {
    await page.goto("/e/slug-que-nao-existe-000000");
    await expect(page.getByText("Evento não encontrado")).toBeVisible();
  });

  test("landing renderiza no servidor com OG correto", async ({ page }) => {
    test.skip(!slug, "E2E_PUBLIC_SLUG não configurado");

    const response = await page.goto(`/e/${slug}`);
    expect(response?.ok()).toBe(true);

    // conteúdo SSR (sem depender de JS)
    const html = await response!.text();
    expect(html).toContain("og:title");

    await expect(page.locator("h1")).toBeVisible();
  });

  test("envia inscrição pelo formulário", async ({ page }) => {
    test.skip(!slug, "E2E_PUBLIC_SLUG não configurado");

    await page.goto(`/e/${slug}`);
    const unique = Date.now();

    await page.getByLabel(/nome/i).first().fill(`Teste E2E ${unique}`);
    await page.getByLabel(/e-?mail/i).first().fill(`e2e+${unique}@example.com`);
    await page.getByLabel(/telefone/i).first().fill("11999998888");

    await page.getByRole("button", { name: "Enviar inscrição" }).click();
    await expect(page.getByText("Inscrição enviada!")).toBeVisible();
  });
});
