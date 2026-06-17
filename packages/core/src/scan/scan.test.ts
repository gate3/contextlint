import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ScannedRecord } from "./types.js";
import { runScan, buildScanContext } from "./engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function record(
  partial: Partial<ScannedRecord> & Pick<ScannedRecord, "id" | "source" | "content" | "tool">,
): ScannedRecord {
  return {
    path: "/tmp/demo/file.md",
    kind: "markdown",
    title: "test.md",
    metadata: { scope: "project", tool: partial.tool, writable: true },
    ...partial,
  };
}

describe("runScan", () => {
  it("flags over-broad alwaysApply rules", async () => {
    const ctx = await buildScanContext("/tmp/demo", [
      record({
        id: "cursor-rules::a.mdc",
        source: "cursor-rules",
        title: "a.mdc",
        tool: "cursor",
        content: "---\nalwaysApply: true\n---\nDo things",
        metadata: { scope: "project", tool: "cursor", writable: true, alwaysApply: true },
      }),
    ]);

    const result = runScan(ctx);
    expect(result.findings.some((f) => f.ruleId === "over-broad")).toBe(true);
  });

  it("detects contradictory package manager guidance", async () => {
    const ctx = await buildScanContext("/tmp/demo", [
      record({
        id: "a",
        source: "cursor-rules",
        title: "a",
        tool: "cursor",
        content: "Always use pnpm for installs",
      }),
      record({
        id: "b",
        source: "claude-md",
        title: "CLAUDE.md",
        tool: "claude-code",
        content: "Use npm when installing packages",
      }),
    ]);

    const result = runScan(ctx);
    expect(result.findings.some((f) => f.ruleId === "contradiction")).toBe(true);
  });

  it("respects snoozed finding ids", async () => {
    const ctx = await buildScanContext("/tmp/demo", [
      record({
        id: "cursor-rules::a.mdc",
        source: "cursor-rules",
        title: "a.mdc",
        tool: "cursor",
        content: "always apply",
        metadata: { scope: "project", tool: "cursor", writable: true, alwaysApply: true },
      }),
    ]);

    const full = runScan(ctx);
    const findingId = full.findings[0]?.id;
    expect(findingId).toBeDefined();

    const filtered = runScan(ctx, { snoozedFindingIds: [findingId!] });
    expect(filtered.findings).toHaveLength(0);
    expect(filtered.stats.snoozed).toBe(1);
  });

  it("flags stale dependency versions when package.json present", async () => {
    const fixtureProject = path.join(__dirname, "fixtures", "stale-dep-project");
    const ctx = await buildScanContext(fixtureProject, [
      record({
        id: "claude-md::CLAUDE.md",
        source: "claude-md",
        title: "CLAUDE.md",
        tool: "claude-code",
        content: "This project uses react 16.0.0 for UI",
        path: path.join(fixtureProject, "CLAUDE.md"),
      }),
    ]);

    const result = runScan(ctx);
    expect(result.findings.some((f) => f.ruleId === "stale-dep")).toBe(true);
  });

  it("ignores non-semver package.json versions for stale-dep", async () => {
    const ctx = await buildScanContext("/tmp/demo", [
      record({
        id: "claude-md::CLAUDE.md",
        source: "claude-md",
        title: "CLAUDE.md",
        tool: "claude-code",
        content: "Use @meminspect/core 1.2.3 in examples",
      }),
    ]);
    ctx.packageJson = {
      dependencies: { "@meminspect/core": "workspace:*" },
      devDependencies: {},
    };

    const result = runScan(ctx);
    expect(result.findings.some((f) => f.ruleId === "stale-dep")).toBe(false);
  });
});
