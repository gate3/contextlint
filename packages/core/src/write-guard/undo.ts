import fs from "node:fs/promises";
import path from "node:path";
import { undoStatePath } from "./paths.js";
import type { UndoState, UndoStatus } from "./types.js";

export async function loadUndoState(homedir: string): Promise<UndoState | null> {
  try {
    const raw = await fs.readFile(undoStatePath(homedir), "utf8");
    return JSON.parse(raw) as UndoState;
  } catch {
    return null;
  }
}

export async function saveUndoState(homedir: string, state: UndoState): Promise<void> {
  const filePath = undoStatePath(homedir);
  const tempPath = `${filePath}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, filePath);
}

export async function clearUndoState(homedir: string): Promise<void> {
  try {
    await fs.unlink(undoStatePath(homedir));
  } catch {
    // no undo file
  }
}

export function toUndoStatus(state: UndoState | null): UndoStatus {
  if (!state) {
    return { available: false };
  }
  return {
    available: true,
    undoId: state.undoId,
    recordId: state.recordId,
    recordPath: state.recordPath,
    projectPath: state.projectPath,
    tool: state.tool,
    backupPath: state.backupPath,
    writtenAt: state.writtenAt,
    existed: state.existed,
  };
}
