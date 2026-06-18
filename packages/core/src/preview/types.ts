import type { MemorySourceKind, ToolId } from "../types.js";
import type { ScanFinding } from "../scan/types.js";

export interface PreviewLayerRecord {
  recordId: string;
  title: string;
  chars: number;
  tokens: number;
  alwaysApply?: boolean;
  globs?: string[];
}

export interface PreviewLayer {
  id: string;
  label: string;
  sources: MemorySourceKind[];
  recordIds: string[];
  records: PreviewLayerRecord[];
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
