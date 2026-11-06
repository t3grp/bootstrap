// Verification harness for the integrated /welcome landing page (LP09–LP18).
// Usage (from the repo root, after building the web app):
//   pnpm --filter @bootstrap/web build
//   node apps/web/src/app/welcome/scripts/verify.mjs
// Serves the production standalone build on a fresh port, drives /welcome
// with Playwright (chromium headless shell from @playwright/test), writes
// screenshots + results to ./evidence/. Exits non-zero if any check fails.
// The standalone build's opengraph-image check is omitted: that route is
// not integrated (it needs the wawoff2 dependency; see ../PROVENANCE.md).
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(root, "../../../.."); // apps/web
const outDir = path.join(root, "..", "evidence");
await mkdir(outDir, { recursive: true });

// Fresh port per run: a previous server left behind by a crashed run would
// otherwise answer with a stale build (its JS chunks may no longer exist
// after a rebuild, which breaks hydration silently).
const PORT = 3200 + (process.pid % 50);
const BASE = `http://localhost:${PORT}/welcome`;
const results = { checks: [], screenshots: [] };
const check = (name, ok, detail = "") => {
  results.checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const server = spawn(
  "node",
  [".next/standalone/apps/web/server.js"],
  {
    cwd: appDir,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  },
);
const waitForServer = async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start");
};

try {
  await waitForServer();
  const browser = await chromium.launch();
  const widths = [1440, 1280, 768, 390, 320];

  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: "networkidle" });
    const loadMs = Date.now() - t0;

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    check(
      `no page-level horizontal overflow at ${width}px`,
      overflow.scrollWidth <= overflow.innerWidth,
      `scrollWidth=${overflow.scrollWidth} innerWidth=${overflow.innerWidth}`,
    );
    if (width === 1440) check("page load under 5s (local)", loadMs < 5000, `${loadMs}ms`);

    // Concept labels visible at every size.
    const labels = await page.locator(".concept-label").allTextContents();
    check(
      `concept labels present at ${width}px`,
      labels.some((t) => t.includes("Concept preview")),
      labels.join(" | "),
    );
    const heroVisible = await page.locator("h1").isVisible();
    check(`hero headline visible at ${width}px`, heroVisible);

    // Full-page screenshot (hero + preview at desktop; full page at mobile).
    const shot = path.join(outDir, `page-${width}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    results.screenshots.push(`page-${width}.png`);

    await context.close();
  }

  // Interaction checks at desktop width.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Let client hydration finish before clicking (clicks before hydration
    // are no-ops; networkidle alone does not guarantee hydration).
    await page.waitForTimeout(1500);

    // Tabs: click Routines, then arrow-key to Memories.
    await page.getByRole("tab", { name: "Routines" }).click();
    const routinesVisible = await page.getByRole("tabpanel").innerText();
    check("tabs switch to Routines panel", routinesVisible.includes("Weekly launch review"));
    await page.getByRole("tab", { name: "Routines" }).press("ArrowRight");
    const memoriesVisible = await page.getByRole("tabpanel").innerText();
    check("tabs arrow-key moves to Memories", memoriesVisible.includes("Preferred tone"));

    // FAQ expand.
    await page.getByRole("button", { name: "Is Bootstrap available today?" }).click();
    const faqText = await page.locator("#faq-panel-5").innerText();
    check("FAQ expands", faqText.includes("in development"));

    // Review draft dialog: open, Escape closes, focus returns to the button.
    await page.getByRole("button", { name: "Review draft" }).click();
    const dialogVisible = await page.getByRole("dialog").isVisible();
    check("review draft dialog opens", dialogVisible);
    const dialogText = await page.getByRole("dialog").innerText();
    check(
      "dialog labelled as example result",
      dialogText.includes("Example result · Demo data") && dialogText.includes("Studio A"),
    );
    await page.keyboard.press("Escape");
    check("dialog closes on Escape", !(await page.getByRole("dialog").count()));
    const focused = await page.evaluate(() => document.activeElement?.textContent);
    check("focus returns to Review draft button", focused?.includes("Review draft") ?? false, String(focused));

    // Row selection updates the attached count.
    const before = await page.locator(".agent-panel .chip").nth(1).innerText();
    await page.locator(".ws-table tbody tr").nth(2).click(); // Studio C (Research)
    const after = await page.locator(".agent-panel .chip").nth(1).innerText();
    check("row selection updates attached count", before !== after, `${before} → ${after}`);
    await page.getByRole("button", { name: "Reset example" }).click();
    const reset = await page.locator(".agent-panel .chip").nth(1).innerText();
    check("reset restores fixture", reset === before, reset);

    // Anchored nav scrolls to the section (allow smooth scroll to finish).
    await page.getByRole("link", { name: "Hosting", exact: true }).first().click();
    await page.waitForTimeout(800);
    const hostingInView = await page.evaluate(() => {
      const el = document.getElementById("hosting");
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.top < window.innerHeight;
    });
    check("nav link scrolls to Hosting", hostingInView);

    // External links resolve (HEAD).
    const hrefs = await page.$$eval("a[href^='https://']", (as) => [...new Set(as.map((a) => a.href))]);
    for (const href of hrefs) {
      try {
        const res = await fetch(href, { method: "HEAD", redirect: "follow" });
        check(`external link resolves: ${href}`, res.ok, `HTTP ${res.status}`);
      } catch (error) {
        check(`external link resolves: ${href}`, false, String(error));
      }
    }

    // No signup/login/waitlist/checkout controls exist.
    const forbidden = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return ["sign up", "log in", "login", "waitlist", "checkout", "buy now", "start free trial"].filter((w) =>
        text.includes(w),
      );
    });
    check("no signup/login/waitlist/checkout copy", forbidden.length === 0, forbidden.join(", "));

    await context.close();
  }

  // Mobile menu at 390px.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Open menu" }).click();
    check("mobile menu opens", await page.locator("#mobile-menu").isVisible());
    await page.keyboard.press("Escape");
    check("mobile menu closes on Escape", !(await page.locator("#mobile-menu").count()));
    await browser.close();
  }
} finally {
  // Kill the whole process group: killing node alone leaves the server
  // listening on the port (see the stale-server note above).
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill();
  }
}

const failed = results.checks.filter((c) => !c.ok);
await writeFile(path.join(outDir, "verify-results.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.checks.length - failed.length}/${results.checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
