import {
  getProjectPreferences,
  loadSnoozeStore,
  saveSnoozeStore,
  setProjectPreferences,
  type ProjectScanPreferences,
} from "@meminspect/core";

export async function readProjectScanPreferences(
  homedir: string,
  projectPath: string,
): Promise<ProjectScanPreferences> {
  const store = await loadSnoozeStore(homedir);
  return getProjectPreferences(store, projectPath);
}

export async function snoozeScanFinding(
  homedir: string,
  projectPath: string,
  findingId: string,
): Promise<ProjectScanPreferences> {
  const store = await loadSnoozeStore(homedir);
  const prefs = getProjectPreferences(store, projectPath);
  if (!prefs.snoozedFindingIds.includes(findingId)) {
    prefs.snoozedFindingIds.push(findingId);
  }
  await saveSnoozeStore(homedir, setProjectPreferences(store, projectPath, prefs));
  return prefs;
}

export async function setScanRuleEnabled(
  homedir: string,
  projectPath: string,
  ruleId: string,
  enabled: boolean,
): Promise<ProjectScanPreferences> {
  const store = await loadSnoozeStore(homedir);
  const prefs = getProjectPreferences(store, projectPath);

  if (enabled) {
    prefs.disabledRuleIds = prefs.disabledRuleIds.filter((id) => id !== ruleId);
  } else if (!prefs.disabledRuleIds.includes(ruleId)) {
    prefs.disabledRuleIds.push(ruleId);
  }

  await saveSnoozeStore(homedir, setProjectPreferences(store, projectPath, prefs));
  return prefs;
}
