import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CursorAdapter } from "./adapter.js";
import { parseMdc } from "./mdc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, "..", "fixtures");
const sampleProject = path.join(fixturesRoot, "sample-project");
const cursorDataDir = path.join(fixturesRoot, "cursor-data", "User");
const workspaceHash = "fixture-workspace-hash";

function setupCursorSqliteFixture(): void {
  const globalDir = path.join(cursorDataDir, "globalStorage");
  const workspaceDir = path.join(cursorDataDir, "workspaceStorage", workspaceHash);
  fs.mkdirSync(globalDir, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });

  fs.writeFileSync(
    path.join(workspaceDir, "workspace.json"),
    JSON.stringify({ folder: `file://${sampleProject}` }),
  );

  const globalDbPath = path.join(globalDir, "state.vscdb");
  if (fs.existsSync(globalDbPath)) {
    fs.unlinkSync(globalDbPath);
  }
  const globalDb = new DatabaseSync(globalDbPath);
  globalDb.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value BLOB)");
  globalDb
    .prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)")
    .run("cursor/memories/global", "Remember to run tests before commit");
  globalDb.close();

  const workspaceDbPath = path.join(workspaceDir, "state.vscdb");
  if (fs.existsSync(workspaceDbPath)) {
    fs.unlinkSync(workspaceDbPath);
  }
  const workspaceDb = new DatabaseSync(workspaceDbPath);
  workspaceDb.exec("CREATE TABLE cursorDiskKV (key TEXT PRIMARY KEY, value BLOB)");
  workspaceDb
    .prepare("INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)")
    .run("composer/memory/context", "Project prefers pnpm workspaces");
  workspaceDb.close();
}

function teardownCursorSqliteFixture(): void {
  const storageRoot = path.join(fixturesRoot, "cursor-data");
  if (fs.existsSync(storageRoot)) {
    fs.rmSync(storageRoot, { recursive: true, force: true });
  }
}

describe("parseMdc", () => {
  it("parses frontmatter fields", () => {
    const content = `---
description: Test rule
globs: "**/*.ts"
alwaysApply: true
---

# Body
`;
    const parsed = parseMdc(content);
    expect(parsed.frontmatter.description).toBe("Test rule");
    expect(parsed.frontmatter.alwaysApply).toBe(true);
    expect(parsed.body).toContain("# Body");
  });
});

describe("CursorAdapter", () => {
  beforeAll(() => {
    setupCursorSqliteFixture();
  });

  afterAll(() => {
    teardownCursorSqliteFixture();
  });

  it("lists project rules and learned memories", async () => {
    const adapter = new CursorAdapter(fixturesRoot, cursorDataDir);
    const sources = await adapter.listSources({ projectPath: sampleProject });

    expect(sources.some((s) => s.kind === "cursor-rules")).toBe(true);
    expect(sources.some((s) => s.kind === "cursor-learned")).toBe(true);
  });

  it("reads rule records with metadata", async () => {
    const adapter = new CursorAdapter(fixturesRoot, cursorDataDir);
    const records = await adapter.listRecords({ projectPath: sampleProject });
    const rule = records.find((r) => r.kind === "markdown" && r.title === "typescript.mdc");

    expect(rule?.metadata.alwaysApply).toBe(false);
    expect(rule?.metadata.globs).toContain("**/*.ts");
    expect(rule?.content).toContain("strict TypeScript");
  });

  it("reads sqlite kv from global and workspace databases", async () => {
    const adapter = new CursorAdapter(fixturesRoot, cursorDataDir);
    const records = await adapter.listRecords({ projectPath: sampleProject });
    const sqliteRecords = records.filter((r) => r.kind === "sqlite-kv");

    expect(sqliteRecords.length).toBeGreaterThanOrEqual(2);
    expect(sqliteRecords.some((r) => r.title.includes("memories"))).toBe(true);
  });

  it("discovers projects from workspaceStorage", async () => {
    const adapter = new CursorAdapter(fixturesRoot, cursorDataDir);
    const projects = await adapter.listProjects();

    expect(projects.some((p) => p.path === sampleProject)).toBe(true);
  });

  it("searches across markdown and sqlite records", async () => {
    const adapter = new CursorAdapter(fixturesRoot, cursorDataDir);
    const hits = await adapter.search({ projectPath: sampleProject }, "pnpm");

    expect(hits.length).toBeGreaterThan(0);
  });
});
