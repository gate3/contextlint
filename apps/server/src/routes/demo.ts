import type { Hono } from "hono";
import { resolveScanDemoProjectPath } from "../paths.js";

export function registerDemoRoutes(app: Hono): void {
  app.get("/demo/scan-project", (c) => {
    const demoPath = resolveScanDemoProjectPath();
    if (!demoPath) {
      return c.json({ error: "Scan demo project not found", code: "NOT_FOUND" }, 404);
    }
    return c.json({ path: demoPath, name: "Health Scan demo" });
  });
}
