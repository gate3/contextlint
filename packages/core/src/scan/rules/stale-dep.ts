import { withFindingId } from "../finding-id.js";
import type { ScanContext, ScanRule } from "../types.js";

const VERSION_IN_TEXT_RE = /(\w[\w@/-]*)\s*(?:@|v)?(\d+\.\d+(?:\.\d+)?)/g;

export const staleDepRule: ScanRule = {
  id: "stale-dep",
  name: "Stale dependency",
  run(ctx: ScanContext) {
    if (!ctx.packageJson) {
      return [];
    }

    const actual = new Map<string, string>();
    for (const [name, version] of Object.entries(ctx.packageJson.dependencies)) {
      actual.set(name.toLowerCase(), version.replace(/^[\^~]/, ""));
    }
    for (const [name, version] of Object.entries(ctx.packageJson.devDependencies)) {
      actual.set(name.toLowerCase(), version.replace(/^[\^~]/, ""));
    }

    const findings = [];

    for (const record of ctx.records) {
      if (!record.content.trim()) {
        continue;
      }

      const mismatches: string[] = [];

      for (const match of record.content.matchAll(VERSION_IN_TEXT_RE)) {
        const depName = match[1]?.toLowerCase();
        const mentioned = match[2];
        if (!depName || !mentioned) {
          continue;
        }
        const pkgVersion = actual.get(depName);
        if (!pkgVersion) {
          continue;
        }
        const pkgMajorMinor = pkgVersion.split(".").slice(0, 2).join(".");
        const mentionedMajorMinor = mentioned.split(".").slice(0, 2).join(".");
        if (pkgMajorMinor !== mentionedMajorMinor) {
          mismatches.push(`${depName}: memory says ${mentioned}, package.json has ${pkgVersion}`);
        }
      }

      const unique = [...new Set(mismatches)].slice(0, 3);
      if (unique.length === 0) {
        continue;
      }

      findings.push(
        withFindingId({
          ruleId: "stale-dep",
          severity: "warning",
          title: `Stale version mention in ${record.title}`,
          detail: unique.join("; "),
          recordIds: [record.id],
          fix: {
            type: "edit",
            hint: "Update memory to match package.json or remove outdated version pins.",
          },
        }),
      );
    }

    return findings;
  },
};
