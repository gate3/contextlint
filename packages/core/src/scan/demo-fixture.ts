import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScannedRecord } from "./types.js";

const RECORD_SEP = "::";

function parseRuleFrontmatter(content: string): {
  alwaysApply?: boolean;
  globs?: string[];
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  const yaml = match[1] ?? "";
  const alwaysApply = /alwaysApply:\s*true/.test(yaml);
  const globsMatch = yaml.match(/globs:\s*["']?([^"'\n]+)["']?/);
  const globs = globsMatch?.[1] ? [globsMatch[1]] : undefined;
  return { alwaysApply, globs };
}

/** Repo-root `fixtures/health-scan-demo` (throws if missing). */
export function resolveHealthScanDemoPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../../../fixtures/health-scan-demo"),
    path.resolve(here, "../../../fixtures/health-scan-demo"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }

  throw new Error("health-scan-demo fixture not found");
}

/** Load markdown memory files from the demo fixture as scan records. */
export function loadHealthScanDemoRecords(demoPath: string): ScannedRecord[] {
  const records: ScannedRecord[] = [];
  const claudePath = path.join(demoPath, "CLAUDE.md");
  if (fs.existsSync(claudePath)) {
    records.push({
      id: `claude-md${RECORD_SEP}CLAUDE.md`,
      source: "claude-md",
      path: claudePath,
      kind: "markdown",
      title: "CLAUDE.md",
      content: fs.readFileSync(claudePath, "utf8"),
      tool: "claude-code",
      metadata: { scope: "project", tool: "claude-code", writable: true },
    });
  }

  const rulesDir = path.join(demoPath, ".cursor", "rules");
  if (fs.existsSync(rulesDir)) {
    for (const name of fs.readdirSync(rulesDir).filter((f) => f.endsWith(".mdc"))) {
      const filePath = path.join(rulesDir, name);
      const content = fs.readFileSync(filePath, "utf8");
      const { alwaysApply, globs } = parseRuleFrontmatter(content);
      records.push({
        id: `cursor-rules${RECORD_SEP}${name}`,
        source: "cursor-rules",
        path: filePath,
        kind: "markdown",
        title: name,
        content,
        tool: "cursor",
        metadata: {
          scope: "project",
          tool: "cursor",
          writable: true,
          alwaysApply,
          globs,
        },
      });
    }
  }

  const learnedPath = path.join(demoPath, ".cursor", "learned_memories.mdc");
  if (fs.existsSync(learnedPath)) {
    records.push({
      id: `cursor-learned${RECORD_SEP}learned_memories.mdc`,
      source: "cursor-learned",
      path: learnedPath,
      kind: "markdown",
      title: "learned_memories.mdc",
      content: fs.readFileSync(learnedPath, "utf8"),
      tool: "cursor",
      metadata: { scope: "project", tool: "cursor", writable: true },
    });
  }

  return records;
}
