import { withFindingId } from "../finding-id.js";
import type { ScanContext, ScanRule, ScannedRecord } from "../types.js";

const CONFLICT_PAIRS: Array<[RegExp, RegExp, string]> = [
  [/use\s+pnpm/i, /use\s+npm/i, "package manager"],
  [/typescript/i, /javascript\s+only/i, "language"],
  [/prefer\s+tabs/i, /use\s+spaces/i, "indentation"],
  [/always\s+use\s+jest/i, /use\s+vitest/i, "test runner"],
  [/next\.js\s+13/i, /next\.js\s+1[4-9]/i, "Next.js version"],
];

function normalizeForCompare(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function recordsConflict(a: ScannedRecord, b: ScannedRecord): string | null {
  const textA = normalizeForCompare(a.content);
  const textB = normalizeForCompare(b.content);

  for (const [left, right, topic] of CONFLICT_PAIRS) {
    const aLeft = left.test(textA);
    const aRight = right.test(textA);
    const bLeft = left.test(textB);
    const bRight = right.test(textB);
    if ((aLeft && bRight) || (aRight && bLeft)) {
      return topic;
    }
  }

  return null;
}

export const contradictionRule: ScanRule = {
  id: "contradiction",
  name: "Contradiction",
  run(ctx: ScanContext) {
    const markdown = ctx.records.filter(
      (r) => r.kind === "markdown" && r.content.trim().length > 0,
    );
    const findings = [];
    const seen = new Set<string>();

    for (let i = 0; i < markdown.length; i++) {
      for (let j = i + 1; j < markdown.length; j++) {
        const a = markdown[i]!;
        const b = markdown[j]!;
        const topic = recordsConflict(a, b);
        if (!topic) {
          continue;
        }
        const pairKey = [a.id, b.id].sort().join(":");
        if (seen.has(pairKey)) {
          continue;
        }
        seen.add(pairKey);

        findings.push(
          withFindingId({
            ruleId: "contradiction",
            severity: "error",
            title: `Conflicting guidance on ${topic}`,
            detail: `"${a.title}" and "${b.title}" appear to give opposite instructions about ${topic}.`,
            recordIds: [a.id, b.id],
            fix: {
              type: "edit",
              hint: "Align or remove one of the conflicting instructions.",
            },
          }),
        );
      }
    }

    return findings;
  },
};
