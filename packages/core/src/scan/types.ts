import type { MemoryRecord, ToolId } from "../types.js";

export type ScanSeverity = "error" | "warning" | "info";

export interface ScanFixHint {
  type: "edit" | "disable" | "delete";
  hint: string;
}

export interface ScanFinding {
  id: string;
  ruleId: string;
  severity: ScanSeverity;
  title: string;
  detail: string;
  recordIds: string[];
  fix?: ScanFixHint;
}

export interface ScanStats {
  recordsScanned: number;
  rulesRun: number;
  findingsTotal: number;
  findingsVisible: number;
  snoozed: number;
}

export interface ScanResult {
  projectPath: string;
  scannedAt: string;
  findings: ScanFinding[];
  stats: ScanStats;
}

export type ScannedRecord = MemoryRecord & { tool: ToolId };

export interface ScanContext {
  projectPath: string;
  projectName: string;
  records: ScannedRecord[];
  packageJson?: PackageJsonDeps;
}

export interface PackageJsonDeps {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface ScanOptions {
  disabledRuleIds?: string[];
  snoozedFindingIds?: string[];
  tokenBudgetThreshold?: number;
}

export interface ScanRule {
  readonly id: string;
  readonly name: string;
  run(ctx: ScanContext): ScanFinding[];
}
