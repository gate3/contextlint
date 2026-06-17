import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Normalize for stable comparisons (resolve, NFC, trim trailing slashes). */
export function normalizePath(p: string): string {
  return path.resolve(p).normalize("NFC").replace(/\/+$/, "") || path.sep;
}

function tryRealpath(p: string): string {
  try {
    return normalizePath(fs.realpathSync.native(p));
  } catch {
    return normalizePath(p);
  }
}

/** Strip trailing punctuation often captured from prose around absolute paths. */
export function sanitizeExtractedPath(p: string): string {
  return p.replace(/[.,;:!?)'"\]]+$/g, "");
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

/** True when a referenced path belongs to the scanned project (incl. realpath + parent monorepo). */
export function isMentionedPathInProject(projectPath: string, mentioned: string): boolean {
  const cleaned = sanitizeExtractedPath(mentioned);
  const projectVariants = [normalizePath(projectPath), tryRealpath(projectPath)];
  const mentionVariants = [normalizePath(cleaned), tryRealpath(cleaned)];

  for (const project of projectVariants) {
    for (const mention of mentionVariants) {
      if (isProjectPathReference(project, mention)) {
        return true;
      }
    }
  }
  return false;
}

const ABS_PATH_RE = /(?:^|[\s"'`(])(\/(?:Users|home|tmp|var|opt|private)[^\s"'`,)]{2,})/gim;
const FILE_URI_RE = /file:\/\/[^\s"'`,)]+/gi;
const WIN_PATH_RE = /(?:^|[\s"'`(])([A-Za-z]:\\[^\s"'`,)]+)/g;

/** Extract filesystem paths referenced in free-form memory text. */
export function extractReferencedPaths(content: string): string[] {
  const paths: string[] = [];

  for (const match of content.matchAll(ABS_PATH_RE)) {
    if (match[1]) {
      paths.push(sanitizeExtractedPath(match[1]));
    }
  }

  for (const match of content.matchAll(FILE_URI_RE)) {
    try {
      paths.push(sanitizeExtractedPath(fileURLToPath(match[0])));
    } catch {
      // ignore invalid file URIs
    }
  }

  for (const match of content.matchAll(WIN_PATH_RE)) {
    if (match[1]) {
      paths.push(sanitizeExtractedPath(match[1]));
    }
  }

  return paths;
}
