import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function waitForHydration(page: Page) {
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0, {
    timeout: 10_000,
  });
}

test("sign in -> translate -> create -> list -> edit -> delete flashcard", async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.test`;
  const password = "E2e-pass-123!";

  // Arrange: create an isolated local Supabase user.
  await page.goto("/auth/signup");
  await waitForHydration(page);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);

  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/auth\/confirm-email$/);

  // Local Supabase has email confirmations disabled, so signup creates a session.
  // Sign out first so the test exercises the real sign-in flow.
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Not signed in")).toBeVisible();

  // Sign in.
  await page.goto("/auth/signin");
  await waitForHydration(page);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "Dashboard" }).click();

  await expect(page).toHaveURL("/dashboard");
  await waitForHydration(page);

  await expect(page.getByRole("heading", { name: "Dodaj nową fiszkę" })).toBeVisible();

  // New unique user should have no flashcards.
  await expect(page.getByText("Nie masz jeszcze żadnych fiszek. Przetłumacz pierwsze słowo powyżej.")).toBeVisible();

  // Translate through the real application endpoint and mocked LibreTranslate provider.
  await page.getByLabel("Polskie słowo").fill("zamek");
  await page.getByRole("button", { name: "Przetłumacz" }).click();

  await expect(page.getByRole("radio", { name: "castle" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "lock" })).toBeVisible();

  // Duplicate CASTLE from the provider should be normalized away.
  await expect(page.getByRole("radio")).toHaveCount(2);

  // Create.
  await page.getByRole("radio", { name: "castle" }).check();
  await page.getByRole("button", { name: "Zapisz wybrane tłumaczenie" }).click();

  await expect(page.getByText("Fiszka została zapisana.")).toBeVisible();

  const card = page.locator("li").filter({ hasText: "zamek" }).filter({ hasText: "castle" });

  await expect(card).toBeVisible();
  await expect(page.getByText("Liczba fiszek: 1")).toBeVisible();

  // Edit.
  await card.getByRole("button", { name: "Edytuj" }).click();

  const editCard = page.locator("li").filter({ has: page.getByLabel("Angielskie tłumaczenie") });

  await expect(editCard).toBeVisible();

  await editCard.getByLabel("Polskie słowo").fill("zamek-edytowany");
  await editCard.getByLabel("Angielskie tłumaczenie").fill("castle edited");

  await editCard.getByRole("button", { name: "Zapisz zmiany" }).click();

  const updatedCard = page.locator("li").filter({ hasText: "zamek-edytowany" }).filter({ hasText: "castle edited" });

  await expect(updatedCard).toBeVisible();

  // Delete.
  await updatedCard.getByRole("button", { name: "Usuń" }).click();

  await expect(updatedCard.getByText("Na pewno usunąć tę fiszkę?")).toBeVisible();

  await updatedCard.getByRole("button", { name: "Tak, usuń" }).click();

  await expect(updatedCard).toHaveCount(0);

  await expect(page.getByText("Nie masz jeszcze żadnych fiszek. Przetłumacz pierwsze słowo powyżej.")).toBeVisible();
});
