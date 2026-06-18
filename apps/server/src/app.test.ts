import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
              path: "/tmp/demo/CLAUDE.md",
              kind: "markdown",
              title: "CLAUDE.md",
              content: "hello",
              metadata: { scope: "project", tool: "claude-code", writable: true },
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

  it("POST /projects/scan returns findings", async () => {
    const app = createApp({
      homedir: "/tmp/meminspect-test-home",
      adapters: [
        {
          id: "cursor",
          detect: async () => ({ tool: "cursor", found: true, paths: [] }),
          listProjects: async () => [],
          probeProject: async () => false,
          listSources: async () => [],
          listRecords: async () => [
            {
              id: "cursor-rules::wide.mdc",
              source: "cursor-rules",
              path: "/tmp/demo/.cursor/rules/wide.mdc",
              kind: "markdown",
              title: "wide.mdc",
              content: "Always do X",
              metadata: {
                scope: "project",
                tool: "cursor",
                writable: true,
                alwaysApply: true,
              },
            },
          ],
          readRecord: async () => {
            throw new Error("not used");
          },
          search: async () => [],
        },
      ],
    });

    const res = await app.request("/projects/scan?path=/tmp/demo", { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      findings: Array<{ ruleId: string }>;
      stats: { rulesRun: number };
    };
    expect(body.stats.rulesRun).toBeGreaterThan(0);
    expect(body.findings.some((f) => f.ruleId === "over-broad")).toBe(true);
  });

  it("GET /projects/preview returns layered token breakdown", async () => {
    const app = createApp({
      homedir: "/tmp/meminspect-test-home",
      adapters: [
        {
          id: "cursor",
          detect: async () => ({ tool: "cursor", found: true, paths: [] }),
          listProjects: async () => [],
          probeProject: async () => false,
          listSources: async () => [],
          listRecords: async () => [
            {
              id: "cursor-rules::a.mdc",
              source: "cursor-rules",
              path: "/tmp/demo/.cursor/rules/a.mdc",
              kind: "markdown",
              title: "a.mdc",
              content: "rule content",
              metadata: { scope: "project", tool: "cursor", writable: true },
            },
          ],
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
              path: "/tmp/demo/CLAUDE.md",
              kind: "markdown",
              title: "CLAUDE.md",
              content: "project instructions",
              metadata: { scope: "project", tool: "claude-code", writable: true },
            },
          ],
          readRecord: async () => {
            throw new Error("not used");
          },
          search: async () => [],
        },
      ],
    });

    const res = await app.request("/projects/preview?path=/tmp/demo");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tools: Array<{ tool: string; totalTokens: number }>;
      grandTotalTokens: number;
      sessionRecordIds: string[];
      scan: { stats: { rulesRun: number } };
    };
    expect(body.tools).toHaveLength(2);
    expect(body.sessionRecordIds).toHaveLength(2);
    expect(body.grandTotalTokens).toBeGreaterThan(0);
    expect(body.scan.stats.rulesRun).toBeGreaterThan(0);
  });

  it("GET /demo/scan-project returns fixture path when present", async () => {
    const app = createApp({ adapters: [] });
    const res = await app.request("/demo/scan-project");
    if (res.status === 404) {
      return;
    }
    expect(res.status).toBe(200);
    const body = (await res.json()) as { path: string };
    expect(body.path).toContain("health-scan-demo");
  });

  it("PUT /records writes markdown with backup and POST /undo restores", async () => {
    const homedir = await fs.mkdtemp(path.join(os.tmpdir(), "meminspect-write-"));
    const projectPath = path.join(homedir, "demo");
    const rulePath = path.join(projectPath, ".cursor", "rules", "a.mdc");
    await fs.mkdir(path.dirname(rulePath), { recursive: true });
    await fs.writeFile(rulePath, "original", "utf8");

    const recordId = `cursor-rules::${rulePath}`;
    const adapter = {
      id: "cursor" as const,
      detect: async () => ({ tool: "cursor" as const, found: true, paths: [] }),
      listProjects: async () => [],
      probeProject: async () => true,
      listSources: async () => [],
      listRecords: async () => [
        {
          id: recordId,
          source: "cursor-rules" as const,
          path: rulePath,
          kind: "markdown" as const,
          title: "a.mdc",
          content: await fs.readFile(rulePath, "utf8"),
          metadata: { scope: "project" as const, tool: "cursor" as const, writable: true },
        },
      ],
      readRecord: async () => ({
        id: recordId,
        source: "cursor-rules" as const,
        path: rulePath,
        kind: "markdown" as const,
        title: "a.mdc",
        content: await fs.readFile(rulePath, "utf8"),
        metadata: { scope: "project" as const, tool: "cursor" as const, writable: true },
      }),
      search: async () => [],
    };

    const app = createApp({ homedir, adapters: [adapter] });
    const putRes = await app.request(
      `/records?path=${encodeURIComponent(projectPath)}&id=${encodeURIComponent(recordId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated" }),
      },
    );
    expect(putRes.status).toBe(200);
    const putBody = (await putRes.json()) as { backupPath: string; record: { content: string } };
    expect(putBody.record.content).toBe("updated");
    expect(putBody.backupPath).toContain(".meminspect/backups");
    await expect(fs.readFile(rulePath, "utf8")).resolves.toBe("updated");

    const undoStatus = await app.request("/undo");
    expect(undoStatus.status).toBe(200);
    const undoBody = (await undoStatus.json()) as { available: boolean };
    expect(undoBody.available).toBe(true);

    const undoRes = await app.request("/undo", { method: "POST" });
    expect(undoRes.status).toBe(200);
    await expect(fs.readFile(rulePath, "utf8")).resolves.toBe("original");
  });
});
