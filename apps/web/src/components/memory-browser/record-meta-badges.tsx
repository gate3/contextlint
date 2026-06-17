import type { MemoryRecord } from "@meminspect/core";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toolIcon, toolLabel } from "@/lib/icons";
import {
  isRecordEmpty,
  sourceDescription,
  sourceLabel,
} from "@/lib/memory-labels";
import { cn } from "@/lib/utils";
import { FileText, Lock, PenLine } from "lucide-react";
import type { FlatRecord } from "./types";

interface RecordMetaBadgesProps {
  record: FlatRecord | MemoryRecord;
}

export function RecordMetaBadges({ record }: RecordMetaBadgesProps) {
  const ToolIcon = "tool" in record ? toolIcon(record.tool) : FileText;
  const label = sourceLabel(record.source, record);
  const description = sourceDescription(record.source);
  const empty = isRecordEmpty(record);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {"tool" in record ? (
        <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
          <ToolIcon className="size-3" />
          {toolLabel(record.tool)}
        </Badge>
      ) : null}
      {description ? (
        <Tooltip>
          <TooltipTrigger
            className={cn(
              "inline-flex cursor-help items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
            )}
          >
            <Badge variant="outline" className="border-0 p-0 text-[10px] font-medium">
              {label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{description}</TooltipContent>
        </Tooltip>
      ) : (
        <Badge variant="outline" className="text-[10px] font-medium">
          {label}
        </Badge>
      )}
      {empty ? (
        <Badge variant="secondary" className="text-[10px] font-medium text-muted-foreground">
          empty
        </Badge>
      ) : null}
      <Badge
        variant={record.metadata.writable ? "default" : "secondary"}
        className="gap-1 text-[10px] font-medium"
      >
        {record.metadata.writable ? (
          <PenLine className="size-3" />
        ) : (
          <Lock className="size-3" />
        )}
        {record.metadata.writable ? "writable" : "read-only"}
      </Badge>
    </div>
  );
}
