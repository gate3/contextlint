import type { ToolAdapter } from "@meminspect/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import os from "node:os";
import { createAdapters } from "./adapters.js";
import { registerRoutes } from "./routes/index.js";

export interface AppOptions {
  homedir?: string;
  adapters?: ToolAdapter[];
}

export { createAdapters } from "./adapters.js";

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

  registerRoutes(app, { homedir, adapters });

  return app;
}
