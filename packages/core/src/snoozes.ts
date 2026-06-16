import fs from "node:fs/promises";
import path from "node:path";

export interface ProjectScanPreferences {
  snoozedFindingIds: string[];
  disabledRuleIds: string[];
}

export interface SnoozeStore {
  projects: Record<string, ProjectScanPreferences>;
}

const EMPTY_STORE: SnoozeStore = { projects: {} };

export function snoozesPath(homedir: string): string {
  return path.join(homedir, ".meminspect", "snoozes.json");
}

export async function loadSnoozeStore(homedir: string): Promise<SnoozeStore> {
  try {
    const raw = await fs.readFile(snoozesPath(homedir), "utf8");
    return JSON.parse(raw) as SnoozeStore;
  } catch {
    return structuredClone(EMPTY_STORE);
  }
}

export async function saveSnoozeStore(homedir: string, store: SnoozeStore): Promise<void> {
  const filePath = snoozesPath(homedir);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function getProjectPreferences(
  store: SnoozeStore,
  projectPath: string,
): ProjectScanPreferences {
  return (
    store.projects[projectPath] ?? {
      snoozedFindingIds: [],
      disabledRuleIds: [],
    }
  );
}

export function setProjectPreferences(
  store: SnoozeStore,
  projectPath: string,
  prefs: ProjectScanPreferences,
): SnoozeStore {
  return {
    projects: {
      ...store.projects,
      [projectPath]: prefs,
    },
  };
}
