import { describe, expect, it } from "vitest";
import {
  extractReferencedPaths,
  isMentionedPathInProject,
  isProjectPathReference,
  normalizePath,
  sanitizeExtractedPath,
} from "./path-utils.js";
import { crossProjectLeakRule } from "./rules/cross-project-leak.js";
import type { ScannedRecord } from "./types.js";

const MEMINSPECT = "/Users/dimopc/Documents/Professional/ai-apps/meminspect";

describe("isProjectPathReference", () => {
  it("treats the project root as in-project", () => {
    expect(isProjectPathReference(MEMINSPECT, MEMINSPECT)).toBe(true);
  });

  it("treats paths under the project as in-project", () => {
    expect(isProjectPathReference(MEMINSPECT, `${MEMINSPECT}/apps/web`)).toBe(true);
  });

  it("treats parent directories as related (monorepo)", () => {
    expect(isProjectPathReference(MEMINSPECT, "/Users/dimopc/Documents/Professional/ai-apps")).toBe(
      true,
    );
  });

  it("flags unrelated paths", () => {
    expect(isProjectPathReference(MEMINSPECT, "/Users/dimopc/other-app")).toBe(false);
  });
});

describe("sanitizeExtractedPath", () => {
  it("strips trailing punctuation", () => {
    expect(sanitizeExtractedPath(`${MEMINSPECT}.`)).toBe(MEMINSPECT);
    expect(sanitizeExtractedPath(`${MEMINSPECT},`)).toBe(MEMINSPECT);
  });
});

describe("isMentionedPathInProject", () => {
  it("matches project path with trailing punctuation", () => {
    expect(isMentionedPathInProject(MEMINSPECT, `${MEMINSPECT}.`)).toBe(true);
  });
});

describe("extractReferencedPaths", () => {
  it("parses file:// URIs", () => {
    const paths = extractReferencedPaths(`root: file://${MEMINSPECT}/apps/web`);
    expect(paths.some((p) => p.includes("meminspect"))).toBe(true);
  });

  it("strips trailing period from prose paths", () => {
    const paths = extractReferencedPaths(`Repo lives at ${MEMINSPECT}.`);
    expect(paths).toEqual([MEMINSPECT]);
  });
});

describe("crossProjectLeakRule", () => {
  function record(content: string, overrides: Partial<ScannedRecord> = {}): ScannedRecord {
    return {
      id: "claude-md::CLAUDE.md",
      source: "claude-md",
      path: `${MEMINSPECT}/CLAUDE.md`,
      kind: "markdown",
      title: "CLAUDE.md",
      content,
      tool: "claude-code",
      metadata: { scope: "project", tool: "claude-code", writable: true },
      ...overrides,
    };
  }

  it("does not flag references to the current project path", () => {
    const findings = crossProjectLeakRule.run({
      projectPath: MEMINSPECT,
      projectName: "meminspect",
      records: [record(`Repo root: ${MEMINSPECT}`)],
    });
    expect(findings).toHaveLength(0);
  });

  it("does not flag project path with trailing punctuation", () => {
    const findings = crossProjectLeakRule.run({
      projectPath: MEMINSPECT,
      projectName: "meminspect",
      records: [record(`See ${MEMINSPECT}.`)],
    });
    expect(findings).toHaveLength(0);
  });

  it("does not flag file:// URIs under the project", () => {
    const findings = crossProjectLeakRule.run({
      projectPath: MEMINSPECT,
      projectName: "meminspect",
      records: [record(`Open file://${MEMINSPECT}/apps/web/src/api.ts`)],
    });
    expect(findings).toHaveLength(0);
  });

  it("flags references to other projects", () => {
    const findings = crossProjectLeakRule.run({
      projectPath: MEMINSPECT,
      projectName: "meminspect",
      records: [record("Copy patterns from /Users/dimopc/legacy-app/auth")],
    });
    expect(findings).toHaveLength(1);
  });

  it("does not flag sibling projects under the same parent", () => {
    const findings = crossProjectLeakRule.run({
      projectPath: MEMINSPECT,
      projectName: "meminspect",
      records: [record("Also see /Users/dimopc/Documents/Professional/ai-apps/other-app")],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail).toContain("other-app");
    expect(findings[0]?.detail).not.toContain("meminspect");
  });

  it("skips cursor sqlite kv records", () => {
    const findings = crossProjectLeakRule.run({
      projectPath: MEMINSPECT,
      projectName: "meminspect",
      records: [
        record("", {
          id: "cursor-sqlite-kv::x",
          source: "cursor-sqlite-kv",
          kind: "sqlite-kv",
          title: "composerData",
          content: `/Users/dimopc/other-app ${MEMINSPECT}`,
          tool: "cursor",
          metadata: { scope: "project", tool: "cursor", writable: false },
        }),
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
