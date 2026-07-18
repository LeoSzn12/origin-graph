import { mkdir } from "node:fs/promises";
import { chromium, type LaunchOptions, type Page } from "playwright";
import { syntheticIds } from "../fixtures/synthetic";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const username = process.env.ADMIN_USERNAME ?? process.env.ADMIN_AUTH_USER ?? requiredEnv("ADMIN_USERNAME");
const password = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_AUTH_PASSWORD ?? requiredEnv("ADMIN_PASSWORD");
const baseUrl = process.env.PROOF_BASE_URL ?? "http://127.0.0.1:3100";
const executablePath = process.env.CHROMIUM_EXECUTABLE;

async function capture(page: Page, name: string, path: string, ready?: string): Promise<void> {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`${path} returned ${response?.status() ?? "no response"}`);
  if (ready) await page.locator(ready).first().waitFor({ state: "visible" });
  await page.screenshot({ path: `artifacts/screenshots/${name}.png`, fullPage: true });
  if (errors.length) throw new Error(`${path} emitted browser errors: ${errors.join(" | ")}`);
}

async function main(): Promise<void> {
  await mkdir("artifacts/screenshots", { recursive: true });
  const launchOptions: LaunchOptions = { headless: true, args: ["--disable-gpu"] };
  if (executablePath) launchOptions.executablePath = executablePath;
  const browser = await chromium.launch(launchOptions);
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, httpCredentials: { username, password } });
    const page = await desktop.newPage();
    await capture(page, "timeline-desktop", "/", "h1");
    await page.locator(".timeline-mark").first().click();
    await page.locator(".timeline-inspector").waitFor({ state: "visible" });
    await page.screenshot({ path: "artifacts/screenshots/timeline-inspector-desktop.png", fullPage: true });
    await capture(page, "sources-desktop", "/sources", "h1");
    await capture(page, "data-sources-desktop", "/data-sources", ".provider-grid");
    await page.getByRole("button", { name: /Crossref/ }).click();
    await page.locator(".provider-search input").fill("Sumerian King List");
    await page.getByRole("button", { name: "Search live catalog" }).click();
    await page.locator(".candidate-list article").first().waitFor({ state: "visible" });
    await page.screenshot({ path: "artifacts/screenshots/data-source-results-desktop.png", fullPage: true });
    await capture(page, "case-files-desktop", "/case-files", "h1");
    await capture(page, "case-file-atlantis-desktop", "/case-files/atlantis-in-plato", ".case-claim-ledger");
    await capture(page, "sacred-teachers-desktop", "/sacred-teachers", ".comparison-table");
    await capture(page, "hypothesis-desktop", `/hypotheses/${syntheticIds.hypothesis}`, ".evidence-board");
    await capture(page, "ask-desktop", "/ask", "form");
    await page.locator(".ask-question-label textarea").fill("What do reviewed editions say about Atlantis in Plato?");
    await page.getByRole("button", { name: /Build evidence packet/ }).click();
    await page.locator(".answer-status-bar").waitFor({ state: "visible" });
    await page.screenshot({ path: "artifacts/screenshots/ask-evidence-desktop.png", fullPage: true });
    await capture(page, "map-desktop", "/map", ".map-canvas");
    await capture(page, "graph-desktop", "/graph", ".graph-canvas");
    await capture(page, "admin-desktop", "/admin", "table");
    await desktop.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, httpCredentials: { username, password } });
    const mobilePage = await mobile.newPage();
    await capture(mobilePage, "timeline-mobile", "/", "h1");
    await capture(mobilePage, "source-inbox-mobile", "/sources/new", "form");
    await capture(mobilePage, "case-file-mobile", "/case-files/flood-traditions-atlas", "h1");
    await mobile.close();
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
