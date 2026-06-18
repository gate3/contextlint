import type { MemoryRecord } from "@meminspect/core";
import { PanelBody } from "@/components/panel-shell";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { recordDisplayTitle } from "@/lib/memory-labels";
import { ArrowLeft, FileText } from "lucide-react";
import type { ScanResponse } from "@/services/scan-service";
import { RecordEditor } from "./record-editor";
import { RecordMetaBadges } from "./record-meta-badges";

interface RecordDetailPanelProps {
  record: MemoryRecord | null;
  loading: boolean;
  saving: boolean;
  undoAvailable: boolean;
  lastBackupPath: string | null;
  returnToScanPanel: boolean;
  returnToPreviewPanel: boolean;
  scanResult: ScanResponse | null;
  onBackToScanResults: () => void;
  onBackToPreview: () => void;
  onSaveRecord: (content: string) => void;
  onUndoRecord: () => void;
}

export function RecordDetailPanel({
  record,
  loading,
  saving,
  undoAvailable,
  lastBackupPath,
  returnToScanPanel,
  returnToPreviewPanel,
  scanResult,
  onBackToScanResults,
  onBackToPreview,
  onSaveRecord,
  onUndoRecord,
}: RecordDetailPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <FileText className="size-7 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-base font-medium">No record selected</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Choose a memory record from the list to inspect rules, learned memories, and Cursor
          database entries.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="shrink-0 border-b border-border px-6 py-4">
        {returnToScanPanel && scanResult ? (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-3 h-8 gap-1.5 px-2 text-muted-foreground"
            onClick={onBackToScanResults}
          >
            <ArrowLeft className="size-4" />
            Back to scan results
          </Button>
        ) : returnToPreviewPanel ? (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-3 h-8 gap-1.5 px-2 text-muted-foreground"
            onClick={onBackToPreview}
          >
            <ArrowLeft className="size-4" />
            Back to session load
          </Button>
        ) : null}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold tracking-tight">
              {recordDisplayTitle(record)}
            </h2>
            <div className="mt-2">
              <RecordMetaBadges record={record} />
            </div>
            <Tooltip>
              <TooltipTrigger className="mt-2 block w-full truncate text-left font-mono text-xs text-muted-foreground">
                {record.path}
                {record.kind === "sqlite-kv" ? ` · key: ${record.title}` : ""}
              </TooltipTrigger>
              <TooltipContent className="max-w-lg break-all">
                {record.path}
                {record.kind === "sqlite-kv" ? `\nKey: ${record.title}` : ""}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <PanelBody className="bg-muted/20">
        <ScrollArea className="h-full">
          <RecordEditor
            record={record}
            saving={saving}
            undoAvailable={undoAvailable}
            lastBackupPath={lastBackupPath}
            onSave={onSaveRecord}
            onUndo={onUndoRecord}
          />
        </ScrollArea>
      </PanelBody>
    </>
  );
}
