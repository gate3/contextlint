export type ToolId = "cursor" | "claude-code";

export type MemorySourceKind =
  | "cursor-rules"
  | "cursor-learned"
  | "cursor-sqlite-kv"
  | "claude-md"
  | "claude-md-local"
  | "claude-md-parent"
  | "claude-user"
  | "claude-auto-memory"
  | "claude-auto-memory-topic"
  | "claude-mcp-config";

export type MemoryRecordKind = "markdown" | "json" | "sqlite-kv";

export type MemoryScope = "global" | "project" | "user";

export interface MemorySource {
  id: string;
  tool: ToolId;
  kind: MemorySourceKind;
  label: string;
  path: string;
  recordCount?: number;
}

export interface MemoryRecord {
  id: string;
  source: MemorySourceKind;
  path: string;
  kind: MemoryRecordKind;
  title: string;
  content: string;
  metadata: {
    scope: MemoryScope;
    tool: ToolId;
    writable: boolean;
    alwaysApply?: boolean;
    globs?: string[];
  };
}

export interface ProjectRef {
  id: string;
  path: string;
  name: string;
  tools: ToolId[];
}

export interface SearchHit {
  recordId: string;
  title: string;
  snippet: string;
  source: MemorySourceKind;
}

export interface AdapterDetection {
  tool: ToolId;
  found: boolean;
  paths: string[];
  versionHint?: string;
}

export interface AdapterContext {
  projectPath: string;
  homedir?: string;
}

export interface WriteResult {
  backupPath?: string;
  undoId?: string;
}

export interface ToolAdapter {
  readonly id: ToolId;
  detect(): Promise<AdapterDetection>;
  listProjects(): Promise<ProjectRef[]>;
  listSources(ctx: AdapterContext): Promise<MemorySource[]>;
  readRecord(ctx: AdapterContext, recordId: string): Promise<MemoryRecord>;
  search(ctx: AdapterContext, query: string): Promise<SearchHit[]>;
  writeRecord?(
    ctx: AdapterContext,
    recordId: string,
    content: string,
  ): Promise<WriteResult>;
}
