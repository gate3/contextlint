import type { ToolAdapter, ToolId } from "@meminspect/core";
import { createClaudeCodeAdapter } from "@meminspect/adapter-claude-code";
import { createCursorAdapter } from "@meminspect/adapter-cursor";
import { discoverProjects, loadMeminspectConfig } from "@meminspect/core";
import os from "node:os";
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
      resolved.adapters.map(async (adapter) => ({
        tool: adapter.id,
        sources: await adapter.listSources({ projectPath }),
      })),
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
      resolved.adapters.map(async (adapter) => ({
        tool: adapter.id,
        records: await adapter.listRecords({ projectPath }),
      })),
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
      resolved.adapters.map(async (adapter) => ({
        tool: adapter.id,
        hits: await adapter.search({ projectPath }, query),
      })),
    );

    return c.json({ hits: bundles.flatMap((b) => b.hits.map((h) => ({ ...h, tool: b.tool }))) });
  });

  return app;
}
