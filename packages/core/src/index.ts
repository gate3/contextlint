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
