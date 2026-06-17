import { ScanResultsPanel } from "@/components/scan-results";
import { MemoryBrowserHeader } from "./memory-browser-header";
import { ProjectsPanel } from "./projects-panel";
import { RecordDetailPanel } from "./record-detail-panel";
import { RecordsPanel } from "./records-panel";
import type { MemoryBrowserViewProps } from "./types";

export function MemoryBrowserView({
  projects,
  filteredProjects,
  selectedPath,
  selectedProject,
  visibleRecords,
  recordsAfterSearch,
  selectedRecordId,
  selectedRecord,
  searchQuery,
  projectSearch,
  projectSort,
  recordFilters,
  searchHits,
  isMemorySearchActive,
  error,
  loadingProjects,
  loadingRecords,
  loadingRecord,
  scanResult,
  showScanPanel,
  returnToScanPanel,
  scanning,
  onProjectSearchChange,
  onProjectSortChange,
  onSelectProject,
  onRefreshProjects,
  onOpenProjectPath,
  onTryDemo,
  onRunScan,
  onRecordFiltersChange,
  onSearchQueryChange,
  onRunSearch,
  onClearMemorySearch,
  onSelectRecord,
  onSelectFinding,
  onSnoozeFinding,
  onCloseScanPanel,
  onBackToScanResults,
}: MemoryBrowserViewProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <MemoryBrowserHeader
        selectedPath={selectedPath}
        scanning={scanning}
        onTryDemo={onTryDemo}
        onRunScan={onRunScan}
        onOpenProjectPath={onOpenProjectPath}
        onRefreshProjects={onRefreshProjects}
      />

      <div className="flex min-h-0 flex-1">
        <ProjectsPanel
          projects={projects}
          filteredProjects={filteredProjects}
          selectedPath={selectedPath}
          projectSearch={projectSearch}
          projectSort={projectSort}
          loading={loadingProjects}
          onProjectSearchChange={onProjectSearchChange}
          onProjectSortChange={onProjectSortChange}
          onSelectProject={onSelectProject}
        />

        <RecordsPanel
          selectedPath={selectedPath}
          selectedProject={selectedProject}
          visibleRecords={visibleRecords}
          recordsAfterSearch={recordsAfterSearch}
          selectedRecordId={selectedRecordId}
          searchQuery={searchQuery}
          recordFilters={recordFilters}
          searchHits={searchHits}
          isMemorySearchActive={isMemorySearchActive}
          loading={loadingRecords}
          onRecordFiltersChange={onRecordFiltersChange}
          onSearchQueryChange={onSearchQueryChange}
          onRunSearch={onRunSearch}
          onClearMemorySearch={onClearMemorySearch}
          onSelectRecord={onSelectRecord}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          {showScanPanel ? (
            <ScanResultsPanel
              findings={scanResult?.findings ?? []}
              stats={
                scanResult?.stats ?? {
                  findingsVisible: 0,
                  findingsTotal: 0,
                  recordsScanned: 0,
                  rulesRun: 0,
                  snoozed: 0,
                }
              }
              scannedAt={scanResult?.scannedAt ?? new Date().toISOString()}
              loading={scanning}
              onSelectFinding={onSelectFinding}
              onSnooze={onSnoozeFinding}
              onClose={onCloseScanPanel}
            />
          ) : (
            <RecordDetailPanel
              record={selectedRecord}
              loading={loadingRecord}
              returnToScanPanel={returnToScanPanel}
              scanResult={scanResult}
              onBackToScanResults={onBackToScanResults}
            />
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
