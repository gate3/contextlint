import type { MemoryRecord, MemorySource, ProjectRef, SearchHit, ToolId } from "@meminspect/core";

const API_BASE = "/api";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchProjects(): Promise<{ projects: ProjectRef[] }> {
  return getJson("/projects");
}

export function fetchSources(
  projectPath: string,
  tool?: ToolId,
): Promise<{ projectPath: string; bundles: Array<{ tool: ToolId; sources: MemorySource[] }> }> {
  const params = new URLSearchParams({ path: projectPath });
  if (tool) {
    params.set("tool", tool);
  }
  return getJson(`/projects/sources?${params}`);
}

export function fetchRecords(
  projectPath: string,
  tool?: ToolId,
): Promise<{ projectPath: string; bundles: Array<{ tool: ToolId; records: MemoryRecord[] }> }> {
  const params = new URLSearchParams({ path: projectPath });
  if (tool) {
    params.set("tool", tool);
  }
  return getJson(`/projects/records?${params}`);
}

export function fetchRecord(
  projectPath: string,
  recordId: string,
  tool?: ToolId,
): Promise<{ record: MemoryRecord }> {
  const params = new URLSearchParams({ path: projectPath, id: recordId });
  if (tool) {
    params.set("tool", tool);
  }
  return getJson(`/records?${params}`);
}

export function searchRecords(
  projectPath: string,
  query: string,
  tool?: ToolId,
): Promise<{ hits: Array<SearchHit & { tool: ToolId }> }> {
  const params = new URLSearchParams({ path: projectPath, q: query });
  if (tool) {
    params.set("tool", tool);
  }
  return getJson(`/search?${params}`);
}
