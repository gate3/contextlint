import type { ProjectScanPreferences, ScanResult, ToolId } from "@meminspect/core";
import { getJson, postJson } from "./http-client.js";

export type ScanResponse = ScanResult & { preferences: ProjectScanPreferences };

export async function runHealthScan(
  projectPath: string,
  tool?: ToolId,
): Promise<ScanResponse> {
  const params = new URLSearchParams({ path: projectPath });
  if (tool) {
    params.set("tool", tool);
  }
  return postJson(`/projects/scan?${params}`, {});
}

export async function snoozeFinding(
  projectPath: string,
  findingId: string,
): Promise<ProjectScanPreferences> {
  const { preferences } = await postJson<{ preferences: ProjectScanPreferences }>(
    "/projects/scan/snooze",
    { path: projectPath, findingId },
  );
  return preferences;
}

export async function setScanRuleEnabled(
  projectPath: string,
  ruleId: string,
  enabled: boolean,
): Promise<ProjectScanPreferences> {
  const { preferences } = await postJson<{ preferences: ProjectScanPreferences }>(
    "/projects/scan/disable-rule",
    { path: projectPath, ruleId, enabled },
  );
  return preferences;
}

export async function getScanPreferences(
  projectPath: string,
): Promise<ProjectScanPreferences> {
  const params = new URLSearchParams({ path: projectPath });
  const { preferences } = await getJson<{ preferences: ProjectScanPreferences }>(
    `/projects/scan/preferences?${params}`,
  );
  return preferences;
}
