import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isCursorProcessRunning } from "./cursor-process.js";
import { backupArtifactPath } from "./paths.js";
import { clearUndoState, loadUndoState, saveUndoState, toUndoStatus } from "./undo.js";
import type { GuardedWriteOptions, GuardedWriteResult, UndoStatus } from "./types.js";
import { WriteGuardError } from "./types.js";

export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.meminspect.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tempPath, content, "utf8");
  await fs.rename(tempPath, filePath);
}

async function readExistingContent(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return "";
    }
    throw err;
  }
}

function assertWritable(options: GuardedWriteOptions): void {
  if (!options.writable) {
    throw new WriteGuardError("This record is read-only", "READ_ONLY");
  }

  if (options.kind === "sqlite-kv") {
    if (!options.sqliteWritesEnabled) {
      throw new WriteGuardError(
        "Cursor SQLite writes are disabled. Enable safety.sqliteWrites in ~/.meminspect/config.json to opt in.",
        "SQLITE_WRITE_DISABLED",
      );
    }
  }
}

async function assertSafeToWrite(options: GuardedWriteOptions): Promise<void> {
  assertWritable(options);

  if (options.kind === "sqlite-kv" && (await isCursorProcessRunning())) {
    throw new WriteGuardError(
      "Cursor is running. Close Cursor before writing to SQLite memory stores.",
      "CURSOR_RUNNING",
    );
  }
}

async function createBackup(
  homedir: string,
  targetPath: string,
  previousContent: string,
  backupDirOverride?: string,
): Promise<{ backupPath: string; timestamp: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = backupArtifactPath(homedir, timestamp, targetPath, backupDirOverride);
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.writeFile(backupPath, previousContent, "utf8");
  return { backupPath, timestamp };
}

export async function guardedWrite(options: GuardedWriteOptions): Promise<GuardedWriteResult> {
  await assertSafeToWrite(options);

  const targetPath = path.resolve(options.targetPath);
  const previousContent = await readExistingContent(targetPath);
  const { backupPath } = await createBackup(
    options.homedir,
    targetPath,
    previousContent,
    options.backupDir,
  );

  await atomicWriteFile(targetPath, options.content);

  const undoId = randomUUID();
  await saveUndoState(options.homedir, {
    undoId,
    recordId: options.recordId,
    recordPath: targetPath,
    projectPath: path.resolve(options.projectPath),
    tool: options.tool,
    backupPath,
    previousContent,
    writtenAt: new Date().toISOString(),
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

  await atomicWriteFile(state.recordPath, state.previousContent);
  await clearUndoState(homedir);
  return { available: false };
}

export { WriteGuardError };
