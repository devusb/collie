import { expect, test } from "@playwright/test";

import { en } from "@/lib/i18n/messages/en";

import { installApiStub } from "./fixtures/api";
import { keepPhoneLayout } from "./fixtures/layout";

// THE LARGE-SCREEN LAYOUT APPEARS ON THE TABLET (ADR 0120). From 600px wide and 480px tall the pane
// screen is a sidebar beside a strip, and the belt's Switch pill is not drawn, because the sidebar is
// the switcher. Large-screen layout set to Off brings the phone pane screen back at the same size.
// `app-tablet` (820x1180) is the one project past that line; the phone pane specs run with Off
// (`fixtures/layout.ts`), so this is where Auto is held to drawing the large-screen layout.

test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "app-tablet", "the large-screen layout starts at 600px wide");
  await installApiStub(page);
});

test("on Auto the pane screen is a sidebar beside a strip, with no Switch pill", async ({ page }) => {
  await page.goto("/pane/w1:p1");
  await expect(page.locator('[data-slot="wide-layout"]')).toBeVisible();
  await expect(page.getByRole("complementary", { name: en["wide.sidebar.label"] })).toBeVisible();
  await expect(page.locator('[data-slot="composer-actions"]')).toBeVisible();
  await expect(page.getByRole("button", { name: en["chat.switcher.aria"] })).toHaveCount(0);
});

test("on Off the same window keeps the phone pane screen", async ({ page }) => {
  await keepPhoneLayout(page);
  await page.goto("/pane/w1:p1");
  await expect(page.getByRole("button", { name: en["chat.switcher.aria"] })).toBeVisible();
  await expect(page.locator('[data-slot="wide-layout"]')).toHaveCount(0);
});

test("an absolutely placed box in the sidebar list does not make the page scroll", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 480 });
  await page.goto("/pane/w1:p1");
  const sidebar = page.getByRole("complementary", { name: en["wide.sidebar.label"] });
  await expect(sidebar).toBeVisible();
  // A row's `sr-only` label is absolutely placed; one far down the list stands in for it.
  await sidebar.evaluate((aside) => {
    const list = [...aside.querySelectorAll("div")].find((el) => getComputedStyle(el).overflowY === "auto");
    const box = document.createElement("span");
    box.style.cssText = "position:absolute;top:2000px;width:1px;height:1px";
    list?.firstElementChild?.append(box);
  });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(480);
});
