import type { MemoryRecord } from "@meminspect/core";
import { PanelBody } from "@/components/panel-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  isRecordEmpty,
  recordDisplayTitle,
  sourceDescription,
  sourceLabel,
} from "@/lib/memory-labels";
import { ArrowLeft, FileText } from "lucide-react";
import type { ScanResponse } from "@/services/scan-service";

interface RecordDetailPanelProps {
  record: MemoryRecord | null;
  loading: boolean;
  returnToScanPanel: boolean;
  returnToPreviewPanel: boolean;
  scanResult: ScanResponse | null;
  onBackToScanResults: () => void;
  onBackToPreview: () => void;
}

export function RecordDetailPanel({
  record,
  loading,
  returnToScanPanel,
  returnToPreviewPanel,
  scanResult,
  onBackToScanResults,
  onBackToPreview,
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
            Back to session preview
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline">{sourceLabel(record.source, record)}</Badge>
              <Badge variant="secondary">{record.metadata.scope}</Badge>
              {isRecordEmpty(record) ? <Badge variant="secondary">empty</Badge> : null}
            </div>
            {record.source === "cursor-sqlite-kv" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {sourceDescription("cursor-sqlite-kv")}
              </p>
            ) : null}
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
          <Card className="m-4 border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Content</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {isRecordEmpty(record) ? (
                <p className="text-sm text-muted-foreground italic">This file is empty.</p>
              ) : (
                <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground/90">
                  {record.content}
                </pre>
              )}
            </CardContent>
          </Card>
        </ScrollArea>
      </PanelBody>
    </>
  );
}
