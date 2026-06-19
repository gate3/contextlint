import type { MemoryRecord, ProjectRef, ScanFinding, ToolId } from "@meminspect/core";
import type { ProjectSort, RecordFiltersState } from "@/lib/memory-labels";
import type { ScanResponse } from "@/services/scan-service";
import type { PreviewResponse } from "@/services/preview-service";

export type FlatRecord = MemoryRecord & { tool: ToolId };

export const PROJECT_SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "tools-desc", label: "Most tools first (Cursor + Claude)" },
];

export interface MemoryBrowserViewProps {
  projects: ProjectRef[];
  filteredProjects: ProjectRef[];
  selectedPath: string | null;
  selectedProject: ProjectRef | undefined;
  records: FlatRecord[];
  visibleRecords: FlatRecord[];
  recordsAfterSearch: FlatRecord[];
  selectedRecordId: string | null;
  selectedRecord: MemoryRecord | null;
  searchQuery: string;
  projectSearch: string;
  projectSort: ProjectSort;
  recordFilters: RecordFiltersState;
  searchHits: string[] | null;
  isMemorySearchActive: boolean;
  error: string | null;
  loadingProjects: boolean;
  loadingRecords: boolean;
  loadingRecord: boolean;
  savingRecord: boolean;
  undoAvailable: boolean;
  lastBackupPath: string | null;
  scanResult: ScanResponse | null;
  showScanPanel: boolean;
  returnToScanPanel: boolean;
  scanning: boolean;
  previewResult: PreviewResponse | null;
  showPreviewPanel: boolean;
  returnToPreviewPanel: boolean;
  previewing: boolean;
  onProjectSearchChange: (value: string) => void;
  onProjectSortChange: (value: ProjectSort) => void;
  onSelectProject: (path: string) => void;
  onRefreshProjects: () => void;
  onOpenProjectPath: (path: string) => void;
  onTryDemo: () => void;
  onRunScan: () => void;
  onRunPreview: () => void;
  onRecordFiltersChange: (filters: RecordFiltersState) => void;
  onSearchQueryChange: (value: string) => void;
  onRunSearch: () => void;
  onClearMemorySearch: () => void;
  onSelectRecord: (record: FlatRecord) => void;
  onSelectFinding: (finding: ScanFinding, from?: "scan" | "preview") => void;
  onSelectPreviewRecord: (recordId: string) => void;
  onSnoozeFinding: (finding: ScanFinding) => void;
  onCloseScanPanel: () => void;
  onBackToScanResults: () => void;
  onClosePreviewPanel: () => void;
  onBackToPreview: () => void;
  onSaveRecord: (content: string) => void;
  onUndoRecord: () => void;
}
