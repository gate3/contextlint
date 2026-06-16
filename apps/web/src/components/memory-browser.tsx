import { useCallback, useEffect, useMemo, useState } from "react";
import type { MemoryRecord, ProjectRef, ToolId } from "@meminspect/core";
import { PanelBody, PanelHeader, PanelShell } from "@/components/panel-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { appIcon, toolIcon, toolLabel } from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  fetchProjects,
  fetchRecord,
  fetchRecords,
  searchRecords,
} from "@/api";
import {
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

function RecordMetaBadges({ record }: { record: FlatRecord | MemoryRecord }) {
  const ToolIcon = "tool" in record ? toolIcon(record.tool) : FileText;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {"tool" in record ? (
        <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
          <ToolIcon className="size-3" />
          {toolLabel(record.tool)}
        </Badge>
      ) : null}
      <Badge variant="outline" className="text-[10px] font-medium">
        {record.source}
      </Badge>
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
  const [manualPath, setManualPath] = useState("");
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
    setSearchHits(null);
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
      setSearchHits(null);
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

  const visibleRecords = useMemo(() => {
    if (!searchHits) {
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
        <Button variant="outline" size="sm" onClick={() => void loadProjects()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Projects sidebar */}
        <PanelShell className="w-72 shrink-0 border-r">
          <PanelHeader
            title="Projects"
            description={`${projects.length} discovered`}
            icon={<FolderOpen className="size-4" />}
          />
          <PanelBody>
            <ScrollArea className="h-full">
              <div className="space-y-1 p-2">
                {loadingProjects ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))
                ) : projects.length === 0 ? (
                  <div className="px-2 py-8 text-center">
                    <FolderOpen className="mx-auto size-8 text-muted-foreground/60" />
                    <p className="mt-2 text-sm text-muted-foreground">No projects discovered yet.</p>
                  </div>
                ) : (
                  projects.map((project) => {
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
          <div className="shrink-0 space-y-2 border-t border-sidebar-border p-3">
            <p className="text-xs font-medium text-muted-foreground">Open by path</p>
            <div className="flex gap-2">
              <Input
                placeholder="/path/to/project"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualPath.trim()) {
                    void loadProjectRecords(manualPath.trim());
                  }
                }}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0"
                onClick={() => manualPath.trim() && void loadProjectRecords(manualPath.trim())}
              >
                Open
              </Button>
            </div>
          </div>
        </PanelShell>

        {/* Records sidebar */}
        <PanelShell className="w-80 shrink-0 border-r">
          <PanelHeader
            title="Memory records"
            description={selectedProject ? selectedProject.name : "Select a project"}
            icon={<Database className="size-4" />}
          >
            <div className="space-y-2">
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
                  onClick={() => setSearchHits(null)}
                  disabled={!searchHits}
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
                    <p className="mt-2 text-sm text-muted-foreground">No records found.</p>
                  </div>
                ) : (
                  visibleRecords.map((record) => {
                    const active = selectedRecordId === record.id;
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
                        )}
                      >
                        <div className="truncate text-sm font-medium">{record.title}</div>
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

        {/* Record detail */}
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
                      {selectedRecord.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{selectedRecord.source}</Badge>
                      <Badge variant="secondary">{selectedRecord.metadata.scope}</Badge>
                      <Badge variant="outline">{selectedRecord.kind}</Badge>
                    </div>
                    <Tooltip>
                      <TooltipTrigger className="mt-2 block w-full truncate text-left text-xs text-muted-foreground">
                        {selectedRecord.path}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-lg break-all">
                        {selectedRecord.path}
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
                      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground/90">
                        {selectedRecord.content}
                      </pre>
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
                Choose a memory record from the list to inspect rules, learned memories, and SQLite
                entries.
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
