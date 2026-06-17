import { withFindingId } from "../finding-id.js";
import type { ScanContext, ScanRule } from "../types.js";

const SIMILARITY_THRESHOLD = 0.55;

function shingles(text: string, size = 3): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  const set = new Set<string>();
  const words = normalized.split(/\W+/).filter((w) => w.length > 2);
  for (let i = 0; i <= words.length - size; i++) {
    set.add(words.slice(i, i + size).join(" "));
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) {
      intersection++;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const redundantRule: ScanRule = {
  id: "redundant",
  name: "Redundant rules",
  run(ctx: ScanContext) {
    const rules = ctx.records.filter(
      (r) =>
        (r.source === "cursor-rules" || r.source.startsWith("claude-md")) &&
        r.content.trim().length > 40,
    );
    const findings = [];
    const seen = new Set<string>();

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const a = rules[i]!;
        const b = rules[j]!;
        const score = jaccard(shingles(a.content), shingles(b.content));
        if (score < SIMILARITY_THRESHOLD) {
          continue;
        }
        const pairKey = [a.id, b.id].sort().join(":");
        if (seen.has(pairKey)) {
          continue;
        }
        seen.add(pairKey);

        findings.push(
          withFindingId({
            ruleId: "redundant",
            severity: "info",
            title: `Similar content in ${a.title} and ${b.title}`,
            detail: `These memory files overlap heavily (${Math.round(score * 100)}% similar). Consider consolidating.`,
            recordIds: [a.id, b.id],
            fix: {
              type: "edit",
              hint: "Merge duplicate guidance into one file.",
            },
          }),
        );
      }
    }

    return findings;
  },
};
