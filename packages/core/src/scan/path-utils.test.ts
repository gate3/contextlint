import { describe, expect, it } from "vitest";
import { isProjectPathReference, normalizePath } from "./path-utils.js";
import { crossProjectLeakRule } from "./rules/cross-project-leak.js";
import type { ScannedRecord } from "./types.js";

describe("isProjectPathReference", () => {
  const project = "/Users/dev/ai-apps/meminspect";

  it("treats the project root as in-project", () => {
    expect(isProjectPathReference(project, project)).toBe(true);
  });

  it("treats paths under the project as in-project", () => {
    expect(isProjectPathReference(project, `${project}/apps/web`)).toBe(true);
  });

  it("treats parent directories as related (monorepo)", () => {
    expect(isProjectPathReference(project, "/Users/dev/ai-apps")).toBe(true);
  });

  it("flags unrelated paths", () => {
    expect(isProjectPathReference(project, "/Users/dev/other-app")).toBe(false);
  });
});

describe("crossProjectLeakRule", () => {
  const projectPath = "/Users/dev/ai-apps/meminspect";

  function record(content: string): ScannedRecord {
    return {
      id: "claude-md::CLAUDE.md",
      source: "claude-md",
      path: `${projectPath}/CLAUDE.md`,
      kind: "markdown",
      title: "CLAUDE.md",
      content,
      tool: "claude-code",
      metadata: { scope: "project", tool: "claude-code", writable: true },
    };
  }

  it("does not flag references to the current project path", () => {
    const findings = crossProjectLeakRule.run({
      projectPath,
      projectName: "meminspect",
      records: [record(`Repo root: ${projectPath}`)],
    });
    expect(findings).toHaveLength(0);
  });

  it("flags references to other projects", () => {
    const findings = crossProjectLeakRule.run({
      projectPath,
      projectName: "meminspect",
      records: [record("Copy patterns from /Users/dev/legacy-app/auth")],
    });
    expect(findings).toHaveLength(1);
  });

  it("skips cursor sqlite kv records", () => {
    const findings = crossProjectLeakRule.run({
      projectPath,
      projectName: "meminspect",
      records: [
        {
          ...record(""),
          id: "cursor-sqlite-kv::x",
          source: "cursor-sqlite-kv",
          kind: "sqlite-kv",
          title: "composerData",
          content: `/Users/dev/other-app ${projectPath}`,
          tool: "cursor",
          metadata: { scope: "project", tool: "cursor", writable: false },
        },
      ],
    });
    expect(findings).toHaveLength(0);
  });
});

describe("normalizePath", () => {
  it("strips trailing slashes", () => {
    expect(normalizePath("/tmp/foo/")).toBe("/tmp/foo");
  });
});
