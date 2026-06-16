import path from "node:path";
import type { MeminspectConfig } from "./config.js";
import type { ProjectRef, ToolAdapter, ToolId } from "./types.js";

function projectKey(projectPath: string): string {
  return path.resolve(projectPath);
}

function mergeProject(
  map: Map<string, ProjectRef>,
  projectPath: string,
  tools: ToolId[],
  name?: string,
): void {
  const key = projectKey(projectPath);
  const existing = map.get(key);
  if (existing) {
    const mergedTools = [...new Set([...existing.tools, ...tools])];
    map.set(key, { ...existing, tools: mergedTools });
    return;
  }
  map.set(key, {
    id: key,
    path: key,
    name: name ?? path.basename(key),
    tools,
  });
}

async function enrichProjectTools(
  adapters: ToolAdapter[],
  project: ProjectRef,
): Promise<ProjectRef> {
  const toolSet = new Set<ToolId>(project.tools);

  for (const adapter of adapters) {
    if (toolSet.has(adapter.id)) {
      continue;
    }
    try {
      const hasMemory = await adapter.probeProject({ projectPath: project.path });
      if (hasMemory) {
        toolSet.add(adapter.id);
      }
    } catch {
      // Stale workspace path or unreadable store — keep existing tools.
    }
  }

  return { ...project, tools: [...toolSet] };
}

export async function discoverProjects(
  adapters: ToolAdapter[],
  _homedir: string,
  config: MeminspectConfig = {},
): Promise<ProjectRef[]> {
  const map = new Map<string, ProjectRef>();

  for (const adapter of adapters) {
    const fromAdapter = await adapter.listProjects();
    for (const project of fromAdapter) {
      mergeProject(map, project.path, [adapter.id], project.name);
    }
  }

  for (const entry of config.projects ?? []) {
    const tools = entry.tools ?? adapters.map((a) => a.id);
    mergeProject(map, entry.path, tools);
  }

  const projects = [...map.values()];
  const enriched = await Promise.all(
    projects.map((project) => enrichProjectTools(adapters, project)),
  );
  return enriched.sort((a, b) => a.name.localeCompare(b.name));
}
