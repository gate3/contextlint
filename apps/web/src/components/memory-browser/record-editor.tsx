import type { MemoryRecord } from "@meminspect/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { isRecordEmpty } from "@/lib/memory-labels";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";

interface RecordEditorProps {
  record: MemoryRecord;
  saving: boolean;
  undoAvailable: boolean;
  lastBackupPath: string | null;
  onSave: (content: string) => void;
  onUndo: () => void;
}

export function RecordEditor({
  record,
  saving,
  undoAvailable,
  lastBackupPath,
  onSave,
  onUndo,
}: RecordEditorProps) {
  const [draft, setDraft] = useState(record.content);
  const dirty = draft !== record.content;
  const writable = record.metadata.writable;

  useEffect(() => {
    setDraft(record.content);
  }, [record.id, record.content]);

  if (!writable) {
    return (
      <Card className="m-4 border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Content</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-3 pt-4">
          <p className="text-xs text-muted-foreground">
            This record is read-only in Meminspect. Cursor SQLite entries cannot be edited unless
            you opt in via <code className="font-mono">safety.sqliteWrites</code> in{" "}
            <code className="font-mono">~/.meminspect/config.json</code>.
          </p>
          {isRecordEmpty(record) ? (
            <p className="text-sm text-muted-foreground italic">This file is empty.</p>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground/90">
              {record.content}
            </pre>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m-4 border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Edit content</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!undoAvailable || saving}
            onClick={onUndo}
          >
            <RotateCcw className="size-3.5" />
            Undo
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!dirty || saving}
            onClick={() => onSave(draft)}
          >
            <Save className="size-3.5" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-3 pt-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          className={cn(
            "min-h-[320px] w-full resize-y rounded-md border border-input bg-background px-3 py-2",
            "font-mono text-sm leading-relaxed text-foreground/90 shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        />
        {lastBackupPath ? (
          <p className="text-xs text-muted-foreground">
            Last backup: <span className="break-all font-mono">{lastBackupPath}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
