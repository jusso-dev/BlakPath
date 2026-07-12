import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const environment = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env;
const url = environment?.SCREENSHOT_URL ?? "http://127.0.0.1:3000";
const output = resolve("docs/screenshots/landing-page.png");

async function main() {
  mkdirSync(dirname(output), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("heading", {
        name: "Community-controlled confirmation, with a clearer path for everyone.",
      })
      .waitFor();
    await page.screenshot({ path: output, fullPage: true });
  } finally {
    await browser.close();
  }
}

void main();
