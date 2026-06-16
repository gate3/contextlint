import { withFindingId } from "../finding-id.js";
import type { ScanContext, ScanRule } from "../types.js";

export const overBroadRule: ScanRule = {
  id: "over-broad",
  name: "Over-broad rule",
  run(ctx: ScanContext) {
    const findings = [];

    for (const record of ctx.records) {
      if (record.source !== "cursor-rules") {
        continue;
      }
      const { alwaysApply, globs } = record.metadata;
      if (!alwaysApply) {
        continue;
      }
      if (globs && globs.length > 0) {
        continue;
      }

      findings.push(
        withFindingId({
          ruleId: "over-broad",
          severity: "warning",
          title: `Rule applies everywhere: ${record.title}`,
          detail:
            "This Cursor rule has alwaysApply enabled with no path globs. It loads on every file and increases context cost.",
          recordIds: [record.id],
          fix: {
            type: "edit",
            hint: "Add globs to scope the rule, or turn off alwaysApply.",
          },
        }),
      );
    }

    return findings;
  },
};
