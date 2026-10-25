import { expect, test as base } from "@playwright/test";

const test = base.extend({
  headless: true,
  launchOptions: async ({ launchOptions, headless }, use) => {
    const debugging = Boolean(process.env.PWDEBUG && process.env.PWDEBUG !== "0");
    if (!headless || debugging || !process.env.WSL_DISTRO_NAME) {
      await use(launchOptions);
      return;
    }
    const env = { ...process.env, ...launchOptions.env };
    delete env.DISPLAY;
    delete env.WAYLAND_DISPLAY;
    delete env.XDG_RUNTIME_DIR;
    await use({ ...launchOptions, env });
  },
});

test("Russian sign-in preserves drafts, saved locale, API payloads, and narrow layout", async ({ page }, testInfo) => {
  const signIns: unknown[] = [];
  const unexpected: string[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/health") {
      await route.fulfill({ json: { status: "ok", deploymentMode: "authenticated", authReady: true, bootstrapStatus: "ready" } });
    } else if (pathname === "/api/auth/get-session") {
      await route.fulfill({ json: null });
    } else if (pathname === "/api/auth/sign-in/email") {
      signIns.push(request.postDataJSON());
      await route.fulfill({ status: 401, json: { message: "Provider detail: invalid credentials" } });
    } else if (pathname === "/api/companies" || pathname === "/api/instance/settings/experimental") {
      await route.fulfill({ status: 401, json: { error: "Authentication required" } });
    } else {
      unexpected.push(pathname);
      await route.fulfill({ status: 401, json: { error: "Authentication required" } });
    }
  });
  await page.goto("/auth");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  const selector = page.getByRole("combobox");
  await expect(selector).toHaveAccessibleName("Язык");
  await expect(selector).toHaveValue("ru");
  await page.locator("#email").fill("operator@example.test");
  await page.locator("#password").fill("a-local-test-password");

  await selector.selectOption("en");
  await expect(page.getByRole("heading", { name: "Sign in to Paperclip" })).toBeVisible();
  await expect(selector).toHaveAccessibleName("Language");
  await expect(page.locator("#email")).toHaveValue("operator@example.test");
  await expect(page.locator("#password")).toHaveValue("a-local-test-password");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await selector.selectOption("ru");
  await expect(page.getByRole("heading")).toContainText("Paperclip");
  await expect(page.locator("#email")).toHaveValue("operator@example.test");
  await expect(page.locator("#password")).toHaveValue("a-local-test-password");
  expect(signIns).toEqual([]);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("alert")).toHaveText("Provider detail: invalid credentials");
  expect(signIns).toEqual([{ email: "operator@example.test", password: "a-local-test-password" }]);

  const heading = await page.getByRole("heading").boundingBox();
  const language = await selector.boundingBox();
  expect(heading).not.toBeNull();
  expect(language).not.toBeNull();
  expect(language!.y + language!.height).toBeLessThan(heading!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("russian-sign-in.png"), fullPage: true });

  await selector.selectOption("en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("combobox")).toHaveValue("en");
  await page.getByRole("combobox").selectOption("ru");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("combobox")).toHaveValue("ru");
  expect(await page.evaluate(() => localStorage.getItem("paperclip.locale"))).toBe("ru");
  expect(unexpected).toEqual([]);
});
