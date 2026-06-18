import { buildSessionPreview, scanProject } from "@meminspect/core";
import type { Hono } from "hono";
import path from "node:path";
import { loadScannedRecords } from "../services/project-records.js";
import { readProjectScanPreferences } from "../services/scan-preferences.js";
import type { ServerContext } from "./context.js";

export function registerPreviewRoutes(app: Hono, ctx: ServerContext): void {
  app.get("/projects/preview", async (c) => {
    const projectPath = c.req.query("path");
    if (!projectPath) {
      return c.json({ error: "Missing query parameter: path", code: "BAD_REQUEST" }, 400);
    }

    const resolvedPath = path.resolve(projectPath);
    const tool = c.req.query("tool");
    if (tool && tool !== "cursor" && tool !== "claude-code") {
      return c.json(
        {
          error: "Invalid query parameter: tool must be 'cursor' or 'claude-code'",
          code: "BAD_REQUEST",
        },
        400,
      );
    }

    try {
      const records = await loadScannedRecords(ctx.adapters, resolvedPath, tool);
      const prefs = await readProjectScanPreferences(ctx.homedir, resolvedPath);
      const scanResult = await scanProject(resolvedPath, records, {
        snoozedFindingIds: prefs.snoozedFindingIds,
        disabledRuleIds: prefs.disabledRuleIds,
      });
      const preview = buildSessionPreview(resolvedPath, records, {
        scanFindings: scanResult.findings,
      });

      return c.json({
        ...preview,
        scan: {
          scannedAt: scanResult.scannedAt,
          stats: scanResult.stats,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Preview failed";
      return c.json({ error: message, code: "PREVIEW_FAILED" }, 500);
    }
  });
}
