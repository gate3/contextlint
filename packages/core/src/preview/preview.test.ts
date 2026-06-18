import { describe, expect, it } from "vitest";
import { withFindingId } from "../scan/finding-id.js";
import type { ScannedRecord } from "../scan/types.js";
import { buildSessionPreview } from "./assembler.js";
import { isSessionLoadSource } from "./layers.js";

const PROJECT = "/tmp/preview-demo";

function record(
  partial: Partial<ScannedRecord> & Pick<ScannedRecord, "id" | "source" | "content" | "tool">,
): ScannedRecord {
  return {
    path: `${PROJECT}/file.md`,
    kind: "markdown",
    title: "test.md",
    metadata: { scope: "project", tool: partial.tool, writable: true },
    ...partial,
  };
}

describe("buildSessionPreview", () => {
  it("builds layered token breakdown per tool", () => {
    const preview = buildSessionPreview(PROJECT, [
      record({
        id: "cursor-rules::a.mdc",
        source: "cursor-rules",
        tool: "cursor",
        content: "a".repeat(400),
        title: "a.mdc",
      }),
      record({
        id: "cursor-learned::learned",
        source: "cursor-learned",
        tool: "cursor",
        content: "b".repeat(200),
        title: "learned_memories.mdc",
      }),
      record({
        id: "claude-md::CLAUDE.md",
        source: "claude-md",
        tool: "claude-code",
        content: "c".repeat(800),
        title: "CLAUDE.md",
      }),
      record({
        id: "cursor-sqlite-kv::x",
        source: "cursor-sqlite-kv",
        kind: "sqlite-kv",
        tool: "cursor",
        content: "z".repeat(10_000),
        title: "composerData",
        metadata: { scope: "project", tool: "cursor", writable: false },
      }),
    ]);

    expect(preview.tools).toHaveLength(2);
    const cursor = preview.tools.find((t) => t.tool === "cursor");
    const claude = preview.tools.find((t) => t.tool === "claude-code");
    expect(cursor?.layers).toHaveLength(2);
    expect(cursor?.totalTokens).toBe(estimateLayerTotal(400, 200));
    expect(claude?.layers).toHaveLength(1);
    expect(claude?.totalTokens).toBe(200);
    expect(preview.grandTotalTokens).toBe(cursor!.totalTokens + claude!.totalTokens);
    expect(preview.sessionRecordIds).not.toContain("cursor-sqlite-kv::x");
  });

  it("attaches scan conflicts that reference session-load records", () => {
    const records = [
      record({
        id: "claude-md::CLAUDE.md",
        source: "claude-md",
        tool: "claude-code",
        content: "Use react 16.0.0",
        title: "CLAUDE.md",
      }),
      record({
        id: "cursor-sqlite-kv::x",
        source: "cursor-sqlite-kv",
        kind: "sqlite-kv",
        tool: "cursor",
        content: "/other/project",
        title: "kv",
        metadata: { scope: "project", tool: "cursor", writable: false },
      }),
    ];

    const sessionFinding = withFindingId({
      ruleId: "stale-dep",
      severity: "warning",
      title: "Stale version in CLAUDE.md",
      detail: "react mismatch",
      recordIds: ["claude-md::CLAUDE.md"],
    });
    const kvFinding = withFindingId({
      ruleId: "cross-project-leak",
      severity: "warning",
      title: "Leak in kv",
      detail: "external path",
      recordIds: ["cursor-sqlite-kv::x"],
    });

    const preview = buildSessionPreview(PROJECT, records, {
      scanFindings: [sessionFinding, kvFinding],
    });

    expect(preview.conflictCount).toBe(1);
    expect(preview.conflictFindings[0]?.id).toBe(sessionFinding.id);
  });

  it("omits empty layers and tools with no session memory", () => {
    const preview = buildSessionPreview(PROJECT, [
      record({
        id: "claude-md::CLAUDE.md",
        source: "claude-md",
        tool: "claude-code",
        content: "hello",
        title: "CLAUDE.md",
      }),
    ]);

    expect(preview.tools).toHaveLength(1);
    expect(preview.tools[0]?.tool).toBe("claude-code");
  });
});

describe("isSessionLoadSource", () => {
  it("excludes sqlite kv from session load", () => {
    expect(isSessionLoadSource("cursor-rules")).toBe(true);
    expect(isSessionLoadSource("cursor-sqlite-kv")).toBe(false);
    expect(isSessionLoadSource("claude-mcp-config")).toBe(false);
  });
});

function estimateLayerTotal(...charCounts: number[]): number {
  const total = charCounts.reduce((sum, count) => sum + count, 0);
  return Math.ceil(total / 4);
}
