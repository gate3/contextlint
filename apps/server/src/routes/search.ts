import type { Hono } from "hono";
import { resolveAdapters } from "../adapters.js";
import type { ServerContext } from "./context.js";

export function registerSearchRoutes(app: Hono, ctx: ServerContext): void {
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
    const resolved = resolveAdapters(ctx.adapters, tool);
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
}
