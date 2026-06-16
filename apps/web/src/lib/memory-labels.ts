import type { MemoryRecord, MemorySourceKind, ToolId } from "@meminspect/core";

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

export type ProjectSort = "name-asc" | "name-desc" | "tools-desc";

export function sortProjects<T extends { name: string; path: string; tools: readonly string[] }>(
  projects: T[],
  sort: ProjectSort,
): T[] {
  const copy = [...projects];
  copy.sort((a, b) => {
    switch (sort) {
      case "name-desc":
        return b.name.localeCompare(a.name);
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

export type RecordPlatformFilter = ToolId;

export type RecordTypeFilter =
  | "rule"
  | "learned"
  | "instructions"
  | "auto-memory"
  | "db-entry"
  | "config";

export type RecordAccessFilter = "read-only" | "writable";

export interface RecordFiltersState {
  platforms: RecordPlatformFilter[];
  types: RecordTypeFilter[];
  access: RecordAccessFilter[];
}

export const EMPTY_RECORD_FILTERS: RecordFiltersState = {
  platforms: [],
  types: [],
  access: [],
};

export function recordTypeCategory(source: MemorySourceKind): RecordTypeFilter {
  switch (source) {
    case "cursor-rules":
      return "rule";
    case "cursor-learned":
      return "learned";
    case "claude-md":
    case "claude-md-local":
    case "claude-md-parent":
    case "claude-user":
      return "instructions";
    case "claude-auto-memory":
    case "claude-auto-memory-topic":
      return "auto-memory";
    case "cursor-sqlite-kv":
      return "db-entry";
    case "claude-mcp-config":
      return "config";
  }
}

export const RECORD_TYPE_LABELS: Record<RecordTypeFilter, string> = {
  rule: "Rules",
  learned: "Learned memory",
  instructions: "Instructions",
  "auto-memory": "Auto memory",
  "db-entry": "DB entries",
  config: "Config",
};

export const RECORD_ACCESS_LABELS: Record<RecordAccessFilter, string> = {
  "read-only": "Read-only",
  writable: "Writable",
};

export function recordAccess(record: MemoryRecord): RecordAccessFilter {
  return record.metadata.writable ? "writable" : "read-only";
}

export function matchesRecordFilters(
  record: MemoryRecord & { tool: ToolId },
  filters: RecordFiltersState,
): boolean {
  if (filters.platforms.length > 0 && !filters.platforms.includes(record.tool)) {
    return false;
  }
  const type = recordTypeCategory(record.source);
  if (filters.types.length > 0 && !filters.types.includes(type)) {
    return false;
  }
  const access = recordAccess(record);
  if (filters.access.length > 0 && !filters.access.includes(access)) {
    return false;
  }
  return true;
}

export function filterRecords<T extends MemoryRecord & { tool: ToolId }>(
  records: T[],
  filters: RecordFiltersState,
): T[] {
  if (
    filters.platforms.length === 0 &&
    filters.types.length === 0 &&
    filters.access.length === 0
  ) {
    return records;
  }
  return records.filter((r) => matchesRecordFilters(r, filters));
}

export function isRecordFiltersActive(filters: RecordFiltersState): boolean {
  return (
    filters.platforms.length > 0 || filters.types.length > 0 || filters.access.length > 0
  );
}

export function toggleFilterValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
