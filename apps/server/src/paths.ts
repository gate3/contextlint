import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to the bundled Health Scan demo project (repo fixtures). */
export function resolveScanDemoProjectPath(): string | null {
  const envOverride = process.env.MEMINSPECT_SCAN_DEMO_PATH;
  if (envOverride) {
    return path.resolve(envOverride);
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../../fixtures/health-scan-demo"),
    path.resolve(here, "../../../../fixtures/health-scan-demo"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }

  return null;
}
