import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const eventId = process.env.E2E_EVENT_ID;

test.describe("mudança de status de inscrito", () => {
  test.skip(
    !email || !password || !eventId,
    "E2E_USER_EMAIL/PASSWORD/E2E_EVENT_ID não configurados",
  );

  test("organizador altera status e vê feedback", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email!);
    await page.getByLabel("Senha").fill(password!);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/events/);

    await page.goto(`/eventos/${eventId}/attendees`);

    const statusSelect = page.getByRole("combobox", { name: /status de/i }).first();
    await expect(statusSelect).toBeVisible();
    await statusSelect.click();

    const option = page.getByRole("option").nth(1);
    const label = await option.textContent();
    await option.click();

    await expect(page.locator("[data-sonner-toast]")).toContainText(
      label ?? "Status alterado",
    );
  });
});
