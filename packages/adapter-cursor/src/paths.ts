import path from "node:path";

/** Cursor User data directory (workspaceStorage, globalStorage). */
export function cursorUserDataDir(homedir: string, override?: string | null): string {
  if (override) {
    return path.resolve(override);
  }
  if (process.platform === "darwin") {
    return path.join(homedir, "Library", "Application Support", "Cursor", "User");
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA ?? homedir, "Cursor", "User");
  }
  return path.join(homedir, ".config", "Cursor", "User");
}

export function cursorWorkspaceStorageDir(userDataDir: string): string {
  return path.join(userDataDir, "workspaceStorage");
}

export function cursorGlobalStateDb(userDataDir: string): string {
  return path.join(userDataDir, "globalStorage", "state.vscdb");
}

export function cursorWorkspaceStateDb(userDataDir: string, workspaceHash: string): string {
  return path.join(userDataDir, "workspaceStorage", workspaceHash, "state.vscdb");
}

export function projectRulesDir(projectPath: string): string {
  return path.join(path.resolve(projectPath), ".cursor", "rules");
}

export function projectLearnedMemoriesPath(projectPath: string): string {
  return path.join(path.resolve(projectPath), ".cursor", "learned_memories.mdc");
}
