import type { MemorySourceKind, ToolId } from "../types.js";

/** Memory sources that typically load at IDE session start (markdown-backed). */
export const SESSION_LOAD_SOURCES = new Set<MemorySourceKind>([
  "cursor-rules",
  "cursor-learned",
  "claude-user",
  "claude-md-parent",
  "claude-md",
  "claude-md-local",
  "claude-auto-memory",
  "claude-auto-memory-topic",
]);

export interface PreviewLayerSpec {
  id: string;
  tool: ToolId;
  label: string;
  sources: MemorySourceKind[];
}

/** Layer order per tool — approximates IDE session load ordering. */
export const PREVIEW_LAYER_SPECS: PreviewLayerSpec[] = [
  {
    id: "cursor-rules",
    tool: "cursor",
    label: "Project rules",
    sources: ["cursor-rules"],
  },
  {
    id: "cursor-learned",
    tool: "cursor",
    label: "Learned memories",
    sources: ["cursor-learned"],
  },
  {
    id: "claude-user",
    tool: "claude-code",
    label: "User CLAUDE.md",
    sources: ["claude-user"],
  },
  {
    id: "claude-md-parent",
    tool: "claude-code",
    label: "Parent CLAUDE.md",
    sources: ["claude-md-parent"],
  },
  {
    id: "claude-md-project",
    tool: "claude-code",
    label: "Project CLAUDE.md",
    sources: ["claude-md", "claude-md-local"],
  },
  {
    id: "claude-auto-memory",
    tool: "claude-code",
    label: "Auto memory",
    sources: ["claude-auto-memory", "claude-auto-memory-topic"],
  },
];

export function isSessionLoadSource(source: MemorySourceKind): boolean {
  return SESSION_LOAD_SOURCES.has(source);
}
