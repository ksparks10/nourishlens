import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  "/",
  "/features",
  "/pricing",
  "/faq",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/contact",
  "/login",
  "/signup",
  "/forgot-password",
];

async function expectStableLayout(page: Page, route: string) {
  await page.goto(route);
  await expect(page.locator("body")).toBeVisible();

  const audit = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const overflow = document.documentElement.scrollWidth - viewportWidth;
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
          if (overlapWidth > 1 && overlapHeight > 1) {
            collisions.push(
              `${first.tagName.toLowerCase()} overlaps ${second.tagName.toLowerCase()}`,
            );
          }
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

for (const route of publicRoutes) {
  test(`responsive layout remains stable on ${route}`, async ({ page }) => {
    await expectStableLayout(page, route);
  });
}
