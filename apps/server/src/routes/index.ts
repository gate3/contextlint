import type { Hono } from "hono";
import type { ServerContext } from "./context.js";
import { registerDemoRoutes } from "./demo.js";
import { registerHealthRoutes } from "./health.js";
import { registerPreviewRoutes } from "./preview.js";
import { registerProjectRoutes } from "./projects.js";
import { registerRecordRoutes } from "./records.js";
import { registerScanRoutes } from "./scan.js";
import { registerSearchRoutes } from "./search.js";
import { registerToolRoutes } from "./tools.js";

export function registerRoutes(app: Hono, ctx: ServerContext): void {
  registerHealthRoutes(app);
  registerDemoRoutes(app);
  registerToolRoutes(app, ctx);
  registerProjectRoutes(app, ctx);
  registerRecordRoutes(app, ctx);
  registerSearchRoutes(app, ctx);
  registerScanRoutes(app, ctx);
  registerPreviewRoutes(app, ctx);
}

export type { ServerContext } from "./context.js";
