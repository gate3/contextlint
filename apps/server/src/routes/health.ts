import type { Hono } from "hono";

export function registerHealthRoutes(app: Hono): void {
  app.get("/health", (c) => {
    return c.json({ ok: true, service: "meminspect" });
  });
}
