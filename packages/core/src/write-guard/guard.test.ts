import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  atomicWriteFile,
  getUndoStatus,
  guardedWrite,
  performUndo,
  WriteGuardError,
} from "./guard.js";

const tempRoots: string[] = [];

function makeTempHome(): string {
  const dir = path.join(os.tmpdir(), `meminspect-wg-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  tempRoots.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("WriteGuard", () => {
  it("creates backup and supports single-step undo", async () => {
    const homedir = makeTempHome();
    const targetPath = path.join(homedir, "project", ".cursor", "rules", "a.mdc");
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, "original", "utf8");

    const result = await guardedWrite({
      homedir,
      projectPath: path.join(homedir, "project"),
      recordId: "cursor-rules::a.mdc",
      tool: "cursor",
      targetPath,
      kind: "markdown",
      writable: true,
      content: "updated",
    });

    expect(result.backupPath).toContain(".meminspect/backups");
    await expect(fs.readFile(targetPath, "utf8")).resolves.toBe("updated");
    await expect(getUndoStatus(homedir)).resolves.toMatchObject({
      available: true,
      recordId: "cursor-rules::a.mdc",
    });

    await performUndo(homedir);
    await expect(fs.readFile(targetPath, "utf8")).resolves.toBe("original");
    await expect(getUndoStatus(homedir)).resolves.toEqual({ available: false });
  });

  it("refuses read-only records", async () => {
    const homedir = makeTempHome();
    await expect(
      guardedWrite({
        homedir,
        projectPath: "/tmp/project",
        recordId: "cursor-sqlite-kv::x",
        tool: "cursor",
        targetPath: "/tmp/project/state.vscdb",
        kind: "sqlite-kv",
        writable: false,
        content: "nope",
      }),
    ).rejects.toMatchObject({ code: "READ_ONLY" });
  });

  it("refuses sqlite-kv writes (file guard cannot update KV rows)", async () => {
    const homedir = makeTempHome();
    await expect(
      guardedWrite({
        homedir,
        projectPath: "/tmp/project",
        recordId: "cursor-sqlite-kv::x",
        tool: "cursor",
        targetPath: "/tmp/project/state.vscdb",
        kind: "sqlite-kv",
        writable: true,
        content: "nope",
      }),
    ).rejects.toMatchObject({ code: "SQLITE_WRITE_UNSUPPORTED" });
  });

  it("writes atomically via temp file", async () => {
    const homedir = makeTempHome();
    const targetPath = path.join(homedir, "CLAUDE.md");
    await atomicWriteFile(targetPath, "hello");
    await expect(fs.readFile(targetPath, "utf8")).resolves.toBe("hello");
  });

  it("throws when undo is unavailable", async () => {
    const homedir = makeTempHome();
    await expect(performUndo(homedir)).rejects.toBeInstanceOf(WriteGuardError);
  });

  it("deletes the file on undo when the write created it", async () => {
    const homedir = makeTempHome();
    const targetPath = path.join(homedir, "project", "CLAUDE.md");
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    await guardedWrite({
      homedir,
      projectPath: path.join(homedir, "project"),
      recordId: "claude-md::CLAUDE.md",
      tool: "claude-code",
      targetPath,
      kind: "markdown",
      writable: true,
      content: "new file",
    });

    await expect(fs.readFile(targetPath, "utf8")).resolves.toBe("new file");
    await performUndo(homedir);
    await expect(fs.readFile(targetPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("throws when backup is missing for an existing file undo", async () => {
    const homedir = makeTempHome();
    const targetPath = path.join(homedir, "project", "a.mdc");
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, "original", "utf8");

    await guardedWrite({
      homedir,
      projectPath: path.join(homedir, "project"),
      recordId: "cursor-rules::a.mdc",
      tool: "cursor",
      targetPath,
      kind: "markdown",
      writable: true,
      content: "updated",
    });

    const status = await getUndoStatus(homedir);
    await fs.unlink(status.backupPath!);
    await expect(performUndo(homedir)).rejects.toMatchObject({ code: "UNDO_UNAVAILABLE" });
  });
});
