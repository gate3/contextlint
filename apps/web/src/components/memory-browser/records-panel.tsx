import type { ProjectRef } from "@meminspect/core";
import { PanelBody, PanelHeader, PanelShell } from "@/components/panel-shell";
import { RecordFilters } from "@/components/record-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isRecordEmpty,
  isRecordFiltersActive,
  recordDisplayTitle,
  type RecordFiltersState,
} from "@/lib/memory-labels";
import { cn } from "@/lib/utils";
import { Brain, Database, FileText, Search, X } from "lucide-react";
import { RecordMetaBadges } from "./record-meta-badges";
import type { FlatRecord } from "./types";

interface RecordsPanelProps {
  selectedPath: string | null;
  selectedProject: ProjectRef | undefined;
  visibleRecords: FlatRecord[];
  recordsAfterSearch: FlatRecord[];
  selectedRecordId: string | null;
  searchQuery: string;
  recordFilters: RecordFiltersState;
  searchHits: string[] | null;
  isMemorySearchActive: boolean;
  loading: boolean;
  onRecordFiltersChange: (filters: RecordFiltersState) => void;
  onSearchQueryChange: (value: string) => void;
  onRunSearch: () => void;
  onClearMemorySearch: () => void;
  onSelectRecord: (record: FlatRecord) => void;
}

export function RecordsPanel({
  selectedPath,
  selectedProject,
  visibleRecords,
  recordsAfterSearch,
  selectedRecordId,
  searchQuery,
  recordFilters,
  searchHits,
  isMemorySearchActive,
  loading,
  onRecordFiltersChange,
  onSearchQueryChange,
  onRunSearch,
  onClearMemorySearch,
  onSelectRecord,
}: RecordsPanelProps) {
  return (
    <PanelShell className="w-96 shrink-0 border-r">
      <PanelHeader
        title="Memory records"
        description={
          selectedProject
            ? `${visibleRecords.length} of ${recordsAfterSearch.length} · ${selectedProject.name}`
            : "Select a project"
        }
        icon={<Database className="size-4" />}
      >
        <div className="space-y-2">
          <RecordFilters
            filters={recordFilters}
            onChange={onRecordFiltersChange}
            disabled={!selectedPath}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search memory…"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onRunSearch()}
              className="h-9 pl-9"
              disabled={!selectedPath}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="w-full"
              onClick={onRunSearch}
              disabled={!selectedPath || !searchQuery.trim()}
            >
              <Search className="size-4" />
              Search
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={onClearMemorySearch}
              disabled={!selectedPath || !isMemorySearchActive}
            >
              <X className="size-4" />
              Clear
            </Button>
          </div>
        </div>
      </PanelHeader>
      <PanelBody>
        <ScrollArea className="h-full">
          <div className="space-y-1 p-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : !selectedPath ? (
              <div className="px-2 py-8 text-center">
                <Brain className="mx-auto size-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Select a project to browse memory.
                </p>
              </div>
            ) : visibleRecords.length === 0 ? (
              <div className="px-2 py-8 text-center">
                <FileText className="mx-auto size-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchHits !== null
                    ? "No records match your search."
                    : isRecordFiltersActive(recordFilters)
                      ? "No records match your filters."
                      : "No records found."}
                </p>
                {searchHits !== null || isRecordFiltersActive(recordFilters) ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={onClearMemorySearch}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            ) : (
              visibleRecords.map((record) => {
                const active = selectedRecordId === record.id;
                const empty = isRecordEmpty(record);
                return (
                  <button
                    key={`${record.tool}-${record.id}`}
                    type="button"
                    onClick={() => onSelectRecord(record)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-primary/40 bg-accent"
                        : "border-transparent hover:bg-accent/50",
                      empty && "opacity-70",
                    )}
                  >
                    <div className="truncate text-sm font-medium">
                      {recordDisplayTitle(record)}
                    </div>
                    {record.source === "cursor-sqlite-kv" ? (
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {record.title}
                      </p>
                    ) : null}
                    <div className="mt-2">
                      <RecordMetaBadges record={record} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PanelBody>
    </PanelShell>
  );
}
