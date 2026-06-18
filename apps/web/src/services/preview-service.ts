import type { ScanResult, SessionPreview, ToolId } from "@meminspect/core";
import { getJson } from "./http-client.js";

export type PreviewResponse = SessionPreview & {
  scan: Pick<ScanResult, "scannedAt" | "stats">;
};

export async function getSessionPreview(
  projectPath: string,
  tool?: ToolId,
): Promise<PreviewResponse> {
  const params = new URLSearchParams({ path: projectPath });
  if (tool) {
    params.set("tool", tool);
  }
  return getJson(`/projects/preview?${params}`);
}
