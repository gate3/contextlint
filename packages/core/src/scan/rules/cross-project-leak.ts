import { withFindingId } from "../finding-id.js";
import {
  extractReferencedPaths,
  isGenericSystemPath,
  isMentionedPathInProject,
} from "../path-utils.js";
import type { ScanContext, ScanRule } from "../types.js";

export const crossProjectLeakRule: ScanRule = {
  id: "cross-project-leak",
  name: "Cross-project leakage",
  run(ctx: ScanContext) {
    const findings = [];

    for (const record of ctx.records) {
      if (record.source === "cursor-sqlite-kv" || !record.content.trim()) {
        continue;
      }

      const leaks: string[] = [];

      for (const absPath of extractReferencedPaths(record.content)) {
        if (isMentionedPathInProject(ctx.projectPath, absPath)) {
          continue;
        }
        if (isGenericSystemPath(absPath)) {
          continue;
        }
        leaks.push(absPath);
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
