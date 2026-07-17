import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

export function loadLocalEnv(): void {
  for (const candidate of [".env.local", ".env.test", ".env"]) {
    if (existsSync(candidate)) {
      loadEnvFile(candidate);
      return;
    }
  }
}
