import type { Hono } from "hono";
import { readUndoStatus, undoLastRecordWrite } from "../services/record-writes.js";
import type { ServerContext } from "./context.js";
import { WriteGuardError } from "@meminspect/core";
import { writeGuardStatus } from "./write-guard-errors.js";

export function registerUndoRoutes(app: Hono, ctx: ServerContext): void {
  app.get("/undo", async (c) => {
    const status = await readUndoStatus(ctx.homedir);
    return c.json(status);
  });

  app.post("/undo", async (c) => {
    try {
      const status = await undoLastRecordWrite(ctx.homedir);
      return c.json({ ok: true, status });
    } catch (err) {
      if (err instanceof WriteGuardError) {
        return c.json({ error: err.message, code: err.code }, writeGuardStatus(err));
      }
      const message = err instanceof Error ? err.message : "Undo failed";
      return c.json({ error: message, code: "UNDO_FAILED" }, 500);
    }
  });
}
