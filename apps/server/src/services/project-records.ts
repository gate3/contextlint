import type { MemoryRecord, ScannedRecord, ToolAdapter, ToolId } from "@meminspect/core";
import { resolveAdapters } from "../adapters.js";

export interface ToolRecordBundle {
  tool: ToolId;
  records: MemoryRecord[];
}

export async function loadProjectRecordBundles(
  adapters: ToolAdapter[],
  projectPath: string,
  tool?: string,
): Promise<ToolRecordBundle[]> {
  const resolved = resolveAdapters(adapters, tool);
  if (resolved.error) {
    throw new Error(resolved.error.message);
  }

  return Promise.all(
    resolved.adapters.map(async (adapter) => {
      try {
        return {
          tool: adapter.id,
          records: await adapter.listRecords({ projectPath }),
        };
      } catch {
        return { tool: adapter.id, records: [] };
      }
    }),
  );
}

export async function loadScannedRecords(
  adapters: ToolAdapter[],
  projectPath: string,
  tool?: string,
): Promise<ScannedRecord[]> {
  const bundles = await loadProjectRecordBundles(adapters, projectPath, tool);
  return bundles.flatMap((b) => b.records.map((record) => ({ ...record, tool: b.tool })));
}
