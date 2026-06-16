import type { ToolAdapter } from "@contextlint/core";
import { createClaudeCodeAdapter } from "@contextlint/adapter-claude-code";
import { Hono } from "hono";
import { cors } from "hono/cors";

export function createAdapters(): ToolAdapter[] {
  return [createClaudeCodeAdapter()];
}

export function createApp(adapters: ToolAdapter[] = createAdapters()) {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    }),
  );

  app.get("/health", (c) => {
    return c.json({ ok: true, service: "contextlint" });
  });

  app.get("/tools", async (c) => {
    const tools = await Promise.all(adapters.map((a) => a.detect()));
    return c.json({ tools });
  });

  app.get("/projects/sources", async (c) => {
    const projectPath = c.req.query("path");
    if (!projectPath) {
      return c.json({ error: "Missing query parameter: path", code: "BAD_REQUEST" }, 400);
    }

    const tool = c.req.query("tool") ?? "claude-code";
    const adapter = adapters.find((a) => a.id === tool);
    if (!adapter) {
      return c.json({ error: `Unknown tool: ${tool}`, code: "NOT_FOUND" }, 404);
    }

    const sources = await adapter.listSources({ projectPath });
    return c.json({ projectPath, tool, sources });
  });

  app.get("/records", async (c) => {
    const projectPath = c.req.query("path");
    const recordId = c.req.query("id");
    const tool = c.req.query("tool") ?? "claude-code";

    if (!projectPath || !recordId) {
      return c.json(
        { error: "Missing query parameters: path, id", code: "BAD_REQUEST" },
        400,
      );
    }

    const adapter = adapters.find((a) => a.id === tool);
    if (!adapter) {
      return c.json({ error: `Unknown tool: ${tool}`, code: "NOT_FOUND" }, 404);
    }

    const record = await adapter.readRecord({ projectPath }, recordId);
    return c.json({ record });
  });

  app.get("/search", async (c) => {
    const projectPath = c.req.query("path");
    const query = c.req.query("q");
    const tool = c.req.query("tool") ?? "claude-code";

    if (!projectPath || !query) {
      return c.json(
        { error: "Missing query parameters: path, q", code: "BAD_REQUEST" },
        400,
      );
    }

    const adapter = adapters.find((a) => a.id === tool);
    if (!adapter) {
      return c.json({ error: `Unknown tool: ${tool}`, code: "NOT_FOUND" }, 404);
    }

    const hits = await adapter.search({ projectPath }, query);
    return c.json({ hits });
  });

  return app;
}
