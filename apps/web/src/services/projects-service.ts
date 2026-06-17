import type { ProjectRef } from "@meminspect/core";
import { getJson } from "./http-client.js";

export async function listProjects(): Promise<ProjectRef[]> {
  const { projects } = await getJson<{ projects: ProjectRef[] }>("/projects");
  return projects;
}

export async function getScanDemoProject(): Promise<{ path: string; name: string }> {
  return getJson("/demo/scan-project");
}
