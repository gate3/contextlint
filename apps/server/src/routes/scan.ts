import { scanProject } from "@meminspect/core";
import type { Hono } from "hono";
import path from "node:path";
import { loadScannedRecords } from "../services/project-records.js";
import {
  readProjectScanPreferences,
  setScanRuleEnabled,
  snoozeScanFinding,
} from "../services/scan-preferences.js";
import type { ServerContext } from "./context.js";

export function registerScanRoutes(app: Hono, ctx: ServerContext): void {
  app.post("/projects/scan", async (c) => {
    const projectPath = c.req.query("path");
    if (!projectPath) {
      return c.json({ error: "Missing query parameter: path", code: "BAD_REQUEST" }, 400);
    }

    const resolvedPath = path.resolve(projectPath);
    const tool = c.req.query("tool");

    try {
      const records = await loadScannedRecords(ctx.adapters, resolvedPath, tool);
      const prefs = await readProjectScanPreferences(ctx.homedir, resolvedPath);
      const result = await scanProject(resolvedPath, records, {
        snoozedFindingIds: prefs.snoozedFindingIds,
        disabledRuleIds: prefs.disabledRuleIds,
      });

      return c.json({ ...result, preferences: prefs });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scan failed";
      return c.json({ error: message, code: "SCAN_FAILED" }, 500);
    }
  });

  app.get("/projects/scan/preferences", async (c) => {
    const projectPath = c.req.query("path");
    if (!projectPath) {
      return c.json({ error: "Missing query parameter: path", code: "BAD_REQUEST" }, 400);
    }

    const resolvedPath = path.resolve(projectPath);
    const prefs = await readProjectScanPreferences(ctx.homedir, resolvedPath);
    return c.json({ projectPath: resolvedPath, preferences: prefs });
  });

  app.post("/projects/scan/snooze", async (c) => {
    const body = (await c.req.json().catch(() => null)) as {
      path?: string;
      findingId?: string;
    } | null;

    if (!body?.path || !body.findingId) {
      return c.json(
        { error: "Missing body fields: path, findingId", code: "BAD_REQUEST" },
        400,
      );
    }

    const resolvedPath = path.resolve(body.path);
    const prefs = await snoozeScanFinding(ctx.homedir, resolvedPath, body.findingId);
    return c.json({ ok: true, preferences: prefs });
  });

  app.post("/projects/scan/disable-rule", async (c) => {
    const body = (await c.req.json().catch(() => null)) as {
      path?: string;
      ruleId?: string;
      enabled?: boolean;
    } | null;

    if (!body?.path || !body.ruleId) {
      return c.json(
        { error: "Missing body fields: path, ruleId", code: "BAD_REQUEST" },
        400,
      );
    }

    const resolvedPath = path.resolve(body.path);
    const prefs = await setScanRuleEnabled(
      ctx.homedir,
      resolvedPath,
      body.ruleId,
      body.enabled ?? false,
    );
    return c.json({ ok: true, preferences: prefs });
  });
}
