import { test, expect } from "@playwright/test";
test("authenticated nutrition journey", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").first().fill("e2e@local.test");
  await page.getByLabel("Password").fill("LocalTest123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
  if (await page.getByRole("link", { name: "Start onboarding" }).isVisible()) {
    await page.getByRole("link", { name: "Start onboarding" }).click();
    await page.getByLabel("Date of birth").fill("1990-01-01");
    await page.getByLabel("Height in centimeters").fill("175");
    await page.getByLabel("Weight in kilograms").fill("75");
    await page.getByRole("button", { name: /Save and calculate/ }).click();
  }
  await page.goto("/app/add-food");
  const searchResponse = page.waitForResponse((response) =>
    response.url().includes("/api/foods/search"),
  );
  await page.getByRole("combobox").fill("mac and cheese");
  const response = await searchResponse;
  expect(response.ok(), await response.text()).toBeTruthy();
  const result = page.getByRole("option").filter({ hasText: "Kraft" }).first();
  await expect(result).toBeVisible();
  await result.click();
  await page.getByLabel("Grams").last().fill("180");
  await page.getByLabel("Meal").selectOption("dinner");
  await page.getByRole("button", { name: "Add food" }).click();
  await expect(page).toHaveURL(/\/app\/diary/);
  await expect(page.getByText(/Macaroni/).first()).toBeVisible();
  await page.goto("/app/billing");
  if (await page.getByText("Not active").isVisible()) {
    await page.getByLabel("Access code").fill(" freeforme ");
    await page.getByRole("button", { name: "Redeem code" }).click();
  }
  await expect(page.getByText("Active").first()).toBeVisible();
  await page.goto("/app/reports");
  await expect(
    page.getByRole("heading", { name: "Nutrition reports" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Export CSV" })).toBeVisible();
});
