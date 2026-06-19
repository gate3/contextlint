import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { backupArtifactPath } from "./paths.js";
import { clearUndoState, loadUndoState, saveUndoState, toUndoStatus } from "./undo.js";
import type { GuardedWriteOptions, GuardedWriteResult, UndoStatus } from "./types.js";
import { WriteGuardError } from "./types.js";

export async function atomicWriteFile(filePath: string, content: string | Buffer): Promise<void> {
  const tempPath = `${filePath}.meminspect.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    if (typeof content === "string") {
      await fs.writeFile(tempPath, content, "utf8");
    } else {
      await fs.writeFile(tempPath, content);
    }
    await fs.rename(tempPath, filePath);
  } catch (err) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup failure to propagate the original error.
    }
    throw err;
  }
}

async function targetFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertWritable(options: GuardedWriteOptions): void {
  if (!options.writable) {
    throw new WriteGuardError("This record is read-only", "READ_ONLY");
  }

  if (options.kind === "sqlite-kv") {
    throw new WriteGuardError(
      "SQLite KV records cannot be edited through file writes. Meminspect supports markdown and JSON memory files only.",
      "SQLITE_WRITE_UNSUPPORTED",
    );
  }
}

async function createBackup(
  homedir: string,
  targetPath: string,
  backupDirOverride?: string,
): Promise<{ backupPath: string; timestamp: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = backupArtifactPath(homedir, timestamp, targetPath, backupDirOverride);
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  if (await targetFileExists(targetPath)) {
    await fs.copyFile(targetPath, backupPath);
  }
  return { backupPath, timestamp };
}

export async function guardedWrite(options: GuardedWriteOptions): Promise<GuardedWriteResult> {
  assertWritable(options);

  const targetPath = path.resolve(options.targetPath);
  const existed = await targetFileExists(targetPath);
  const { backupPath } = await createBackup(options.homedir, targetPath, options.backupDir);

  await atomicWriteFile(targetPath, options.content);

  const undoId = randomUUID();
  await saveUndoState(options.homedir, {
    undoId,
    recordId: options.recordId,
    recordPath: targetPath,
    projectPath: path.resolve(options.projectPath),
    tool: options.tool,
    backupPath,
    writtenAt: new Date().toISOString(),
    existed,
  });

  return { backupPath, undoId };
}

export async function getUndoStatus(homedir: string): Promise<UndoStatus> {
  return toUndoStatus(await loadUndoState(homedir));
}

export async function performUndo(homedir: string): Promise<UndoStatus> {
  const state = await loadUndoState(homedir);
  if (!state) {
    throw new WriteGuardError("No undo operation available", "UNDO_UNAVAILABLE");
  }

  const existed = state.existed !== false;

  if (!existed) {
    try {
      await fs.unlink(state.recordPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw err;
      }
    }
  } else {
    try {
      await fs.copyFile(state.backupPath, state.recordPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        throw new WriteGuardError("Backup file missing or unavailable", "UNDO_UNAVAILABLE");
      }
      throw err;
    }
  }

  await clearUndoState(homedir);
  return { available: false };
}

export { WriteGuardError };
