import { useState, type ReactNode } from "react";
import type { RecordAccessFilter, RecordFiltersState, RecordTypeFilter } from "@/lib/memory-labels";
import {
  EMPTY_RECORD_FILTERS,
  isRecordFiltersActive,
  RECORD_ACCESS_LABELS,
  RECORD_TYPE_LABELS,
  toggleFilterValue,
} from "@/lib/memory-labels";
import { toolLabel } from "@/lib/icons";
import type { ToolId } from "@meminspect/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, Filter, X } from "lucide-react";

interface RecordFiltersProps {
  filters: RecordFiltersState;
  onChange: (filters: RecordFiltersState) => void;
  disabled?: boolean;
}

function FilterChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn("h-7 shrink-0 px-2 text-xs")}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const PLATFORMS: ToolId[] = ["cursor", "claude-code"];
const TYPES: RecordTypeFilter[] = [
  "rule",
  "learned",
  "instructions",
  "auto-memory",
  "db-entry",
  "config",
];
const ACCESS: RecordAccessFilter[] = ["read-only", "writable"];

export function RecordFilters({ filters, onChange, disabled }: RecordFiltersProps) {
  const [open, setOpen] = useState(false);
  const active = isRecordFiltersActive(filters);
  const activeCount =
    filters.platforms.length + filters.types.length + filters.access.length;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30">
      <div className="flex h-8 items-center gap-0.5 pr-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 min-w-0 flex-1 justify-between px-2.5 text-xs font-medium"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Filter className="size-3.5 shrink-0" />
            Filters
            <Badge
              variant="secondary"
              className={cn("h-4 min-w-4 px-1 text-[10px]", !active && "invisible")}
            >
              {activeCount || 0}
            </Badge>
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 shrink-0 px-1.5 text-xs",
            !active && "pointer-events-none invisible",
          )}
          disabled={disabled || !active}
          onClick={() => onChange(EMPTY_RECORD_FILTERS)}
        >
          <X className="size-3" />
          Reset
        </Button>
      </div>

      {open ? (
        <div className="space-y-2.5 border-t border-border/60 p-2.5 pt-2">
          <FilterGroup label="Platform">
            {PLATFORMS.map((platform) => (
              <FilterChip
                key={platform}
                active={filters.platforms.includes(platform)}
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...filters,
                    platforms: toggleFilterValue(filters.platforms, platform),
                  })
                }
              >
                {toolLabel(platform)}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup label="Type">
            {TYPES.map((type) => (
              <FilterChip
                key={type}
                active={filters.types.includes(type)}
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...filters,
                    types: toggleFilterValue(filters.types, type),
                  })
                }
              >
                {RECORD_TYPE_LABELS[type]}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup label="Access">
            {ACCESS.map((access) => (
              <FilterChip
                key={access}
                active={filters.access.includes(access)}
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...filters,
                    access: toggleFilterValue(filters.access, access),
                  })
                }
              >
                {RECORD_ACCESS_LABELS[access]}
              </FilterChip>
            ))}
          </FilterGroup>
        </div>
      ) : null}
    </div>
  );
}
