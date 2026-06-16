import { describe, expect, it } from "vitest";
import type { ProjectRef, ToolId } from "./types.js";
import type { ToolAdapter } from "./types.js";
import { discoverProjects } from "./discovery.js";

function stubAdapter(
  id: ToolId,
  projects: ProjectRef[],
  probePaths: Set<string>,
): ToolAdapter {
  return {
    id,
    detect: async () => ({ tool: id, found: true, paths: [] }),
    listProjects: async () => projects,
    probeProject: async ({ projectPath }) => probePaths.has(projectPath),
    listSources: async () => [],
    listRecords: async () => [],
    readRecord: async () => {
      throw new Error("not used");
    },
    search: async () => [],
  };
}

describe("discoverProjects", () => {
  it("merges adapter projects with manual config entries", async () => {
    const cursor = stubAdapter(
      "cursor",
      [{ id: "a", path: "/Users/dev/app-a", name: "app-a", tools: ["cursor"] }],
      new Set(),
    );

    const projects = await discoverProjects([cursor], "/tmp", {
      projects: [{ path: "/Users/dev/app-b", tools: ["claude-code"] }],
    });

    expect(projects).toHaveLength(2);
    expect(projects.map((p) => p.path).sort()).toEqual([
      "/Users/dev/app-a",
      "/Users/dev/app-b",
    ]);
  });

  it("adds tools via probe without removing existing ones", async () => {
    const cursor = stubAdapter(
      "cursor",
      [
        { id: "a", path: "/repo/a", name: "a", tools: ["cursor"] },
        { id: "b", path: "/repo/b", name: "b", tools: ["cursor"] },
      ],
      new Set(),
    );

    const claude = stubAdapter("claude-code", [], new Set(["/repo/a"]));

    const projects = await discoverProjects([cursor, claude], "/tmp");
    const byPath = Object.fromEntries(projects.map((p) => [p.path, p.tools]));

    expect(byPath["/repo/a"]).toEqual(["cursor", "claude-code"]);
    expect(byPath["/repo/b"]).toEqual(["cursor"]);
  });
});
