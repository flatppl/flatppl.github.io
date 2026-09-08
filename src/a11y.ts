import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright";
import { serveDirectory } from "./server.ts";

const server = serveDirectory("build", 0);
const browser = await chromium.launch({ headless: true });
const failures: string[] = [];

try {
  for (const colorScheme of ["light", "dark"] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    for (const path of ["/", "/legal-notice/"]) {
      await page.goto(`http://127.0.0.1:${server.port}${path}`, { waitUntil: "load" });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      for (const violation of results.violations) {
        failures.push(`${colorScheme} ${path}: ${violation.id}: ${violation.help}`);
      }
    }
    await context.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 375, height: 720 } });
  const page = await mobile.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/`, { waitUntil: "load" });
  const button = page.locator("[data-fp-menu-toggle]");
  await button.click();
  if ((await button.getAttribute("aria-expanded")) !== "true") {
    failures.push("mobile /: product navigation does not expand");
  }
  if ((await page.locator("[data-fp-nav=docs]").count()) !== 1 || await page.locator("[data-fp-nav=docs]").isVisible()) {
    failures.push("mobile /: hidden Docs item is not present and hidden");
  }
  await mobile.close();
} finally {
  await browser.close();
  server.stop(true);
}

for (const failure of failures) console.error(failure);
if (failures.length > 0) process.exit(1);
console.log("Accessibility check passed for 2 pages in light and dark themes, plus the 375px navigation");
