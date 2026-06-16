import fs from "node:fs/promises";
import path from "node:path";
import type { ToolId } from "./types.js";

export interface MeminspectConfigProject {
  path: string;
  tools?: ToolId[];
}

export interface MeminspectConfig {
  projects?: MeminspectConfigProject[];
  cursor?: { dataDir?: string | null };
  claude?: { configDir?: string | null };
  safety?: {
    sqliteWrites?: boolean;
    backupDir?: string;
  };
}

const EMPTY_CONFIG: MeminspectConfig = {};

export function meminspectConfigPath(homedir: string): string {
  return path.join(homedir, ".meminspect", "config.json");
}

export async function loadMeminspectConfig(homedir: string): Promise<MeminspectConfig> {
  const configPath = meminspectConfigPath(homedir);
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return JSON.parse(raw) as MeminspectConfig;
  } catch {
    return EMPTY_CONFIG;
  }
}
