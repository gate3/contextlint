import type { ToolAdapter, ToolId } from "@meminspect/core";
import { createClaudeCodeAdapter } from "@meminspect/adapter-claude-code";
import { createCursorAdapter } from "@meminspect/adapter-cursor";
import os from "node:os";

export function createAdapters(
  homedir: string = os.homedir(),
  config?: { cursor?: { dataDir?: string | null } },
): ToolAdapter[] {
  return [
    createClaudeCodeAdapter(homedir),
    createCursorAdapter(homedir, config?.cursor?.dataDir),
  ];
}

export function resolveAdapters(
  adapters: ToolAdapter[],
  tool?: string,
): { adapters: ToolAdapter[]; error?: { message: string; code: string } } {
  if (!tool) {
    return { adapters };
  }
  const adapter = adapters.find((a) => a.id === tool);
  if (!adapter) {
    return {
      adapters: [],
      error: { message: `Unknown tool: ${tool}`, code: "NOT_FOUND" },
    };
  }
  return { adapters: [adapter] };
}

export function toolIdFromRecord(recordId: string): ToolId {
  const prefix = recordId.split("::")[0];
  if (prefix?.startsWith("cursor")) {
    return "cursor";
  }
  return "claude-code";
}
