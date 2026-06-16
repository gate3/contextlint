import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("API", () => {
  it("GET /health returns ok", async () => {
    const app = createApp({ adapters: [] });
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, service: "meminspect" });
  });

  it("GET /projects returns discovered projects", async () => {
    const app = createApp({
      adapters: [
        {
          id: "cursor",
          detect: async () => ({ tool: "cursor", found: true, paths: [] }),
          listProjects: async () => [
            { id: "p1", path: "/tmp/demo", name: "demo", tools: ["cursor"] },
          ],
          listSources: async () => [],
          listRecords: async () => [],
          readRecord: async () => {
            throw new Error("not used");
          },
          search: async () => [],
        },
      ],
    });

    const res = await app.request("/projects");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { projects: Array<{ path: string }> };
    expect(body.projects.some((p) => p.path === "/tmp/demo")).toBe(true);
  });
});
