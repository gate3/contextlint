import type { PreviewLayer, ScanFinding, ToolSessionPreview } from "@meminspect/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toolIcon, toolLabel } from "@/lib/icons";
import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Info,
  Layers,
} from "lucide-react";
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
  onSelectFinding: (finding: ScanFinding) => void;
  onClose: () => void;
}

export function SessionPreviewPanel({
  preview,
  loading,
  onSelectFinding,
  onClose,
}: SessionPreviewPanelProps) {
  const grandTotal = preview?.grandTotalTokens ?? 0;
  const conflictCount = preview?.conflictCount ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Session Load Preview</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                ~{grandTotal.toLocaleString()} tokens across session-load memory ·{" "}
                {preview ? new Date(preview.previewedAt).toLocaleString() : "—"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">
            {preview?.sessionRecordIds.length ?? 0} session-load records
          </Badge>
          {conflictCount > 0 ? (
            <Badge variant="outline">{conflictCount} scan conflict{conflictCount === 1 ? "" : "s"}</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              No scan conflicts in session load
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Building preview…</p>
          ) : !preview || preview.tools.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="mx-auto size-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">No session-load memory found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rules, CLAUDE.md, and auto memory appear here when present.
              </p>
            </div>
          ) : (
            <>
              {preview.tools.map((toolPreview) => (
                <ToolPreviewCard key={toolPreview.tool} preview={toolPreview} />
              ))}
              {preview.conflictFindings.length > 0 ? (
                <section>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Conflicts in session load
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

function ToolPreviewCard({ preview }: { preview: ToolSessionPreview }) {
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
        {preview.layers.map((layer) => (
          <LayerRow key={layer.id} layer={layer} toolTotal={preview.totalTokens} />
        ))}
      </div>
    </div>
  );
}

function LayerRow({ layer, toolTotal }: { layer: PreviewLayer; toolTotal: number }) {
  const share = toolTotal > 0 ? Math.round((layer.tokens / toolTotal) * 100) : 0;

  return (
    <div className="rounded-md border border-border/40 bg-background/60 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">{layer.label}</span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          ~{layer.tokens.toLocaleString()} tok · {layer.recordCount} file
          {layer.recordCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${Math.max(share, 4)}%` }}
        />
      </div>
    </div>
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
