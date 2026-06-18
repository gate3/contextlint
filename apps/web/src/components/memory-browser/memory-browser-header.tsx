import { OpenPathDialog } from "@/components/open-path-dialog";
import { Button } from "@/components/ui/button";
import { appIcon } from "@/lib/icons";
import { FlaskConical, Layers, RefreshCw, ShieldCheck } from "lucide-react";

const AppIcon = appIcon();

interface MemoryBrowserHeaderProps {
  selectedPath: string | null;
  scanning: boolean;
  previewing: boolean;
  onTryDemo: () => void;
  onRunScan: () => void;
  onRunPreview: () => void;
  onOpenProjectPath: (path: string) => void;
  onRefreshProjects: () => void;
}

export function MemoryBrowserHeader({
  selectedPath,
  scanning,
  previewing,
  onTryDemo,
  onRunScan,
  onRunPreview,
  onOpenProjectPath,
  onRefreshProjects,
}: MemoryBrowserHeaderProps) {
  return (
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
        <Button variant="outline" size="sm" onClick={onTryDemo}>
          <FlaskConical className="size-4" />
          Try demo
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedPath || previewing}
          onClick={onRunPreview}
        >
          <Layers className="size-4" />
          {previewing ? "Loading…" : "Session Load"}
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={!selectedPath || scanning}
          onClick={onRunScan}
        >
          <ShieldCheck className="size-4" />
          {scanning ? "Scanning…" : "Health Scan"}
        </Button>
        <OpenPathDialog onOpen={onOpenProjectPath} />
        <Button variant="outline" size="sm" onClick={onRefreshProjects}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>
    </header>
  );
}
