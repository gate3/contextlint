import type { ToolId } from "../types.js";

export class WriteGuardError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "WriteGuardError";
  }
}

export interface UndoState {
  undoId: string;
  recordId: string;
  recordPath: string;
  projectPath: string;
  tool: ToolId;
  backupPath: string;
  previousContent: string;
  writtenAt: string;
}

export interface UndoStatus {
  available: boolean;
  undoId?: string;
  recordId?: string;
  recordPath?: string;
  projectPath?: string;
  tool?: ToolId;
  backupPath?: string;
  writtenAt?: string;
}

export interface GuardedWriteOptions {
  homedir: string;
  projectPath: string;
  recordId: string;
  tool: ToolId;
  targetPath: string;
  kind: "markdown" | "json" | "sqlite-kv";
  writable: boolean;
  content: string;
  sqliteWritesEnabled?: boolean;
  backupDir?: string;
}

export interface GuardedWriteResult {
  backupPath: string;
  undoId: string;
}
