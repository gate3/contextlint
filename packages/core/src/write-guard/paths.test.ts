import { describe, expect, it } from "vitest";
import { backupArtifactName } from "./paths.js";

describe("backupArtifactName", () => {
  it("flattens posix paths", () => {
    expect(backupArtifactName("/tmp/project/.cursor/rules/a.mdc")).toBe(
      "tmp--project--.cursor--rules--a.mdc",
    );
  });

  it("flattens windows paths", () => {
    expect(backupArtifactName("C:\\Users\\me\\project\\CLAUDE.md")).toBe(
      "C--Users--me--project--CLAUDE.md",
    );
  });

  it("truncates very long paths and keeps a stable hash suffix", () => {
    const deep = `/tmp/${"nested--".repeat(80)}rules.mdc`;
    const name = backupArtifactName(deep);
    expect(name.length).toBeLessThanOrEqual(200);
    expect(name).toMatch(/[a-f0-9]{12}\.mdc$/);
    expect(backupArtifactName(deep)).toBe(name);
  });
});
