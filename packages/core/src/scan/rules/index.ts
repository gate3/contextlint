import { contradictionRule } from "./contradiction.js";
import { crossProjectLeakRule } from "./cross-project-leak.js";
import { overBroadRule } from "./over-broad.js";
import { redundantRule } from "./redundant.js";
import { shadowMemoryRule } from "./shadow-memory.js";
import { staleDepRule } from "./stale-dep.js";
import { tokenBudgetRule } from "./token-budget.js";
import type { ScanRule } from "../types.js";

export const SCAN_RULES: ScanRule[] = [
  contradictionRule,
  crossProjectLeakRule,
  staleDepRule,
  redundantRule,
  overBroadRule,
  shadowMemoryRule,
  tokenBudgetRule,
];

export {
  contradictionRule,
  crossProjectLeakRule,
  overBroadRule,
  redundantRule,
  shadowMemoryRule,
  staleDepRule,
  tokenBudgetRule,
};
