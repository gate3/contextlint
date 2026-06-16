import type {
  MemoryRecord,
  MemorySource,
  ProjectRef,
  ProjectScanPreferences,
  ScanFinding,
  ScanResult,
  SearchHit,
  ToolId,
} from "@meminspect/core";

const API_BASE = "/api";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Request failed: ${res.status}`);
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

export type ScanResponse = ScanResult & { preferences: ProjectScanPreferences };

export function runHealthScan(projectPath: string, tool?: ToolId): Promise<ScanResponse> {
  const params = new URLSearchParams({ path: projectPath });
  if (tool) {
    params.set("tool", tool);
  }
  return postJson(`/projects/scan?${params}`, {});
}

export function snoozeFinding(
  projectPath: string,
  findingId: string,
): Promise<{ ok: boolean; preferences: ProjectScanPreferences }> {
  return postJson("/projects/scan/snooze", { path: projectPath, findingId });
}

export function setScanRuleEnabled(
  projectPath: string,
  ruleId: string,
  enabled: boolean,
): Promise<{ ok: boolean; preferences: ProjectScanPreferences }> {
  return postJson("/projects/scan/disable-rule", { path: projectPath, ruleId, enabled });
}

export type { ScanFinding, ScanResult };
