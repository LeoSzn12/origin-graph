import { chromium, type LaunchOptions } from "playwright";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const username = requiredEnv("ADMIN_AUTH_USER");
const password = requiredEnv("ADMIN_AUTH_PASSWORD");
const baseUrl = process.env.PROOF_BASE_URL ?? "http://127.0.0.1:3100";
const executablePath = process.env.CHROMIUM_EXECUTABLE;

async function main(): Promise<void> {
  const launchOptions: LaunchOptions = {
    headless: true,
    args: ["--disable-gpu"]
  };
  if (executablePath) launchOptions.executablePath = executablePath;
  const browser = await chromium.launch(launchOptions);
  try {
    for (const proof of [
      { name: "desktop", viewport: { width: 1440, height: 1000 }, isMobile: false },
      { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true }
    ]) {
      const context = await browser.newContext({
        viewport: proof.viewport,
        isMobile: proof.isMobile,
        httpCredentials: { username, password }
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
      await page.screenshot({ path: `artifacts/screenshots/admin-${proof.name}.png`, fullPage: true });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
