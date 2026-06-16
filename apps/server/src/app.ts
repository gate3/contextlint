import type { ToolAdapter, ToolId } from "@meminspect/core";
import { createClaudeCodeAdapter } from "@meminspect/adapter-claude-code";
import { createCursorAdapter } from "@meminspect/adapter-cursor";
import {
  discoverProjects,
  getProjectPreferences,
  loadMeminspectConfig,
  loadSnoozeStore,
  saveSnoozeStore,
  scanProject,
  setProjectPreferences,
  type ScannedRecord,
} from "@meminspect/core";
import os from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";

export interface AppOptions {
  homedir?: string;
  adapters?: ToolAdapter[];
}

export function createAdapters(
  homedir: string = os.homedir(),
  config?: { cursor?: { dataDir?: string | null } },
): ToolAdapter[] {
  return [
    createClaudeCodeAdapter(homedir),
    createCursorAdapter(homedir, config?.cursor?.dataDir),
  ];
}

function resolveAdapters(
  adapters: ToolAdapter[],
  tool?: string,
): { adapters: ToolAdapter[]; error?: { message: string; code: string } } {
  if (!tool) {
    return { adapters };
  }
  const adapter = adapters.find((a) => a.id === tool);
  if (!adapter) {
    return {
      adapters: [],
      error: { message: `Unknown tool: ${tool}`, code: "NOT_FOUND" },
    };
  }
  return { adapters: [adapter] };
}

function toolIdFromRecord(recordId: string): ToolId {
  const prefix = recordId.split("::")[0];
  if (prefix?.startsWith("cursor")) {
    return "cursor";
  }
  return "claude-code";
}

async function loadProjectRecords(
  adapters: ToolAdapter[],
  projectPath: string,
  tool?: string,
): Promise<ScannedRecord[]> {
  const resolved = resolveAdapters(adapters, tool);
  if (resolved.error) {
    throw new Error(resolved.error.message);
  }

  const bundles = await Promise.all(
    resolved.adapters.map(async (adapter) => {
      try {
        return {
          tool: adapter.id,
          records: await adapter.listRecords({ projectPath }),
        };
      } catch {
        return { tool: adapter.id, records: [] };
      }
    }),
  );

  return bundles.flatMap((b) =>
    b.records.map((record) => ({ ...record, tool: b.tool })),
  );
}

export function createApp(options: AppOptions = {}) {
  const homedir = options.homedir ?? os.homedir();
  const adapters = options.adapters ?? createAdapters(homedir);
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    }),
  );

  app.get("/health", (c) => {
    return c.json({ ok: true, service: "meminspect" });
  });

  app.get("/tools", async (c) => {
    const tools = await Promise.all(adapters.map((a) => a.detect()));
    return c.json({ tools });
  });

  app.get("/projects", async (c) => {
    const config = await loadMeminspectConfig(homedir);
    const projects = await discoverProjects(adapters, homedir, config);
    return c.json({ projects });
  });

  app.get("/projects/sources", async (c) => {
    const projectPath = c.req.query("path");
    if (!projectPath) {
      return c.json({ error: "Missing query parameter: path", code: "BAD_REQUEST" }, 400);
    }

    const tool = c.req.query("tool");
    const resolved = resolveAdapters(adapters, tool);
    if (resolved.error) {
      return c.json(resolved.error, 404);
    }

    const bundles = await Promise.all(
      resolved.adapters.map(async (adapter) => {
        try {
          return {
            tool: adapter.id,
            sources: await adapter.listSources({ projectPath }),
          };
        } catch {
          return { tool: adapter.id, sources: [] };
        }
      }),
    );

    return c.json({ projectPath, bundles });
  });

  app.get("/projects/records", async (c) => {
    const projectPath = c.req.query("path");
    if (!projectPath) {
      return c.json({ error: "Missing query parameter: path", code: "BAD_REQUEST" }, 400);
    }

    const tool = c.req.query("tool");
    const resolved = resolveAdapters(adapters, tool);
    if (resolved.error) {
      return c.json(resolved.error, 404);
    }

    const bundles = await Promise.all(
      resolved.adapters.map(async (adapter) => {
        try {
          return {
            tool: adapter.id,
            records: await adapter.listRecords({ projectPath }),
          };
        } catch {
          return { tool: adapter.id, records: [] };
        }
      }),
    );

    return c.json({ projectPath, bundles });
  });

  app.get("/records", async (c) => {
    const projectPath = c.req.query("path");
    const recordId = c.req.query("id");
    const tool = c.req.query("tool");

    if (!projectPath || !recordId) {
      return c.json(
        { error: "Missing query parameters: path, id", code: "BAD_REQUEST" },
        400,
      );
    }

    const toolId = (tool ?? toolIdFromRecord(recordId)) as ToolId;
    const adapter = adapters.find((a) => a.id === toolId);
    if (!adapter) {
      return c.json({ error: `Unknown tool: ${toolId}`, code: "NOT_FOUND" }, 404);
    }

    const record = await adapter.readRecord({ projectPath }, recordId);
    return c.json({ record });
  });

  app.get("/search", async (c) => {
    const projectPath = c.req.query("path");
    const query = c.req.query("q");

    if (!projectPath || !query) {
      return c.json(
        { error: "Missing query parameters: path, q", code: "BAD_REQUEST" },
        400,
      );
    }

    const tool = c.req.query("tool");
    const resolved = resolveAdapters(adapters, tool);
    if (resolved.error) {
      return c.json(resolved.error, 404);
    }

    const bundles = await Promise.all(
      resolved.adapters.map(async (adapter) => {
        try {
          return {
            tool: adapter.id,
            hits: await adapter.search({ projectPath }, query),
          };
        } catch {
          return { tool: adapter.id, hits: [] };
        }
      }),
    );

    return c.json({ hits: bundles.flatMap((b) => b.hits.map((h) => ({ ...h, tool: b.tool }))) });
  });

  app.post("/projects/scan", async (c) => {
    const projectPath = c.req.query("path");
    if (!projectPath) {
      return c.json({ error: "Missing query parameter: path", code: "BAD_REQUEST" }, 400);
    }

    const resolvedPath = path.resolve(projectPath);
    const tool = c.req.query("tool");

    try {
      const records = await loadProjectRecords(adapters, resolvedPath, tool);
      const store = await loadSnoozeStore(homedir);
      const prefs = getProjectPreferences(store, resolvedPath);
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

    const store = await loadSnoozeStore(homedir);
    const prefs = getProjectPreferences(store, path.resolve(projectPath));
    return c.json({ projectPath: path.resolve(projectPath), preferences: prefs });
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
    const store = await loadSnoozeStore(homedir);
    const prefs = getProjectPreferences(store, resolvedPath);
    if (!prefs.snoozedFindingIds.includes(body.findingId)) {
      prefs.snoozedFindingIds.push(body.findingId);
    }
    const next = setProjectPreferences(store, resolvedPath, prefs);
    await saveSnoozeStore(homedir, next);

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
    const store = await loadSnoozeStore(homedir);
    const prefs = getProjectPreferences(store, resolvedPath);
    const enabled = body.enabled ?? false;

    if (enabled) {
      prefs.disabledRuleIds = prefs.disabledRuleIds.filter((id) => id !== body.ruleId);
    } else if (!prefs.disabledRuleIds.includes(body.ruleId)) {
      prefs.disabledRuleIds.push(body.ruleId);
    }

    const next = setProjectPreferences(store, resolvedPath, prefs);
    await saveSnoozeStore(homedir, next);

    return c.json({ ok: true, preferences: prefs });
  });

  return app;
}
