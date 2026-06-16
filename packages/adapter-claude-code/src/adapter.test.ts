import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ClaudeCodeAdapter } from "./adapter.js";
import { encodeProjectSlug } from "./paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, "..", "fixtures");
const homedir = path.join(fixturesRoot, "home");

/** Stable absolute path so auto-memory slug is portable across machines. */
export const FIXTURE_PROJECT_PATH = "/fixture/sample-project";
const sampleProject = path.join(fixturesRoot, "sample-project");

describe("encodeProjectSlug", () => {
  it("replaces slashes with dashes", () => {
    expect(encodeProjectSlug("/Users/dev/my-app")).toBe("-Users-dev-my-app");
    expect(encodeProjectSlug(FIXTURE_PROJECT_PATH)).toBe("-fixture-sample-project");
  });
});

describe("ClaudeCodeAdapter", () => {
  it("lists CLAUDE.md when present at project root", async () => {
    const adapter = new ClaudeCodeAdapter(homedir);
    const sources = await adapter.listSources({ projectPath: sampleProject });

    const claudeMd = sources.find((s) => s.kind === "claude-md");
    expect(claudeMd).toBeDefined();
  });

  it("lists auto memory for stable fixture slug", async () => {
    const adapter = new ClaudeCodeAdapter(homedir);
    const sources = await adapter.listSources({ projectPath: FIXTURE_PROJECT_PATH });

    expect(sources.some((s) => s.kind === "claude-auto-memory")).toBe(true);
  });

  it("reads auto memory content", async () => {
    const adapter = new ClaudeCodeAdapter(homedir);
    const records = await adapter.listRecords({ projectPath: FIXTURE_PROJECT_PATH });
    const memory = records.find((r) => r.title === "MEMORY.md");

    expect(memory?.content).toContain("Vitest");
  });

  it("searches record content", async () => {
    const adapter = new ClaudeCodeAdapter(homedir);
    const hits = await adapter.search({ projectPath: FIXTURE_PROJECT_PATH }, "vitest");

    expect(hits.length).toBeGreaterThan(0);
  });
});
