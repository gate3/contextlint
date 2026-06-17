import type { Hono } from "hono";
import type { ServerContext } from "./context.js";

export function registerToolRoutes(app: Hono, ctx: ServerContext): void {
  app.get("/tools", async (c) => {
    const tools = await Promise.all(ctx.adapters.map((a) => a.detect()));
    return c.json({ tools });
  });
}
