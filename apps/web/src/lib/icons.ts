import type { ToolId } from "@meminspect/core";
import { Bot, Brain, FileCode2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function toolLabel(tool: ToolId): string {
  return tool === "cursor" ? "Cursor" : "Claude Code";
}

export function toolIcon(tool: ToolId): LucideIcon {
  return tool === "cursor" ? FileCode2 : Bot;
}

export function appIcon(): LucideIcon {
  return Brain;
}
