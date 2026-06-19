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
});
