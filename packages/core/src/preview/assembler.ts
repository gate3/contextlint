import { estimateTokens } from "../scan/tokens.js";
import type { ScannedRecord } from "../scan/types.js";
import { PREVIEW_LAYER_SPECS, SESSION_LOAD_SOURCES } from "./layers.js";
import type { PreviewLayer, PreviewLayerRecord, SessionPreview, SessionPreviewOptions, ToolSessionPreview } from "./types.js";
import type { ToolId } from "../types.js";

const TOOL_ORDER: ToolId[] = ["cursor", "claude-code"];

function sessionLoadRecords(records: ScannedRecord[]): ScannedRecord[] {
  return records.filter(
    (record) => SESSION_LOAD_SOURCES.has(record.source) && record.content.trim().length > 0,
  );
}

function buildLayerRecord(record: ScannedRecord): PreviewLayerRecord {
  const entry: PreviewLayerRecord = {
    recordId: record.id,
    title: record.title,
    chars: record.content.length,
    tokens: estimateTokens(record.content.length),
  };

  if (record.source === "cursor-rules") {
    const { alwaysApply, globs } = record.metadata ?? {};
    if (alwaysApply !== undefined) {
      entry.alwaysApply = alwaysApply;
    }
    if (globs?.length) {
      entry.globs = globs;
    }
  }

  return entry;
}

function buildLayer(
  spec: (typeof PREVIEW_LAYER_SPECS)[number],
  records: ScannedRecord[],
): PreviewLayer | null {
  const layerRecords = records
    .filter((record) => record.tool === spec.tool && spec.sources.includes(record.source))
    .sort((a, b) => b.content.length - a.content.length || a.title.localeCompare(b.title));

  if (layerRecords.length === 0) {
    return null;
  }

  const layerRecordEntries = layerRecords.map(buildLayerRecord);
  const chars = layerRecords.reduce((sum, record) => sum + record.content.length, 0);
  return {
    id: spec.id,
    label: spec.label,
    sources: spec.sources,
    recordIds: layerRecords.map((record) => record.id),
    records: layerRecordEntries,
    recordCount: layerRecords.length,
    chars,
    tokens: estimateTokens(chars),
  };
}

function buildToolPreview(tool: ToolId, records: ScannedRecord[]): ToolSessionPreview | null {
  const layers = PREVIEW_LAYER_SPECS.filter((spec) => spec.tool === tool)
    .map((spec) => buildLayer(spec, records))
    .filter((layer): layer is PreviewLayer => layer !== null);

  if (layers.length === 0) {
    return null;
  }

  const totalChars = layers.reduce((sum, layer) => sum + layer.chars, 0);
  return {
    tool,
    layers,
    totalChars,
    totalTokens: estimateTokens(totalChars),
  };
}

function attachConflictFindings(
  sessionRecordIds: ReadonlySet<string>,
  scanFindings: SessionPreviewOptions["scanFindings"],
) {
  if (!scanFindings?.length) {
    return [];
  }
  return scanFindings.filter((finding) =>
    finding.recordIds?.some((recordId) => sessionRecordIds.has(recordId)),
  );
}

export function buildSessionPreview(
  projectPath: string,
  records: ScannedRecord[],
  options: SessionPreviewOptions = {},
): SessionPreview {
  const loadRecords = sessionLoadRecords(records);
  const sessionRecordIds = loadRecords.map((record) => record.id);
  const sessionRecordIdSet = new Set(sessionRecordIds);

  const tools = TOOL_ORDER.map((tool) => buildToolPreview(tool, loadRecords)).filter(
    (preview): preview is ToolSessionPreview => preview !== null,
  );

  const grandTotalChars = tools.reduce((sum, tool) => sum + tool.totalChars, 0);
  const conflictFindings = attachConflictFindings(sessionRecordIdSet, options.scanFindings);

  return {
    projectPath,
    previewedAt: new Date().toISOString(),
    tools,
    grandTotalTokens: estimateTokens(grandTotalChars),
    sessionRecordIds,
    conflictFindings,
    conflictCount: conflictFindings.length,
  };
}
