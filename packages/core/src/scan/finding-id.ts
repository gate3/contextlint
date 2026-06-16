import { createHash } from "node:crypto";
import type { ScanFinding } from "./types.js";

export function stableFindingId(
  ruleId: string,
  title: string,
  recordIds: string[],
): string {
  const payload = `${ruleId}\0${title}\0${[...recordIds].sort().join(",")}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function withFindingId(
  partial: Omit<ScanFinding, "id">,
): ScanFinding {
  return {
    ...partial,
    id: stableFindingId(partial.ruleId, partial.title, partial.recordIds),
  };
}
