import { useCallback, useEffect, useMemo, useState } from "react";
import type { MemoryRecord, ProjectRef, ToolId } from "@meminspect/core";
import { OpenPathDialog } from "@/components/open-path-dialog";
import { PanelBody, PanelHeader, PanelShell } from "@/components/panel-shell";
import { RecordFilters } from "@/components/record-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { appIcon, toolIcon, toolLabel } from "@/lib/icons";
import {
  EMPTY_RECORD_FILTERS,
  filterProjects,
  filterRecords,
  isRecordEmpty,
  isRecordFiltersActive,
  type ProjectSort,
  type RecordFiltersState,
  recordDisplayTitle,
  sortProjects,
  sortRecordsForDisplay,
  sourceDescription,
  sourceLabel,
} from "@/lib/memory-labels";
import { cn } from "@/lib/utils";
import {
  fetchProjects,
  fetchRecord,
  fetchRecords,
  searchRecords,
} from "@/api";
import {
  ArrowDownAZ,
  Brain,
  Database,
  FileText,
  FolderOpen,
  Lock,
  PenLine,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

type FlatRecord = MemoryRecord & { tool: ToolId };

const AppIcon = appIcon();

const PROJECT_SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "tools-desc", label: "Most tools first (Cursor + Claude)" },
];

function RecordMetaBadges({ record }: { record: FlatRecord | MemoryRecord }) {
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

export function MemoryBrowser() {
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [records, setRecords] = useState<FlatRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MemoryRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<string[] | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectSort, setProjectSort] = useState<ProjectSort>("name-asc");
  const [recordFilters, setRecordFilters] = useState<RecordFiltersState>(EMPTY_RECORD_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      const { projects: discovered } = await fetchProjects();
      setProjects(discovered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadProjectRecords = useCallback(async (projectPath: string) => {
    setLoadingRecords(true);
    setError(null);
    setSelectedRecord(null);
    setSelectedRecordId(null);
    setSearchQuery("");
    setSearchHits(null);
    setRecordFilters(EMPTY_RECORD_FILTERS);
    try {
      const { bundles } = await fetchRecords(projectPath);
      const flat = bundles.flatMap((b) =>
        b.records.map((record) => ({ ...record, tool: b.tool })),
      );
      setRecords(flat);
      setSelectedPath(projectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  const openRecord = useCallback(
    async (record: FlatRecord) => {
      if (!selectedPath) {
        return;
      }
      setSelectedRecordId(record.id);
      setLoadingRecord(true);
      setError(null);
      try {
        const { record: full } = await fetchRecord(selectedPath, record.id, record.tool);
        setSelectedRecord(full);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load record");
      } finally {
        setLoadingRecord(false);
      }
    },
    [selectedPath],
  );

  const runSearch = useCallback(async () => {
    if (!selectedPath || !searchQuery.trim()) {
      return;
    }
    setError(null);
    try {
      const { hits } = await searchRecords(selectedPath, searchQuery.trim());
      setSearchHits(hits.map((h) => h.recordId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  }, [searchQuery, selectedPath]);

  const clearMemorySearch = useCallback(() => {
    setSearchQuery("");
    setSearchHits(null);
    setRecordFilters(EMPTY_RECORD_FILTERS);
  }, []);

  const isMemorySearchActive =
    searchQuery.trim().length > 0 ||
    searchHits !== null ||
    isRecordFiltersActive(recordFilters);

  const filteredProjects = useMemo((): ProjectRef[] => {
    const filtered = filterProjects(projects, projectSearch);
    return sortProjects(filtered, projectSort);
  }, [projects, projectSearch, projectSort]);

  const visibleRecords = useMemo(() => {
    let list = records;
    if (searchHits !== null) {
      const hitSet = new Set(searchHits);
      list = records.filter((r) => hitSet.has(r.id));
    }
    list = filterRecords(list, recordFilters);
    return sortRecordsForDisplay(list);
  }, [records, searchHits, recordFilters]);

  const recordsAfterSearch = useMemo(() => {
    if (searchHits === null) {
      return records;
    }
    const hitSet = new Set(searchHits);
    return records.filter((r) => hitSet.has(r.id));
  }, [records, searchHits]);

  const selectedProject = projects.find((p) => p.path === selectedPath);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/40 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <AppIcon className="size-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none tracking-tight">Meminspect</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Inspect agent memory for Cursor and Claude Code
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OpenPathDialog onOpen={(p) => void loadProjectRecords(p)} />
          <Button variant="outline" size="sm" onClick={() => void loadProjects()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <PanelShell className="w-72 shrink-0 border-r">
          <PanelHeader
            title="Projects"
            description={`${filteredProjects.length} of ${projects.length}`}
            icon={<FolderOpen className="size-4" />}
          >
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Filter projects…"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
              <Select
                value={projectSort}
                onValueChange={(value) => setProjectSort(value as ProjectSort)}
              >
                <SelectTrigger size="sm" className="w-full">
                  <ArrowDownAZ className="size-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PanelHeader>
          <PanelBody>
            <ScrollArea className="h-full">
              <div className="space-y-1 p-2">
                {loadingProjects ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))
                ) : filteredProjects.length === 0 ? (
                  <div className="px-2 py-8 text-center">
                    <FolderOpen className="mx-auto size-8 text-muted-foreground/60" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {projects.length === 0
                        ? "No projects discovered yet."
                        : "No projects match your filter."}
                    </p>
                  </div>
                ) : (
                  filteredProjects.map((project) => {
                    const active = selectedPath === project.path;
                    return (
                      <button
                        key={project.path}
                        type="button"
                        onClick={() => void loadProjectRecords(project.path)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                          active
                            ? "border-sidebar-primary/40 bg-sidebar-accent"
                            : "border-transparent hover:bg-sidebar-accent/60",
                        )}
                      >
                        <div className="truncate text-sm font-medium">{project.name}</div>
                        <Tooltip>
                          <TooltipTrigger className="mt-1 block w-full truncate text-left text-xs text-muted-foreground">
                            {project.path}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-sm break-all">
                            {project.path}
                          </TooltipContent>
                        </Tooltip>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {project.tools.map((tool) => {
                            const Icon = toolIcon(tool);
                            return (
                              <Badge key={tool} variant="outline" className="gap-1 text-[10px]">
                                <Icon className="size-3" />
                                {toolLabel(tool)}
                              </Badge>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </PanelBody>
        </PanelShell>

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
                onChange={setRecordFilters}
                disabled={!selectedPath}
              />
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search memory…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void runSearch()}
                  className="h-9 pl-9"
                  disabled={!selectedPath}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => void runSearch()}
                  disabled={!selectedPath || !searchQuery.trim()}
                >
                  <Search className="size-4" />
                  Search
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={clearMemorySearch}
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
                {loadingRecords ? (
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
                        onClick={clearMemorySearch}
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
                        onClick={() => void openRecord(record)}
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

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          {loadingRecord ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : selectedRecord ? (
            <>
              <div className="shrink-0 border-b border-border px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold tracking-tight">
                      {recordDisplayTitle(selectedRecord)}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline">
                        {sourceLabel(selectedRecord.source, selectedRecord)}
                      </Badge>
                      <Badge variant="secondary">{selectedRecord.metadata.scope}</Badge>
                      {isRecordEmpty(selectedRecord) ? (
                        <Badge variant="secondary">empty</Badge>
                      ) : null}
                    </div>
                    {selectedRecord.source === "cursor-sqlite-kv" ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {sourceDescription("cursor-sqlite-kv")}
                      </p>
                    ) : null}
                    <Tooltip>
                      <TooltipTrigger className="mt-2 block w-full truncate text-left font-mono text-xs text-muted-foreground">
                        {selectedRecord.path}
                        {selectedRecord.kind === "sqlite-kv"
                          ? ` · key: ${selectedRecord.title}`
                          : ""}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-lg break-all">
                        {selectedRecord.path}
                        {selectedRecord.kind === "sqlite-kv"
                          ? `\nKey: ${selectedRecord.title}`
                          : ""}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <PanelBody className="bg-muted/20">
                <ScrollArea className="h-full">
                  <Card className="m-4 border-border/60 bg-card/80 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Content
                      </CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-4">
                      {isRecordEmpty(selectedRecord) ? (
                        <p className="text-sm text-muted-foreground italic">This file is empty.</p>
                      ) : (
                        <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground/90">
                          {selectedRecord.content}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                </ScrollArea>
              </PanelBody>
            </>
          ) : (
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
          )}
        </main>
      </div>

      {error ? (
        <div className="shrink-0 border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
