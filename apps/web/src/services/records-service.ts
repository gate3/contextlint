import type { MemoryRecord, SearchHit, ToolId } from "@meminspect/core";
import { getJson } from "./http-client.js";

export async function listProjectRecords(
  projectPath: string,
  tool?: ToolId,
): Promise<Array<{ tool: ToolId; records: MemoryRecord[] }>> {
  const params = new URLSearchParams({ path: projectPath });
  if (tool) {
    params.set("tool", tool);
  }
  const { bundles } = await getJson<{
    bundles: Array<{ tool: ToolId; records: MemoryRecord[] }>;
  }>(`/projects/records?${params}`);
  return bundles;
}

export async function getRecord(
  projectPath: string,
  recordId: string,
  tool?: ToolId,
): Promise<MemoryRecord> {
  const params = new URLSearchParams({ path: projectPath, id: recordId });
  if (tool) {
    params.set("tool", tool);
  }
  const { record } = await getJson<{ record: MemoryRecord }>(`/records?${params}`);
  return record;
}

export async function searchProjectRecords(
  projectPath: string,
  query: string,
  tool?: ToolId,
): Promise<Array<SearchHit & { tool: ToolId }>> {
  const params = new URLSearchParams({ path: projectPath, q: query });
  if (tool) {
    params.set("tool", tool);
  }
  const { hits } = await getJson<{ hits: Array<SearchHit & { tool: ToolId }> }>(
    `/search?${params}`,
  );
  return hits;
}
