#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { loadMeminspectConfig } from "@meminspect/core";
import os from "node:os";
import { createApp, createAdapters } from "./app.js";

const host = process.env.MEMINSPECT_HOST ?? "127.0.0.1";
const port = Number(process.env.MEMINSPECT_PORT ?? 3847);

const homedir = os.homedir();
const config = await loadMeminspectConfig(homedir);
const app = createApp({ homedir, adapters: createAdapters(homedir, config) });

serve({ fetch: app.fetch, hostname: host, port }, (info) => {
  console.log(`meminspect API listening on http://${info.address}:${info.port}`);
});
