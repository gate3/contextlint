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
          probeProject: async () => true,
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

  it("GET /projects/records tolerates a failing adapter", async () => {
    const app = createApp({
      adapters: [
        {
          id: "cursor",
          detect: async () => ({ tool: "cursor", found: true, paths: [] }),
          listProjects: async () => [],
          probeProject: async () => false,
          listSources: async () => [],
          listRecords: async () => {
            throw new Error("cursor db locked");
          },
          readRecord: async () => {
            throw new Error("not used");
          },
          search: async () => [],
        },
        {
          id: "claude-code",
          detect: async () => ({ tool: "claude-code", found: true, paths: [] }),
          listProjects: async () => [],
          probeProject: async () => false,
          listSources: async () => [],
          listRecords: async () => [
            {
              id: "claude-md::CLAUDE.md",
              source: "claude-md",
              kind: "markdown",
              title: "CLAUDE.md",
              content: "hello",
              metadata: { writable: true, path: "/tmp/demo/CLAUDE.md" },
            },
          ],
          readRecord: async () => {
            throw new Error("not used");
          },
          search: async () => [],
        },
      ],
    });

    const res = await app.request("/projects/records?path=/tmp/demo");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      bundles: Array<{ tool: string; records: unknown[] }>;
    };
    expect(body.bundles).toHaveLength(2);
    expect(body.bundles.find((b) => b.tool === "cursor")?.records).toEqual([]);
    expect(body.bundles.find((b) => b.tool === "claude-code")?.records).toHaveLength(1);
  });
});
