import path from "node:path";

/** Normalize for stable comparisons (resolve + trim trailing slashes). */
export function normalizePath(p: string): string {
  return path.resolve(p).replace(/\/+$/, "") || path.sep;
}

/** True when `mentioned` is the project, inside it, or a parent directory of it. */
export function isProjectPathReference(projectPath: string, mentioned: string): boolean {
  const project = normalizePath(projectPath);
  const mention = normalizePath(mentioned);

  if (mention === project) {
    return true;
  }
  if (mention.startsWith(project + path.sep)) {
    return true;
  }
  if (project.startsWith(mention + path.sep)) {
    return true;
  }
  return false;
}
