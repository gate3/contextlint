import {
  guardedWrite,
  getUndoStatus,
  loadMeminspectConfig,
  performUndo,
  WriteGuardError,
  type GuardedWriteResult,
  type MemoryRecord,
  type ToolAdapter,
  type ToolId,
  type UndoStatus,
} from "@meminspect/core";
import path from "node:path";
import { toolIdFromRecord } from "../adapters.js";

export interface UpdateRecordResult {
  record: MemoryRecord;
  backupPath: string;
  undoId: string;
}

async function readRecord(
  adapters: ToolAdapter[],
  projectPath: string,
  recordId: string,
  tool?: string,
): Promise<{ adapter: ToolAdapter; record: MemoryRecord }> {
  const toolId = (tool ?? toolIdFromRecord(recordId)) as ToolId;
  const adapter = adapters.find((a) => a.id === toolId);
  if (!adapter) {
    throw new WriteGuardError(`Unknown tool: ${toolId}`, "NOT_FOUND");
  }
  const record = await adapter.readRecord({ projectPath }, recordId);
  return { adapter, record };
}

export async function updateProjectRecord(
  homedir: string,
  adapters: ToolAdapter[],
  projectPath: string,
  recordId: string,
  content: string,
  tool?: string,
): Promise<UpdateRecordResult> {
  const resolvedPath = path.resolve(projectPath);
  const { record } = await readRecord(adapters, resolvedPath, recordId, tool);
  const config = await loadMeminspectConfig(homedir);

  const writeResult = await guardedWrite({
    homedir,
    projectPath: resolvedPath,
    recordId,
    tool: record.metadata.tool,
    targetPath: record.path,
    kind: record.kind,
    writable: record.metadata.writable,
    content,
    sqliteWritesEnabled: config.safety?.sqliteWrites === true,
    backupDir: config.safety?.backupDir,
  });

  const { record: updated } = await readRecord(adapters, resolvedPath, recordId, tool);
  return {
    record: updated,
    backupPath: writeResult.backupPath,
    undoId: writeResult.undoId,
  };
}

export async function undoLastRecordWrite(homedir: string): Promise<UndoStatus> {
  return performUndo(homedir);
}

export async function readUndoStatus(homedir: string): Promise<UndoStatus> {
  return getUndoStatus(homedir);
}

export { WriteGuardError };
export type { GuardedWriteResult, UndoStatus };
