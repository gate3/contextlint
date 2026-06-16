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
} from "@contextlint/core";
import {
  claudeAutoMemoryDir,
  claudeUserConfigPath,
  claudeUserMemoryPath,
  encodeProjectSlug,
} from "./paths.js";

const RECORD_SEP = "::";

function recordId(kind: MemorySourceKind, filePath: string): string {
  return `${kind}${RECORD_SEP}${filePath}`;
}

function parseRecordId(recordId: string): { kind: MemorySourceKind; filePath: string } {
  const idx = recordId.indexOf(RECORD_SEP);
  if (idx === -1) {
    throw new Error(`Invalid record id: ${recordId}`);
  }
  return {
    kind: recordId.slice(0, idx) as MemorySourceKind,
    filePath: recordId.slice(idx + RECORD_SEP.length),
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

async function findGitRoot(startPath: string): Promise<string | null> {
  let current = path.resolve(startPath);
  const root = path.parse(current).root;

  while (true) {
    if (await fileExists(path.join(current, ".git"))) {
      return current;
    }
    if (current === root) {
      return null;
    }
    current = path.dirname(current);
  }
}

async function collectParentClaudeFiles(projectPath: string): Promise<string[]> {
  const gitRoot = await findGitRoot(projectPath);
  const stopAt = gitRoot ?? path.parse(projectPath).root;
  const files: string[] = [];
  let current = path.resolve(projectPath);

  while (current.startsWith(stopAt) && current !== stopAt) {
    const candidate = path.join(current, "CLAUDE.md");
    if (await fileExists(candidate)) {
      files.push(candidate);
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  if (gitRoot) {
    const rootClaude = path.join(gitRoot, "CLAUDE.md");
    if (await fileExists(rootClaude) && !files.includes(rootClaude)) {
      files.push(rootClaude);
    }
  }

  return files.reverse();
}

function titleFromPath(filePath: string): string {
  return path.basename(filePath);
}

function buildRecord(
  kind: MemorySourceKind,
  filePath: string,
  content: string,
  scope: MemoryRecord["metadata"]["scope"],
  writable: boolean,
): MemoryRecord {
  return {
    id: recordId(kind, filePath),
    source: kind,
    path: filePath,
    kind: filePath.endsWith(".json") ? "json" : "markdown",
    title: titleFromPath(filePath),
    content,
    metadata: {
      scope,
      tool: "claude-code",
      writable,
    },
  };
}

export class ClaudeCodeAdapter implements ToolAdapter {
  readonly id = "claude-code" as const;

  constructor(private readonly homedir: string = os.homedir()) {}

  async detect(): Promise<AdapterDetection> {
    const paths: string[] = [];
    const claudeDir = path.join(this.homedir, ".claude");

    if (await fileExists(claudeDir)) {
      paths.push(claudeDir);
    }
    if (await fileExists(claudeUserConfigPath(this.homedir))) {
      paths.push(claudeUserConfigPath(this.homedir));
    }

    return {
      tool: "claude-code",
      found: paths.length > 0,
      paths,
    };
  }

  async listProjects(): Promise<ProjectRef[]> {
    return [];
  }

  async listSources(ctx: AdapterContext): Promise<MemorySource[]> {
    const projectPath = path.resolve(ctx.projectPath);
    const sources: MemorySource[] = [];

    const projectClaude = path.join(projectPath, "CLAUDE.md");
    if (await fileExists(projectClaude)) {
      sources.push({
        id: "claude-md",
        tool: "claude-code",
        kind: "claude-md",
        label: "Project CLAUDE.md",
        path: projectClaude,
        recordCount: 1,
      });
    }

    const localClaude = path.join(projectPath, "CLAUDE.local.md");
    if (await fileExists(localClaude)) {
      sources.push({
        id: "claude-md-local",
        tool: "claude-code",
        kind: "claude-md-local",
        label: "Project CLAUDE.local.md",
        path: localClaude,
        recordCount: 1,
      });
    }

    const parentFiles = await collectParentClaudeFiles(projectPath);
    for (const filePath of parentFiles) {
      if (filePath === projectClaude) {
        continue;
      }
      sources.push({
        id: `claude-md-parent-${encodeProjectSlug(filePath)}`,
        tool: "claude-code",
        kind: "claude-md-parent",
        label: `Parent CLAUDE.md (${path.dirname(filePath)})`,
        path: filePath,
        recordCount: 1,
      });
    }

    const userClaude = claudeUserMemoryPath(this.homedir);
    if (await fileExists(userClaude)) {
      sources.push({
        id: "claude-user",
        tool: "claude-code",
        kind: "claude-user",
        label: "User CLAUDE.md",
        path: userClaude,
        recordCount: 1,
      });
    }

    const memoryDir = claudeAutoMemoryDir(this.homedir, projectPath);
    if (await fileExists(memoryDir)) {
      const entries = await fs.readdir(memoryDir, { withFileTypes: true });
      const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"));
      if (mdFiles.length > 0) {
        sources.push({
          id: "claude-auto-memory",
          tool: "claude-code",
          kind: "claude-auto-memory",
          label: "Auto memory",
          path: memoryDir,
          recordCount: mdFiles.length,
        });
      }
    }

    const projectMcp = path.join(projectPath, ".mcp.json");
    if (await fileExists(projectMcp)) {
      sources.push({
        id: "claude-mcp-project",
        tool: "claude-code",
        kind: "claude-mcp-config",
        label: "Project MCP config",
        path: projectMcp,
        recordCount: 1,
      });
    }

    const userMcp = claudeUserConfigPath(this.homedir);
    if (await fileExists(userMcp)) {
      sources.push({
        id: "claude-mcp-user",
        tool: "claude-code",
        kind: "claude-mcp-config",
        label: "User MCP config",
        path: userMcp,
        recordCount: 1,
      });
    }

    return sources;
  }

  async listRecords(ctx: AdapterContext): Promise<MemoryRecord[]> {
    const sources = await this.listSources(ctx);
    const records: MemoryRecord[] = [];

    for (const source of sources) {
      if (source.kind === "claude-auto-memory") {
        const entries = await fs.readdir(source.path, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith(".md")) {
            continue;
          }
          const filePath = path.join(source.path, entry.name);
          const content = await readText(filePath);
          const kind: MemorySourceKind =
            entry.name === "MEMORY.md" ? "claude-auto-memory" : "claude-auto-memory-topic";
          records.push(
            buildRecord(kind, filePath, content, "project", true),
          );
        }
        continue;
      }

      const content = await readText(source.path);
      const scope: MemoryRecord["metadata"]["scope"] =
        source.kind === "claude-user" || source.path.includes(".claude.json")
          ? "user"
          : "project";
      records.push(buildRecord(source.kind, source.path, content, scope, true));
    }

    return records;
  }

  async readRecord(ctx: AdapterContext, id: string): Promise<MemoryRecord> {
    const { kind, filePath } = parseRecordId(id);
    const content = await readText(filePath);
    const scope: MemoryRecord["metadata"]["scope"] =
      kind === "claude-user" || filePath.endsWith(".claude.json") ? "user" : "project";
    return buildRecord(kind, filePath, content, scope, true);
  }

  async search(ctx: AdapterContext, query: string): Promise<SearchHit[]> {
    const needle = query.toLowerCase();
    const records = await this.listRecords(ctx);

    return records
      .filter((r) => r.content.toLowerCase().includes(needle) || r.title.toLowerCase().includes(needle))
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

export function createClaudeCodeAdapter(homedir?: string): ClaudeCodeAdapter {
  return new ClaudeCodeAdapter(homedir);
}
