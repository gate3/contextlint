import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MemoryRecord, ProjectRef, ScanFinding } from "@meminspect/core";
import {
  EMPTY_RECORD_FILTERS,
  filterProjects,
  filterRecords,
  isRecordFiltersActive,
  type ProjectSort,
  type RecordFiltersState,
  sortProjects,
  sortRecordsForDisplay,
} from "@/lib/memory-labels";
import {
  getScanDemoProject,
  getRecord,
  getSessionPreview,
  getUndoStatus,
  listProjectRecords,
  listProjects,
  runHealthScan,
  searchProjectRecords,
  snoozeFinding,
  undoLastWrite,
  updateRecord,
  type PreviewResponse,
  type ScanResponse,
} from "@/services";
import type { FlatRecord } from "@/components/memory-browser/types";

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function useMemoryBrowser() {
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
  const latestProjectLoadRef = useRef(0);
  const latestRecordLoadRef = useRef(0);
  const latestSearchLoadRef = useRef(0);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [showScanPanel, setShowScanPanel] = useState(false);
  const [returnToScanPanel, setReturnToScanPanel] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResponse | null>(null);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [returnToPreviewPanel, setReturnToPreviewPanel] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [lastBackupPath, setLastBackupPath] = useState<string | null>(null);

  const refreshUndoStatus = useCallback(async () => {
    try {
      const status = await getUndoStatus();
      setUndoAvailable(status.available);
    } catch {
      setUndoAvailable(false);
    }
  }, []);

  useEffect(() => {
    void refreshUndoStatus();
  }, [refreshUndoStatus]);

  const reloadRecordsForProject = useCallback(async (projectPath: string) => {
    const bundles = await listProjectRecords(projectPath);
    const flat = bundles.flatMap((b) => b.records.map((record) => ({ ...record, tool: b.tool })));
    setRecords(flat);
    return flat;
  }, []);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError(toErrorMessage(err, "Failed to load projects"));
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadProjectRecords = useCallback(async (projectPath: string) => {
    const loadId = ++latestProjectLoadRef.current;
    setLoadingRecords(true);
    setError(null);
    setSelectedRecord(null);
    setSelectedRecordId(null);
    setSearchQuery("");
    setSearchHits(null);
    setRecordFilters(EMPTY_RECORD_FILTERS);
    latestSearchLoadRef.current++;
    setScanResult(null);
    setShowScanPanel(false);
    setReturnToScanPanel(false);
    setPreviewResult(null);
    setShowPreviewPanel(false);
    setReturnToPreviewPanel(false);
    try {
      const bundles = await listProjectRecords(projectPath);
      if (loadId !== latestProjectLoadRef.current) {
        return;
      }
      const flat = bundles.flatMap((b) =>
        b.records.map((record) => ({ ...record, tool: b.tool })),
      );
      setRecords(flat);
      setSelectedPath(projectPath);
    } catch (err) {
      if (loadId === latestProjectLoadRef.current) {
        setError(toErrorMessage(err, "Failed to load records"));
      }
    } finally {
      if (loadId === latestProjectLoadRef.current) {
        setLoadingRecords(false);
      }
    }
  }, []);

  const openRecord = useCallback(
    async (record: FlatRecord) => {
      if (!selectedPath) {
        return;
      }
      const loadId = ++latestRecordLoadRef.current;
      setSelectedRecordId(record.id);
      setLoadingRecord(true);
      setError(null);
      setLastBackupPath(null);
      try {
        const full = await getRecord(selectedPath, record.id, record.tool);
        if (loadId !== latestRecordLoadRef.current) {
          return;
        }
        setSelectedRecord(full);
      } catch (err) {
        if (loadId === latestRecordLoadRef.current) {
          setError(toErrorMessage(err, "Failed to load record"));
        }
      } finally {
        if (loadId === latestRecordLoadRef.current) {
          setLoadingRecord(false);
        }
      }
    },
    [selectedPath],
  );

  const runSearch = useCallback(async () => {
    if (!selectedPath || !searchQuery.trim()) {
      return;
    }
    const loadId = ++latestSearchLoadRef.current;
    setError(null);
    try {
      const hits = await searchProjectRecords(selectedPath, searchQuery.trim());
      if (loadId !== latestSearchLoadRef.current) {
        return;
      }
      setSearchHits(hits.map((h) => h.recordId));
    } catch (err) {
      if (loadId !== latestSearchLoadRef.current) {
        return;
      }
      setError(toErrorMessage(err, "Search failed"));
    }
  }, [searchQuery, selectedPath]);

  const clearMemorySearch = useCallback(() => {
    latestSearchLoadRef.current++;
    setSearchQuery("");
    setSearchHits(null);
    setRecordFilters(EMPTY_RECORD_FILTERS);
  }, []);

  const handleTryDemo = useCallback(async () => {
    setError(null);
    try {
      const { path: demoPath } = await getScanDemoProject();
      await loadProjectRecords(demoPath);
      setShowScanPanel(false);
      setShowPreviewPanel(false);
      setScanResult(null);
      setPreviewResult(null);
    } catch (err) {
      setError(toErrorMessage(err, "Demo project not available"));
    }
  }, [loadProjectRecords]);

  const handleRunScan = useCallback(async () => {
    if (!selectedPath) {
      return;
    }
    setScanning(true);
    setError(null);
    setShowPreviewPanel(false);
    setReturnToPreviewPanel(false);
    setShowScanPanel(true);
    try {
      const result = await runHealthScan(selectedPath);
      setScanResult(result);
    } catch (err) {
      setError(toErrorMessage(err, "Scan failed"));
      setShowScanPanel(false);
    } finally {
      setScanning(false);
    }
  }, [selectedPath]);

  const handleRunPreview = useCallback(async () => {
    if (!selectedPath) {
      return;
    }
    setPreviewing(true);
    setError(null);
    setShowScanPanel(false);
    setReturnToScanPanel(false);
    setShowPreviewPanel(true);
    try {
      const result = await getSessionPreview(selectedPath);
      setPreviewResult(result);
    } catch (err) {
      setError(toErrorMessage(err, "Preview failed"));
      setShowPreviewPanel(false);
    } finally {
      setPreviewing(false);
    }
  }, [selectedPath]);

  const handleSnoozeFinding = useCallback(
    async (finding: ScanFinding) => {
      if (!selectedPath || !scanResult) {
        return;
      }
      try {
        await snoozeFinding(selectedPath, finding.id);
        setScanResult({
          ...scanResult,
          findings: scanResult.findings.filter((f) => f.id !== finding.id),
          stats: {
            ...scanResult.stats,
            findingsVisible: scanResult.stats.findingsVisible - 1,
            snoozed: scanResult.stats.snoozed + 1,
          },
        });
      } catch (err) {
        setError(toErrorMessage(err, "Failed to snooze finding"));
      }
    },
    [selectedPath, scanResult],
  );

  const handleSelectPreviewRecord = useCallback(
    (recordId: string) => {
      const record = records.find((r) => r.id === recordId);
      if (!record) {
        return;
      }
      setReturnToPreviewPanel(true);
      setReturnToScanPanel(false);
      setShowPreviewPanel(false);
      void openRecord(record);
    },
    [records, openRecord],
  );

  const handleSelectFinding = useCallback(
    (finding: ScanFinding, from: "scan" | "preview" = "scan") => {
      const recordId = finding.recordIds?.[0];
      if (!recordId) {
        return;
      }
      const record = records.find((r) => r.id === recordId);
      if (record) {
        if (from === "preview") {
          setReturnToPreviewPanel(true);
          setReturnToScanPanel(false);
          setShowPreviewPanel(false);
        } else {
          setReturnToScanPanel(true);
          setReturnToPreviewPanel(false);
          setShowScanPanel(false);
        }
        void openRecord(record);
      }
    },
    [records, openRecord],
  );

  const handleSelectRecord = useCallback(
    (record: FlatRecord) => {
      setReturnToScanPanel(false);
      setReturnToPreviewPanel(false);
      void openRecord(record);
    },
    [openRecord],
  );

  const handleBackToScanResults = useCallback(() => {
    setReturnToScanPanel(false);
    setSelectedRecord(null);
    setSelectedRecordId(null);
    setShowScanPanel(true);
  }, []);

  const handleBackToPreview = useCallback(() => {
    setReturnToPreviewPanel(false);
    setSelectedRecord(null);
    setSelectedRecordId(null);
    setShowPreviewPanel(true);
  }, []);

  const handleCloseScanPanel = useCallback(() => {
    setShowScanPanel(false);
    setReturnToScanPanel(false);
  }, []);

  const handleClosePreviewPanel = useCallback(() => {
    setShowPreviewPanel(false);
    setReturnToPreviewPanel(false);
  }, []);

  const handleSaveRecord = useCallback(
    async (content: string) => {
      if (!selectedPath || !selectedRecordId) {
        return;
      }
      const tool = records.find((record) => record.id === selectedRecordId)?.tool;
      setSavingRecord(true);
      setError(null);
      try {
        const result = await updateRecord(selectedPath, selectedRecordId, content, tool);
        setSelectedRecord(result.record);
        setLastBackupPath(result.backupPath);
        setUndoAvailable(true);
        await reloadRecordsForProject(selectedPath);
      } catch (err) {
        setError(toErrorMessage(err, "Failed to save record"));
      } finally {
        setSavingRecord(false);
      }
    },
    [records, reloadRecordsForProject, selectedPath, selectedRecordId],
  );

  const handleUndoRecord = useCallback(async () => {
    setSavingRecord(true);
    setError(null);
    try {
      await undoLastWrite();
      setUndoAvailable(false);
      setLastBackupPath(null);
      if (selectedPath && selectedRecordId) {
        const tool = records.find((record) => record.id === selectedRecordId)?.tool;
        const full = await getRecord(selectedPath, selectedRecordId, tool);
        setSelectedRecord(full);
        await reloadRecordsForProject(selectedPath);
      }
    } catch (err) {
      setError(toErrorMessage(err, "Failed to undo"));
    } finally {
      setSavingRecord(false);
    }
  }, [records, reloadRecordsForProject, selectedPath, selectedRecordId]);

  const isMemorySearchActive =
    searchQuery.trim().length > 0 ||
    searchHits !== null ||
    isRecordFiltersActive(recordFilters);

  const filteredProjects = useMemo(() => {
    return sortProjects(filterProjects(projects, projectSearch), projectSort);
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

  return {
    projects,
    filteredProjects,
    selectedPath,
    selectedProject,
    records,
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
    savingRecord,
    undoAvailable,
    lastBackupPath,
    scanResult,
    showScanPanel,
    returnToScanPanel,
    scanning,
    previewResult,
    showPreviewPanel,
    returnToPreviewPanel,
    previewing,
    onProjectSearchChange: setProjectSearch,
    onProjectSortChange: setProjectSort,
    onSelectProject: (path: string) => void loadProjectRecords(path),
    onRefreshProjects: () => void loadProjects(),
    onOpenProjectPath: (path: string) => void loadProjectRecords(path),
    onTryDemo: () => void handleTryDemo(),
    onRunScan: () => void handleRunScan(),
    onRunPreview: () => void handleRunPreview(),
    onRecordFiltersChange: setRecordFilters,
    onSearchQueryChange: setSearchQuery,
    onRunSearch: () => void runSearch(),
    onClearMemorySearch: clearMemorySearch,
    onSelectRecord: handleSelectRecord,
    onSelectFinding: (finding: ScanFinding, from?: "scan" | "preview") =>
      handleSelectFinding(finding, from),
    onSelectPreviewRecord: handleSelectPreviewRecord,
    onSnoozeFinding: (finding: ScanFinding) => void handleSnoozeFinding(finding),
    onCloseScanPanel: handleCloseScanPanel,
    onBackToScanResults: handleBackToScanResults,
    onClosePreviewPanel: handleClosePreviewPanel,
    onBackToPreview: handleBackToPreview,
    onSaveRecord: (content: string) => void handleSaveRecord(content),
    onUndoRecord: () => void handleUndoRecord(),
  };
}
