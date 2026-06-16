import type { ScanFinding } from "@meminspect/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  BellOff,
  ChevronRight,
  Info,
  ShieldCheck,
} from "lucide-react";

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

interface ScanResultsPanelProps {
  findings: ScanFinding[];
  stats: {
    findingsVisible: number;
    findingsTotal: number;
    recordsScanned: number;
    rulesRun: number;
    snoozed: number;
  };
  scannedAt: string;
  loading?: boolean;
  onSelectFinding: (finding: ScanFinding) => void;
  onSnooze: (finding: ScanFinding) => void;
  onClose: () => void;
}

export function ScanResultsPanel({
  findings,
  stats,
  scannedAt,
  loading,
  onSelectFinding,
  onSnooze,
  onClose,
}: ScanResultsPanelProps) {
  const grouped = {
    error: findings.filter((f) => f.severity === "error"),
    warning: findings.filter((f) => f.severity === "warning"),
    info: findings.filter((f) => f.severity === "info"),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Health Scan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.findingsVisible} finding{stats.findingsVisible === 1 ? "" : "s"} ·{" "}
                {stats.recordsScanned} records · {stats.rulesRun} rules ·{" "}
                {new Date(scannedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="destructive">{grouped.error.length} errors</Badge>
          <Badge variant="outline">{grouped.warning.length} warnings</Badge>
          <Badge variant="secondary">{grouped.info.length} info</Badge>
          {stats.snoozed > 0 ? (
            <Badge variant="outline" className="text-muted-foreground">
              {stats.snoozed} snoozed
            </Badge>
          ) : null}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Running scan…</p>
          ) : findings.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="mx-auto size-10 text-emerald-500/80" />
              <p className="mt-3 text-sm font-medium">No issues found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Heuristic scan — false negatives are possible.
              </p>
            </div>
          ) : (
            findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onSelect={() => onSelectFinding(finding)}
                onSnooze={() => onSnooze(finding)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FindingCard({
  finding,
  onSelect,
  onSnooze,
}: {
  finding: ScanFinding;
  onSelect: () => void;
  onSnooze: () => void;
}) {
  const config = SEVERITY_CONFIG[finding.severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card/50 p-3 transition-colors hover:bg-card",
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
          <button
            type="button"
            onClick={onSelect}
            className="mt-1.5 w-full text-left"
          >
            <p className="text-sm font-medium leading-snug">{finding.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{finding.detail}</p>
            {finding.fix ? (
              <p className="mt-1.5 text-xs text-primary/90">→ {finding.fix.hint}</p>
            ) : null}
          </button>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={onSelect}>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={onSnooze}
            title="Snooze this finding"
          >
            <BellOff className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
