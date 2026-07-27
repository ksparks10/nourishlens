import { expect, test, type Page } from "@playwright/test";

const appRoutes = [
  "/app",
  "/app/onboarding",
  "/app/add-food",
  "/app/diary",
  "/app/recipes",
  "/app/recipes/new",
  "/app/saved-meals",
  "/app/reports",
  "/app/projections",
  "/app/profile",
  "/app/billing",
  "/app/account",
];

const adminRoutes = [
  "/admin",
  "/admin/users",
  "/admin/foods",
  "/admin/nutrient-mappings",
  "/admin/projections",
  "/admin/projections/recalculations",
  "/admin/analytics",
  "/admin/audit-logs",
  "/admin/content",
  "/admin/feature-flags",
  "/admin/automations",
  "/admin/system-health",
  "/admin/promo-codes",
  "/admin/staff",
];

async function auditRenderedPage(page: Page, route: string) {
  await page.goto(route);
  await expect(page.locator("body")).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);

  const audit = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const collisions: string[] = [];
    for (const card of document.querySelectorAll<HTMLElement>(".card")) {
      const children = [...card.children].filter((child) => {
        if (!(child instanceof HTMLElement)) return false;
        const style = getComputedStyle(child);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.position !== "absolute" &&
          child.getBoundingClientRect().height > 0
        );
      }) as HTMLElement[];
      for (let index = 0; index < children.length; index += 1) {
        const first = children[index];
        if (!first) continue;
        const firstRect = first.getBoundingClientRect();
        for (let nextIndex = index + 1; nextIndex < children.length; nextIndex += 1) {
          const second = children[nextIndex];
          if (!second) continue;
          const secondRect = second.getBoundingClientRect();
          const overlapWidth =
            Math.min(firstRect.right, secondRect.right) -
            Math.max(firstRect.left, secondRect.left);
          const overlapHeight =
            Math.min(firstRect.bottom, secondRect.bottom) -
            Math.max(firstRect.top, secondRect.top);
          if (overlapWidth > 1 && overlapHeight > 1)
            collisions.push(
              `${first.tagName.toLowerCase()} overlaps ${second.tagName.toLowerCase()}`,
            );
        }
      }
    }
    return { overflow, collisions };
  });

  expect(audit.overflow, `${route} has horizontal overflow`).toBeLessThanOrEqual(
    1,
  );
  expect(audit.collisions, `${route} has overlapping card content`).toEqual([]);
}

test("authenticated and administrative layouts remain responsive", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/login");
  await page.getByLabel("Email").first().fill("e2e@local.test");
  await page.getByLabel("Password").fill("LocalTest123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);

  if (await page.getByRole("link", { name: "Start onboarding" }).isVisible()) {
    await auditRenderedPage(page, "/app");
    await page.getByRole("link", { name: "Start onboarding" }).click();
    await page.getByLabel("Date of birth").fill("1990-01-01");
    await page.getByLabel("Height in centimeters").fill("175");
    await page.getByLabel("Weight in kilograms").fill("75");
    await page.getByRole("button", { name: /Save and calculate/ }).click();
    await expect(page).toHaveURL(/\/app/);
  }

  for (const route of [...appRoutes, ...adminRoutes])
    await auditRenderedPage(page, route);
});
