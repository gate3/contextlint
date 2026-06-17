import path from "node:path";
import { SCAN_RULES } from "./rules/index.js";
import { loadPackageJsonDeps } from "./package-json.js";
import type { ScanContext, ScanOptions, ScanResult, ScannedRecord } from "./types.js";

export async function buildScanContext(
  projectPath: string,
  records: ScannedRecord[],
): Promise<ScanContext> {
  const resolved = path.resolve(projectPath);
  return {
    projectPath: resolved,
    projectName: path.basename(resolved),
    records,
    packageJson: await loadPackageJsonDeps(resolved),
  };
}

export function runScan(ctx: ScanContext, options: ScanOptions = {}): ScanResult {
  const disabled = new Set(options.disabledRuleIds ?? []);
  const snoozed = new Set(options.snoozedFindingIds ?? []);
  const activeRules = SCAN_RULES.filter((rule) => !disabled.has(rule.id));

  const allFindings = activeRules.flatMap((rule) => rule.run(ctx));
  const visible = allFindings.filter((f) => !snoozed.has(f.id));

  return {
    projectPath: ctx.projectPath,
    scannedAt: new Date().toISOString(),
    findings: visible,
    stats: {
      recordsScanned: ctx.records.length,
      rulesRun: activeRules.length,
      findingsTotal: allFindings.length,
      findingsVisible: visible.length,
      snoozed: allFindings.length - visible.length,
    },
  };
}

export async function scanProject(
  projectPath: string,
  records: ScannedRecord[],
  options: ScanOptions = {},
): Promise<ScanResult> {
  const ctx = await buildScanContext(projectPath, records);
  return runScan(ctx, options);
}
