import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type {
  AdapterContext,
  AdapterDetection,
  MemoryRecord,
  MemorySource,
  MemorySourceKind,
  ProjectRef,
  SearchHit,
  ToolAdapter,
} from "@meminspect/core";
import { parseMdc } from "./mdc.js";
import {
  cursorGlobalStateDb,
  cursorUserDataDir,
  cursorWorkspaceStateDb,
  cursorWorkspaceStorageDir,
  projectLearnedMemoriesPath,
  projectRulesDir,
} from "./paths.js";
import { readCursorSqlite } from "./sqlite.js";

const RECORD_SEP = "::";

function recordId(kind: MemorySourceKind, key: string): string {
  return `${kind}${RECORD_SEP}${key}`;
}

function parseRecordId(recordId: string): { kind: MemorySourceKind; key: string } {
  const idx = recordId.indexOf(RECORD_SEP);
  if (idx === -1) {
    throw new Error(`Invalid record id: ${recordId}`);
  }
  return {
    kind: recordId.slice(0, idx) as MemorySourceKind,
    key: recordId.slice(idx + RECORD_SEP.length),
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

function titleFromPath(filePath: string): string {
  return path.basename(filePath);
}

function normalizeFolderUri(uri: string): string | null {
  if (uri.startsWith("file://")) {
    return path.resolve(decodeURIComponent(uri.replace("file://", "")));
  }
  return null;
}

async function findWorkspaceHashForProject(
  userDataDir: string,
  projectPath: string,
): Promise<string | null> {
  const storageDir = cursorWorkspaceStorageDir(userDataDir);
  if (!(await fileExists(storageDir))) {
    return null;
  }

  const resolvedProject = path.resolve(projectPath);
  const entries = await fs.readdir(storageDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const workspaceJson = path.join(storageDir, entry.name, "workspace.json");
    if (!(await fileExists(workspaceJson))) {
      continue;
    }
    try {
      const raw = await readText(workspaceJson);
      const data = JSON.parse(raw) as { folder?: string };
      if (data.folder) {
        const folderPath = normalizeFolderUri(data.folder);
        if (folderPath === resolvedProject) {
          return entry.name;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function buildMarkdownRecord(
  kind: MemorySourceKind,
  filePath: string,
  content: string,
  scope: MemoryRecord["metadata"]["scope"],
  extra?: Pick<MemoryRecord["metadata"], "alwaysApply" | "globs">,
): MemoryRecord {
  const parsed = filePath.endsWith(".mdc") ? parseMdc(content) : null;
  const globs = extra?.globs ?? parsed?.frontmatter.globs;
  const normalizedGlobs = globs
    ? Array.isArray(globs)
      ? globs
      : [globs]
    : undefined;

  return {
    id: recordId(kind, filePath),
    source: kind,
    path: filePath,
    kind: "markdown",
    title: titleFromPath(filePath),
    content,
    metadata: {
      scope,
      tool: "cursor",
      writable: true,
      alwaysApply: extra?.alwaysApply ?? parsed?.frontmatter.alwaysApply,
      globs: normalizedGlobs,
    },
  };
}

function buildSqliteRecord(
  dbPath: string,
  key: string,
  value: string,
  scope: MemoryRecord["metadata"]["scope"],
): MemoryRecord {
  const idKey = `${dbPath}${RECORD_SEP}${key}`;
  return {
    id: recordId("cursor-sqlite-kv", idKey),
    source: "cursor-sqlite-kv",
    path: dbPath,
    kind: "sqlite-kv",
    title: key,
    content: value,
    metadata: {
      scope,
      tool: "cursor",
      writable: false,
    },
  };
}

export class CursorAdapter implements ToolAdapter {
  readonly id = "cursor" as const;

  constructor(
    private readonly homedir: string = os.homedir(),
    private readonly dataDirOverride?: string | null,
  ) {}

  private userDataDir(): string {
    return cursorUserDataDir(this.homedir, this.dataDirOverride);
  }

  async detect(): Promise<AdapterDetection> {
    const userDataDir = this.userDataDir();
    const paths: string[] = [];

    if (await fileExists(userDataDir)) {
      paths.push(userDataDir);
    }
    const globalDb = cursorGlobalStateDb(userDataDir);
    if (await fileExists(globalDb)) {
      paths.push(globalDb);
    }

    return {
      tool: "cursor",
      found: paths.length > 0,
      paths,
    };
  }

  async listProjects(): Promise<ProjectRef[]> {
    const storageDir = cursorWorkspaceStorageDir(this.userDataDir());
    if (!(await fileExists(storageDir))) {
      return [];
    }

    const projects: ProjectRef[] = [];
    const entries = await fs.readdir(storageDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const workspaceJson = path.join(storageDir, entry.name, "workspace.json");
      if (!(await fileExists(workspaceJson))) {
        continue;
      }
      try {
        const raw = await readText(workspaceJson);
        const data = JSON.parse(raw) as { folder?: string };
        if (!data.folder) {
          continue;
        }
        const folderPath = normalizeFolderUri(data.folder);
        if (!folderPath) {
          continue;
        }
        projects.push({
          id: entry.name,
          path: folderPath,
          name: path.basename(folderPath),
          tools: ["cursor"],
        });
      } catch {
        continue;
      }
    }

    return projects.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listSources(ctx: AdapterContext): Promise<MemorySource[]> {
    const projectPath = path.resolve(ctx.projectPath);
    const sources: MemorySource[] = [];

    const rulesDir = projectRulesDir(projectPath);
    if (await fileExists(rulesDir)) {
      const entries = await fs.readdir(rulesDir, { withFileTypes: true });
      const mdcFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".mdc"));
      if (mdcFiles.length > 0) {
        sources.push({
          id: "cursor-rules",
          tool: "cursor",
          kind: "cursor-rules",
          label: "Project rules",
          path: rulesDir,
          recordCount: mdcFiles.length,
        });
      }
    }

    const learnedPath = projectLearnedMemoriesPath(projectPath);
    if (await fileExists(learnedPath)) {
      sources.push({
        id: "cursor-learned",
        tool: "cursor",
        kind: "cursor-learned",
        label: "Learned memories",
        path: learnedPath,
        recordCount: 1,
      });
    }

    const userDataDir = this.userDataDir();
    const globalDb = cursorGlobalStateDb(userDataDir);
    const globalEntries = readCursorSqlite(globalDb);
    if (globalEntries.length > 0) {
      sources.push({
        id: "cursor-sqlite-global",
        tool: "cursor",
        kind: "cursor-sqlite-kv",
        label: "Global SQLite KV",
        path: globalDb,
        recordCount: globalEntries.length,
      });
    }

    const workspaceHash = await findWorkspaceHashForProject(userDataDir, projectPath);
    if (workspaceHash) {
      const workspaceDb = cursorWorkspaceStateDb(userDataDir, workspaceHash);
      const workspaceEntries = readCursorSqlite(workspaceDb);
      if (workspaceEntries.length > 0) {
        sources.push({
          id: `cursor-sqlite-workspace-${workspaceHash}`,
          tool: "cursor",
          kind: "cursor-sqlite-kv",
          label: "Workspace SQLite KV",
          path: workspaceDb,
          recordCount: workspaceEntries.length,
        });
      }
    }

    return sources;
  }

  async listRecords(ctx: AdapterContext): Promise<MemoryRecord[]> {
    const projectPath = path.resolve(ctx.projectPath);
    const records: MemoryRecord[] = [];

    const rulesDir = projectRulesDir(projectPath);
    if (await fileExists(rulesDir)) {
      const entries = await fs.readdir(rulesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".mdc")) {
          continue;
        }
        const filePath = path.join(rulesDir, entry.name);
        const content = await readText(filePath);
        records.push(buildMarkdownRecord("cursor-rules", filePath, content, "project"));
      }
    }

    const learnedPath = projectLearnedMemoriesPath(projectPath);
    if (await fileExists(learnedPath)) {
      const content = await readText(learnedPath);
      records.push(buildMarkdownRecord("cursor-learned", learnedPath, content, "project"));
    }

    const userDataDir = this.userDataDir();
    const globalDb = cursorGlobalStateDb(userDataDir);
    for (const entry of readCursorSqlite(globalDb)) {
      records.push(buildSqliteRecord(globalDb, entry.key, entry.value, "global"));
    }

    const workspaceHash = await findWorkspaceHashForProject(userDataDir, projectPath);
    if (workspaceHash) {
      const workspaceDb = cursorWorkspaceStateDb(userDataDir, workspaceHash);
      for (const entry of readCursorSqlite(workspaceDb)) {
        records.push(buildSqliteRecord(workspaceDb, entry.key, entry.value, "project"));
      }
    }

    return records;
  }

  async readRecord(ctx: AdapterContext, id: string): Promise<MemoryRecord> {
    const { kind, key } = parseRecordId(id);

    if (kind === "cursor-sqlite-kv") {
      const sep = key.indexOf(RECORD_SEP);
      if (sep === -1) {
        throw new Error(`Invalid sqlite record id: ${id}`);
      }
      const dbPath = key.slice(0, sep);
      const sqliteKey = key.slice(sep + RECORD_SEP.length);
      const entries = readCursorSqlite(dbPath);
      const match = entries.find((e) => e.key === sqliteKey);
      if (!match) {
        throw new Error(`SQLite key not found: ${sqliteKey}`);
      }
      const scope = dbPath.includes("globalStorage") ? "global" : "project";
      return buildSqliteRecord(dbPath, match.key, match.value, scope);
    }

    const content = await readText(key);
    const scope: MemoryRecord["metadata"]["scope"] = "project";
    return buildMarkdownRecord(kind, key, content, scope);
  }

  async search(ctx: AdapterContext, query: string): Promise<SearchHit[]> {
    const needle = query.toLowerCase();
    const records = await this.listRecords(ctx);

    return records
      .filter(
        (r) =>
          r.content.toLowerCase().includes(needle) ||
          r.title.toLowerCase().includes(needle),
      )
      .map((r) => {
        const idx = r.content.toLowerCase().indexOf(needle);
        const start = Math.max(0, idx - 40);
        const end = Math.min(r.content.length, idx + needle.length + 40);
        const snippet = idx >= 0 ? r.content.slice(start, end) : r.content.slice(0, 80);
        return {
          recordId: r.id,
          title: r.title,
          snippet,
          source: r.source,
        };
      });
  }
}

export function createCursorAdapter(
  homedir?: string,
  dataDirOverride?: string | null,
): CursorAdapter {
  return new CursorAdapter(homedir, dataDirOverride);
}

/** Discover Cursor workspaces from `workspaceStorage` (used by discovery service). */
export async function discoverCursorWorkspaces(
  homedir: string,
  dataDirOverride?: string | null,
): Promise<ProjectRef[]> {
  return createCursorAdapter(homedir, dataDirOverride).listProjects();
}
