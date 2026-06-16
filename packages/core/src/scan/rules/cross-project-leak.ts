import { isProjectPathReference } from "../path-utils.js";
import { withFindingId } from "../finding-id.js";
import type { ScanContext, ScanRule } from "../types.js";

const ABS_PATH_RE = /(?:^|[\s"'`(])(\/(?:Users|home|tmp|var|opt)[^\s"'`,)]{2,})/gim;
const OTHER_REPO_RE = /(?:^|[\s"'`(])([A-Za-z]:\\[^\s"'`,)]+)/g;

export const crossProjectLeakRule: ScanRule = {
  id: "cross-project-leak",
  name: "Cross-project leakage",
  run(ctx: ScanContext) {
    const findings = [];

    for (const record of ctx.records) {
      // SQLite KV is Cursor internal state — paths here are not user-authored memory.
      if (record.source === "cursor-sqlite-kv" || !record.content.trim()) {
        continue;
      }

      const leaks: string[] = [];

      for (const match of record.content.matchAll(ABS_PATH_RE)) {
        const absPath = match[1];
        if (!absPath || isProjectPathReference(ctx.projectPath, absPath)) {
          continue;
        }
        leaks.push(absPath);
      }

      for (const match of record.content.matchAll(OTHER_REPO_RE)) {
        const winPath = match[1];
        if (!winPath || isProjectPathReference(ctx.projectPath, winPath)) {
          continue;
        }
        if (!winPath.toLowerCase().includes(ctx.projectName.toLowerCase())) {
          leaks.push(winPath);
        }
      }

      const unique = [...new Set(leaks)].slice(0, 3);
      if (unique.length === 0) {
        continue;
      }

      findings.push(
        withFindingId({
          ruleId: "cross-project-leak",
          severity: "warning",
          title: `External path reference in ${record.title}`,
          detail: `Memory references paths outside this project: ${unique.join(", ")}`,
          recordIds: [record.id],
          fix: {
            type: "edit",
            hint: "Remove or generalize paths that belong to another project.",
          },
        }),
      );
    }

    return findings;
  },
};
