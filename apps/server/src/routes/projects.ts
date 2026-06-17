import { discoverProjects, loadMeminspectConfig } from "@meminspect/core";
import type { Hono } from "hono";
import { resolveAdapters } from "../adapters.js";
import { loadProjectRecordBundles } from "../services/project-records.js";
import type { ServerContext } from "./context.js";

export function registerProjectRoutes(app: Hono, ctx: ServerContext): void {
  app.get("/projects", async (c) => {
    const config = await loadMeminspectConfig(ctx.homedir);
    const projects = await discoverProjects(ctx.adapters, ctx.homedir, config);
    return c.json({ projects });
  });

  app.get("/projects/sources", async (c) => {
    const projectPath = c.req.query("path");
    if (!projectPath) {
      return c.json({ error: "Missing query parameter: path", code: "BAD_REQUEST" }, 400);
    }

    const tool = c.req.query("tool");
    const resolved = resolveAdapters(ctx.adapters, tool);
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
    try {
      const bundles = await loadProjectRecordBundles(ctx.adapters, projectPath, tool);
      return c.json({ projectPath, bundles });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load records";
      return c.json({ error: message, code: "NOT_FOUND" }, 404);
    }
  });
}
