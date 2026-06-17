import type { ToolAdapter } from "@meminspect/core";

export interface ServerContext {
  homedir: string;
  adapters: ToolAdapter[];
}
