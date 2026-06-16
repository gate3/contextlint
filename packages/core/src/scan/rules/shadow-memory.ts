import { withFindingId } from "../finding-id.js";
import type { ScanContext, ScanRule } from "../types.js";

const MIN_SHADOW_CHARS = 80;

export const shadowMemoryRule: ScanRule = {
  id: "shadow-memory",
  name: "Shadow memory",
  run(ctx: ScanContext) {
    const findings = [];

    for (const record of ctx.records) {
      if (record.source !== "cursor-learned") {
        continue;
      }
      if (record.content.trim().length < MIN_SHADOW_CHARS) {
        continue;
      }

      findings.push(
        withFindingId({
          ruleId: "shadow-memory",
          severity: "info",
          title: `Learned memory on disk: ${record.title}`,
          detail:
            "Cursor learned memories live in .cursor/learned_memories.mdc. They may load in agent context — verify this content is still intentional.",
          recordIds: [record.id],
          fix: {
            type: "edit",
            hint: "Review or trim learned memories that are outdated.",
          },
        }),
      );
    }

    return findings;
  },
};
