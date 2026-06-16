import type { MemoryRecord, MemorySourceKind } from "@meminspect/core";

const SOURCE_LABELS: Record<MemorySourceKind, string> = {
  "cursor-rules": "Project rule",
  "cursor-learned": "Learned memory",
  "cursor-sqlite-kv": "Cursor DB entry",
  "claude-md": "CLAUDE.md",
  "claude-md-local": "CLAUDE.local.md",
  "claude-md-parent": "Parent CLAUDE.md",
  "claude-user": "User CLAUDE.md",
  "claude-auto-memory": "Auto memory",
  "claude-auto-memory-topic": "Auto memory topic",
  "claude-mcp-config": "MCP config",
};

const SOURCE_DESCRIPTIONS: Partial<Record<MemorySourceKind, string>> = {
  "cursor-sqlite-kv":
    "Read-only key from Cursor's state.vscdb (ItemTable / cursorDiskKV). Internal app state — rules, composer, and memory-related keys. Not full chat history.",
  "cursor-rules": "Markdown rule file from .cursor/rules/",
  "cursor-learned": "Agent-learned memory from .cursor/learned_memories.mdc",
};

export function isRecordEmpty(record: MemoryRecord): boolean {
  return record.content.trim().length === 0;
}

export function sourceLabel(kind: MemorySourceKind, record?: MemoryRecord): string {
  if (kind === "cursor-sqlite-kv" && record) {
    return record.metadata.scope === "global" ? "Cursor global DB" : "Cursor workspace DB";
  }
  return SOURCE_LABELS[kind];
}

export function sourceDescription(kind: MemorySourceKind): string | undefined {
  return SOURCE_DESCRIPTIONS[kind];
}

/** Prefer filename for files; keep SQLite keys readable. */
export function recordDisplayTitle(record: MemoryRecord): string {
  if (record.kind === "sqlite-kv") {
    return record.title;
  }
  return record.title;
}

export function sortRecordsForDisplay<T extends MemoryRecord>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const emptyA = isRecordEmpty(a);
    const emptyB = isRecordEmpty(b);
    if (emptyA !== emptyB) {
      return emptyA ? 1 : -1;
    }
    return recordDisplayTitle(a).localeCompare(recordDisplayTitle(b));
  });
}

export type ProjectSort = "name-asc" | "name-desc" | "path-asc" | "path-desc" | "tools-desc";

export function sortProjects<T extends { name: string; path: string; tools: readonly string[] }>(
  projects: T[],
  sort: ProjectSort,
): T[] {
  const copy = [...projects];
  copy.sort((a, b) => {
    switch (sort) {
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "path-asc":
        return a.path.localeCompare(b.path);
      case "path-desc":
        return b.path.localeCompare(a.path);
      case "tools-desc":
        return b.tools.length - a.tools.length || a.name.localeCompare(b.name);
      case "name-asc":
      default:
        return a.name.localeCompare(b.name);
    }
  });
  return copy;
}

export function filterProjects<T extends { name: string; path: string }>(
  projects: T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return projects;
  }
  return projects.filter(
    (p) => p.name.toLowerCase().includes(needle) || p.path.toLowerCase().includes(needle),
  );
}
