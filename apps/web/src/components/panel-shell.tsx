import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelShellProps {
  className?: string;
  children: ReactNode;
}

export function PanelShell({ className, children }: PanelShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col border-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface PanelHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}

export function PanelHeader({ title, description, icon, action, children }: PanelHeaderProps) {
  return (
    <div className="shrink-0 space-y-3 border-b border-sidebar-border px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {icon ? (
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

interface PanelBodyProps {
  children: ReactNode;
  className?: string;
}

export function PanelBody({ children, className }: PanelBodyProps) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-hidden", className)}>
      {children}
    </div>
  );
}
