import { createHash } from "node:crypto";
import path from "node:path";

const MAX_BACKUP_NAME_LEN = 200;

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
  const flattened = targetPath
    .replace(/^([a-zA-Z]):/, "$1")
    .replace(/^[\\/]/, "")
    .replace(/[\\/]/g, "--");

  if (flattened.length <= MAX_BACKUP_NAME_LEN) {
    return flattened;
  }

  const hash = createHash("sha256").update(targetPath).digest("hex").slice(0, 12);
  const ext = path.extname(targetPath);
  const prefixLen = MAX_BACKUP_NAME_LEN - hash.length - ext.length - 2;
  return `${flattened.slice(0, Math.max(prefixLen, 1))}--${hash}${ext}`;
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
