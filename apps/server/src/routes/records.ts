import type { ToolId } from "@meminspect/core";
import { WriteGuardError } from "@meminspect/core";
import type { Hono } from "hono";
import { toolIdFromRecord } from "../adapters.js";
import { updateProjectRecord } from "../services/record-writes.js";
import type { ServerContext } from "./context.js";
import { writeGuardStatus } from "./write-guard-errors.js";

export function registerRecordRoutes(app: Hono, ctx: ServerContext): void {
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
    const adapter = ctx.adapters.find((a) => a.id === toolId);
    if (!adapter) {
      return c.json({ error: `Unknown tool: ${toolId}`, code: "NOT_FOUND" }, 404);
    }

    const record = await adapter.readRecord({ projectPath }, recordId);
    return c.json({ record });
  });

  app.put("/records", async (c) => {
    const projectPath = c.req.query("path");
    const recordId = c.req.query("id");
    const tool = c.req.query("tool");

    if (!projectPath || !recordId) {
      return c.json(
        { error: "Missing query parameters: path, id", code: "BAD_REQUEST" },
        400,
      );
    }

    if (tool && tool !== "cursor" && tool !== "claude-code") {
      return c.json(
        {
          error: "Invalid query parameter: tool must be 'cursor' or 'claude-code'",
          code: "BAD_REQUEST",
        },
        400,
      );
    }

    const body = (await c.req.json().catch(() => null)) as { content?: string } | null;
    if (body?.content === undefined) {
      return c.json({ error: "Missing body field: content", code: "BAD_REQUEST" }, 400);
    }

    try {
      const result = await updateProjectRecord(
        ctx.homedir,
        ctx.adapters,
        projectPath,
        recordId,
        body.content,
        tool,
      );
      return c.json(result);
    } catch (err) {
      if (err instanceof WriteGuardError) {
        return c.json({ error: err.message, code: err.code }, writeGuardStatus(err));
      }
      const message = err instanceof Error ? err.message : "Write failed";
      return c.json({ error: message, code: "WRITE_FAILED" }, 500);
    }
  });
}
