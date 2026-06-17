import type { ProjectRef } from "@meminspect/core";
import { PanelBody, PanelHeader, PanelShell } from "@/components/panel-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toolIcon, toolLabel } from "@/lib/icons";
import type { ProjectSort } from "@/lib/memory-labels";
import { cn } from "@/lib/utils";
import { ArrowDownAZ, FolderOpen, Search } from "lucide-react";
import { PROJECT_SORT_OPTIONS } from "./types";

interface ProjectsPanelProps {
  projects: ProjectRef[];
  filteredProjects: ProjectRef[];
  selectedPath: string | null;
  projectSearch: string;
  projectSort: ProjectSort;
  loading: boolean;
  onProjectSearchChange: (value: string) => void;
  onProjectSortChange: (value: ProjectSort) => void;
  onSelectProject: (path: string) => void;
}

export function ProjectsPanel({
  projects,
  filteredProjects,
  selectedPath,
  projectSearch,
  projectSort,
  loading,
  onProjectSearchChange,
  onProjectSortChange,
  onSelectProject,
}: ProjectsPanelProps) {
  return (
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
              onChange={(e) => onProjectSearchChange(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Select value={projectSort} onValueChange={(value) => onProjectSortChange(value as ProjectSort)}>
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
            {loading ? (
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
                    onClick={() => onSelectProject(project.path)}
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
  );
}
