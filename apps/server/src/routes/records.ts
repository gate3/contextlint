import type { ToolId } from "@meminspect/core";
import type { Hono } from "hono";
import { toolIdFromRecord } from "../adapters.js";
import type { ServerContext } from "./context.js";

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
}
