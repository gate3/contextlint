import { describe, expect, it } from "vitest";
import {
  loadHealthScanDemoRecords,
  resolveHealthScanDemoPath,
} from "./demo-fixture.js";
import { runScan, buildScanContext } from "./engine.js";

const ALL_RULE_IDS = [
  "contradiction",
  "cross-project-leak",
  "stale-dep",
  "redundant",
  "over-broad",
  "shadow-memory",
  "token-budget",
] as const;

describe("health-scan-demo fixture", () => {
  it("triggers all seven scan rules", async () => {
    const demoPath = resolveHealthScanDemoPath();
    const records = loadHealthScanDemoRecords(demoPath);
    expect(records.length).toBeGreaterThan(5);

    const ctx = await buildScanContext(demoPath, records);
    const result = runScan(ctx);
    const ruleIds = new Set(result.findings.map((f) => f.ruleId));

    for (const ruleId of ALL_RULE_IDS) {
      expect(ruleIds.has(ruleId), `expected finding for rule: ${ruleId}`).toBe(true);
    }
  });
});
