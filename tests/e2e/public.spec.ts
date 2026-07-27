import { test, expect } from "@playwright/test";
test("public marketing and legal pages are reachable", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "See what your food is really giving you.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Features", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Nutrition data/ }),
  ).toBeVisible();
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: /Privacy policy/ }),
  ).toBeVisible();
  await page.goto("/disclaimer");
  await expect(page.getByText(/does not diagnose/)).toBeVisible();
});
test("keyboard skip link is available", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
});
