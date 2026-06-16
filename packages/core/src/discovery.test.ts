import { describe, expect, it } from "vitest";
import type { ToolAdapter } from "@meminspect/core";
import { discoverProjects } from "@meminspect/core";

describe("discoverProjects", () => {
  it("merges adapter projects with manual config entries", async () => {
    const adapter: ToolAdapter = {
      id: "cursor",
      detect: async () => ({ tool: "cursor", found: true, paths: [] }),
      listProjects: async () => [
        { id: "a", path: "/Users/dev/app-a", name: "app-a", tools: ["cursor"] },
      ],
      listSources: async () => [],
      listRecords: async () => [],
      readRecord: async () => {
        throw new Error("not used");
      },
      search: async () => [],
    };

    const projects = await discoverProjects([adapter], "/tmp", {
      projects: [{ path: "/Users/dev/app-b", tools: ["claude-code"] }],
    });

    expect(projects).toHaveLength(2);
    expect(projects.map((p) => p.path).sort()).toEqual([
      "/Users/dev/app-a",
      "/Users/dev/app-b",
    ]);
  });
});
