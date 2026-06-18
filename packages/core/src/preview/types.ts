import type { MemorySourceKind, ToolId } from "../types.js";
import type { ScanFinding } from "../scan/types.js";

export interface PreviewLayer {
  id: string;
  label: string;
  sources: MemorySourceKind[];
  recordIds: string[];
  recordCount: number;
  chars: number;
  tokens: number;
}

export interface ToolSessionPreview {
  tool: ToolId;
  layers: PreviewLayer[];
  totalChars: number;
  totalTokens: number;
}

export interface SessionPreview {
  projectPath: string;
  previewedAt: string;
  tools: ToolSessionPreview[];
  grandTotalTokens: number;
  sessionRecordIds: string[];
  conflictFindings: ScanFinding[];
  conflictCount: number;
}

export interface SessionPreviewOptions {
  /** Visible scan findings to intersect with session-load records. */
  scanFindings?: ScanFinding[];
}
