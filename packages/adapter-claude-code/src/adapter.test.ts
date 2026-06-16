import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { ClaudeCodeAdapter } from "./adapter.js";
import { encodeProjectSlug } from "./paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, "..", "fixtures");
const sampleProject = path.join(fixturesRoot, "sample-project");
const homedir = path.join(fixturesRoot, "home");

describe("encodeProjectSlug", () => {
  it("replaces slashes with dashes", () => {
    expect(encodeProjectSlug("/Users/dev/my-app")).toBe("-Users-dev-my-app");
  });
});

describe("ClaudeCodeAdapter", () => {
  beforeAll(async () => {
    const slug = encodeProjectSlug(sampleProject);
    const memoryDir = path.join(homedir, ".claude", "projects", slug, "memory");
    await fs.mkdir(memoryDir, { recursive: true });
    await fs.writeFile(
      path.join(memoryDir, "MEMORY.md"),
      "# Memory index\n\n## Stack\n- TypeScript\n- Vitest\n",
      "utf8",
    );
  });

  it("lists CLAUDE.md for a project", async () => {
    const adapter = new ClaudeCodeAdapter(homedir);
    const sources = await adapter.listSources({ projectPath: sampleProject });

    const claudeMd = sources.find((s) => s.kind === "claude-md");
    expect(claudeMd).toBeDefined();
    expect(claudeMd?.path).toBe(path.join(sampleProject, "CLAUDE.md"));
  });

  it("lists auto memory when present", async () => {
    const adapter = new ClaudeCodeAdapter(homedir);
    const sources = await adapter.listSources({ projectPath: sampleProject });

    expect(sources.some((s) => s.kind === "claude-auto-memory")).toBe(true);
  });

  it("reads CLAUDE.md content", async () => {
    const adapter = new ClaudeCodeAdapter(homedir);
    const records = await adapter.listRecords({ projectPath: sampleProject });
    const claude = records.find((r) => r.title === "CLAUDE.md");

    expect(claude?.content).toContain("Postgres");
  });

  it("searches record content", async () => {
    const adapter = new ClaudeCodeAdapter(homedir);
    const hits = await adapter.search({ projectPath: sampleProject }, "vitest");

    expect(hits.length).toBeGreaterThan(0);
  });
});
