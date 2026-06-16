import path from "node:path";

/**
 * Claude Code encodes project paths as directory names under ~/.claude/projects/.
 * Common form: /Users/dev/app → -Users-dev-app
 */
export function encodeProjectSlug(projectPath: string): string {
  const resolved = path.resolve(projectPath);
  if (resolved === "/") {
    return "-";
  }
  return resolved.replace(/\//g, "-");
}

export function claudeProjectsDir(homedir: string): string {
  return path.join(homedir, ".claude", "projects");
}

export function claudeAutoMemoryDir(homedir: string, projectPath: string): string {
  return path.join(claudeProjectsDir(homedir), encodeProjectSlug(projectPath), "memory");
}

export function claudeUserMemoryPath(homedir: string): string {
  return path.join(homedir, ".claude", "CLAUDE.md");
}

export function claudeUserConfigPath(homedir: string): string {
  return path.join(homedir, ".claude.json");
}
