export type {
  AdapterContext,
  AdapterDetection,
  MemoryRecord,
  MemoryRecordKind,
  MemoryScope,
  MemorySource,
  MemorySourceKind,
  ProjectRef,
  SearchHit,
  ToolAdapter,
  ToolId,
  WriteResult,
} from "./types.js";
export type { MeminspectConfig, MeminspectConfigProject } from "./config.js";
export { loadMeminspectConfig, meminspectConfigPath } from "./config.js";
export { discoverProjects } from "./discovery.js";
export type {
  PackageJsonDeps,
  ScanContext,
  ScanFinding,
  ScanFixHint,
  ScanOptions,
  ScanResult,
  ScanRule,
  ScanSeverity,
  ScanStats,
  ScannedRecord,
} from "./scan/types.js";
export { SCAN_RULES } from "./scan/rules/index.js";
export { buildScanContext, runScan, scanProject } from "./scan/engine.js";
export { estimateTokens } from "./scan/tokens.js";
export { stableFindingId } from "./scan/finding-id.js";
export type { ProjectScanPreferences, SnoozeStore } from "./snoozes.js";
export {
  getProjectPreferences,
  loadSnoozeStore,
  saveSnoozeStore,
  setProjectPreferences,
  snoozesPath,
} from "./snoozes.js";
export type {
  PreviewLayer,
  SessionPreview,
  SessionPreviewOptions,
  ToolSessionPreview,
} from "./preview/types.js";
export { buildSessionPreview } from "./preview/assembler.js";
export { isSessionLoadSource, SESSION_LOAD_SOURCES } from "./preview/layers.js";
