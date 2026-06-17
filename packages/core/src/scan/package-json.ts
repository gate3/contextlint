import fs from "node:fs/promises";
import path from "node:path";
import type { PackageJsonDeps } from "./types.js";

export async function loadPackageJsonDeps(
  projectPath: string,
): Promise<PackageJsonDeps | undefined> {
  const pkgPath = path.join(projectPath, "package.json");
  try {
    const raw = await fs.readFile(pkgPath, "utf8");
    const data = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return {
      dependencies: data.dependencies ?? {},
      devDependencies: data.devDependencies ?? {},
    };
  } catch {
    return undefined;
  }
}
