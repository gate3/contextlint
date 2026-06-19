import path from "node:path";

export function meminspectBackupsDir(homedir: string, backupDirOverride?: string): string {
  if (backupDirOverride) {
    return path.resolve(backupDirOverride);
  }
  return path.join(homedir, ".meminspect", "backups");
}

export function undoStatePath(homedir: string): string {
  return path.join(homedir, ".meminspect", "undo.json");
}

/** Flatten an absolute path into a backup-safe relative artifact name. */
export function backupArtifactName(targetPath: string): string {
  return targetPath
    .replace(/^([a-zA-Z]):/, "$1")
    .replace(/^[\\/]/, "")
    .replace(/[\\/]/g, "--");
}

export function backupArtifactPath(
  homedir: string,
  timestamp: string,
  targetPath: string,
  backupDirOverride?: string,
): string {
  return path.join(
    meminspectBackupsDir(homedir, backupDirOverride),
    timestamp,
    backupArtifactName(targetPath),
  );
}
