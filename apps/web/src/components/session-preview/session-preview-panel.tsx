import type { PreviewLayer, PreviewLayerRecord, ScanFinding, ToolSessionPreview } from "@meminspect/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toolIcon, toolLabel } from "@/lib/icons";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  Layers,
} from "lucide-react";
import { useState } from "react";
import type { PreviewResponse } from "@/services/preview-service";

const SEVERITY_CONFIG = {
  error: {
    label: "Error",
    icon: AlertCircle,
    badge: "destructive" as const,
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    badge: "outline" as const,
  },
  info: {
    label: "Info",
    icon: Info,
    badge: "secondary" as const,
  },
};

interface SessionPreviewPanelProps {
  preview: PreviewResponse | null;
  loading?: boolean;
  onSelectRecord: (recordId: string) => void;
  onSelectFinding: (finding: ScanFinding) => void;
  onClose: () => void;
}

export function SessionPreviewPanel({
  preview,
  loading,
  onSelectRecord,
  onSelectFinding,
  onClose,
}: SessionPreviewPanelProps) {
  const grandTotal = preview?.grandTotalTokens ?? 0;
  const conflictCount = preview?.conflictCount ?? 0;
  const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(() => new Set());

  const isLayerExpanded = (key: string) => !collapsedLayers.has(key);

  const toggleLayer = (key: string) => {
    setCollapsedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Session Load</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                On-disk memory that contributes to session context · ~{grandTotal.toLocaleString()}{" "}
                tokens · {preview ? new Date(preview.previewedAt).toLocaleString() : "—"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">
            {preview?.sessionRecordIds.length ?? 0} file
            {(preview?.sessionRecordIds.length ?? 0) === 1 ? "" : "s"}
          </Badge>
          {conflictCount > 0 ? (
            <Badge variant="outline">
              {conflictCount} scan conflict{conflictCount === 1 ? "" : "s"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              No scan conflicts
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading session files…</p>
          ) : !preview || preview.tools.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="mx-auto size-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">No session-load files found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Project rules, learned memory, and CLAUDE.md appear here when present.
              </p>
            </div>
          ) : (
            <>
              {preview.tools.map((toolPreview) => (
                <ToolPreviewCard
                  key={toolPreview.tool}
                  preview={toolPreview}
                  isLayerExpanded={isLayerExpanded}
                  onToggleLayer={toggleLayer}
                  onSelectRecord={onSelectRecord}
                />
              ))}
              {preview.conflictFindings.length > 0 ? (
                <section>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Scan conflicts
                  </h3>
                  <div className="space-y-2">
                    {preview.conflictFindings.map((finding) => (
                      <ConflictFindingCard
                        key={finding.id}
                        finding={finding}
                        onSelect={() => onSelectFinding(finding)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ToolPreviewCard({
  preview,
  isLayerExpanded,
  onToggleLayer,
  onSelectRecord,
}: {
  preview: ToolSessionPreview;
  isLayerExpanded: (key: string) => boolean;
  onToggleLayer: (key: string) => void;
  onSelectRecord: (recordId: string) => void;
}) {
  const Icon = toolIcon(preview.tool);

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{toolLabel(preview.tool)}</h3>
        </div>
        <Badge variant="secondary" className="font-mono text-[11px]">
          ~{preview.totalTokens.toLocaleString()} tokens
        </Badge>
      </div>
      <div className="mt-3 space-y-2">
        {preview.layers.map((layer) => {
          const layerKey = `${preview.tool}::${layer.id}`;
          return (
            <LayerSection
              key={layer.id}
              layer={layer}
              toolTotal={preview.totalTokens}
              expanded={isLayerExpanded(layerKey)}
              onToggle={() => onToggleLayer(layerKey)}
              onSelectRecord={onSelectRecord}
            />
          );
        })}
      </div>
    </div>
  );
}

function LayerSection({
  layer,
  toolTotal,
  expanded,
  onToggle,
  onSelectRecord,
}: {
  layer: PreviewLayer;
  toolTotal: number;
  expanded: boolean;
  onToggle: () => void;
  onSelectRecord: (recordId: string) => void;
}) {
  const share = toolTotal > 0 ? Math.min(Math.round((layer.tokens / toolTotal) * 100), 100) : 0;
  const isRules = layer.id === "cursor-rules";

  return (
    <div className="rounded-md border border-border/40 bg-background/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{layer.label}</span>
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          ~{layer.tokens.toLocaleString()} tok · {layer.recordCount} file
          {layer.recordCount === 1 ? "" : "s"}
        </span>
      </button>
      <div className="px-3 pb-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary/70 transition-all"
            style={{ width: `${Math.max(share, 4)}%` }}
          />
        </div>
      </div>
      {expanded ? (
        <div className="space-y-1 border-t border-border/40 px-2 py-2">
          {layer.records.map((entry) => (
            <LayerRecordRow
              key={entry.recordId}
              entry={entry}
              showRuleMeta={isRules}
              onSelect={() => onSelectRecord(entry.recordId)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LayerRecordRow({
  entry,
  showRuleMeta,
  onSelect,
}: {
  entry: PreviewLayerRecord;
  showRuleMeta: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm">{entry.title}</span>
          {showRuleMeta && entry.alwaysApply !== undefined ? (
            <Badge variant={entry.alwaysApply ? "default" : "outline"} className="text-[10px]">
              {entry.alwaysApply ? "always" : "scoped"}
            </Badge>
          ) : null}
        </div>
        {showRuleMeta && entry.globs?.length ? (
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {entry.globs.join(", ")}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 pt-0.5 font-mono text-[11px] text-muted-foreground">
        ~{entry.tokens.toLocaleString()}
      </span>
      <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function ConflictFindingCard({
  finding,
  onSelect,
}: {
  finding: ScanFinding;
  onSelect: () => void;
}) {
  const config = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.info;
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border border-border/60 bg-card/50 p-3 text-left transition-colors hover:bg-card",
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            finding.severity === "error" && "text-destructive",
            finding.severity === "warning" && "text-amber-500",
            finding.severity === "info" && "text-muted-foreground",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={config.badge} className="text-[10px]">
              {config.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-normal">
              {finding.ruleId}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm font-medium leading-snug">{finding.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{finding.detail}</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}
