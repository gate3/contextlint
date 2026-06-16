import { estimateTokens } from "../tokens.js";
import { withFindingId } from "../finding-id.js";
import type { ScanContext, ScanRule } from "../types.js";

const DEFAULT_THRESHOLD = 8_000;

const SESSION_SOURCES = new Set([
  "cursor-rules",
  "cursor-learned",
  "claude-md",
  "claude-md-local",
  "claude-md-parent",
  "claude-user",
  "claude-auto-memory",
]);

export const tokenBudgetRule: ScanRule = {
  id: "token-budget",
  name: "Token budget",
  run(ctx: ScanContext) {
    const sessionRecords = ctx.records.filter(
      (r) => SESSION_SOURCES.has(r.source) && r.content.trim().length > 0,
    );

    let totalChars = 0;
    const recordIds: string[] = [];
    for (const record of sessionRecords) {
      totalChars += record.content.length;
      recordIds.push(record.id);
    }

    const tokens = estimateTokens(" ".repeat(totalChars));
    const threshold = DEFAULT_THRESHOLD;

    if (tokens <= threshold) {
      return [];
    }

    return [
      withFindingId({
        ruleId: "token-budget",
        severity: "info",
        title: `High session memory load (~${tokens.toLocaleString()} tokens)`,
        detail: `Estimated ${tokens.toLocaleString()} tokens across ${sessionRecords.length} markdown memory files (threshold ${threshold.toLocaleString()}). Consider trimming rules or learned memories.`,
        recordIds,
        fix: {
          type: "edit",
          hint: "Remove or scope rules; cap auto-memory and learned memories.",
        },
      }),
    ];
  },
};
